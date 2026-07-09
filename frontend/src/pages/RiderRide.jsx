import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import colleges from '../data/solapurColleges';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const messages = [
  'Finding students heading your way...',
  'Checking who needs a ride...',
  'Matching with nearby students...',
  'Almost there, hold tight...',
  'Connecting you with passengers...',
];

const FARE = 30;

function getTileUrl(lat, lng, zoom = 14) {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

const STORAGE_KEY = 'ur_rider_ride';

export default function RiderRide() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(() => {
    try { const s = sessionStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); if (p.step) { if (p.step === 'waiting' || p.step === 'found' || p.step === 'confirmed') return 'searching'; return p.step; } } } catch {}
    return 'pick';
  });
  const [selectedCollege, setSelectedCollege] = useState(() => {
    try { const s = sessionStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); if (p.selectedCollege) return p.selectedCollege; } } catch {}
    return null;
  });
  const [showCollegeSearch, setShowCollegeSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [waitingPassengers, setWaitingPassengers] = useState(() => {
    try { const s = sessionStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); if (p.waitingPassengers) return p.waitingPassengers; } } catch {}
    return [];
  });
  const [msgIndex, setMsgIndex] = useState(0);
  const [rideId, setRideId] = useState(() => {
    try { const s = sessionStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); if (p.rideId) return p.rideId; } } catch {}
    return null;
  });
  const [acceptedPassenger, setAcceptedPassenger] = useState(() => {
    try { const s = sessionStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); if (p.acceptedPassenger) return p.acceptedPassenger; } } catch {}
    return null;
  });
  const [otp, setOtp] = useState(() => {
    try { const s = sessionStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); if (p.otp) return p.otp; } } catch {}
    return null;
  });

  // Persist state
  useEffect(() => {
    if (step !== 'pick') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        step, selectedCollege, rideId, waitingPassengers, acceptedPassenger, otp,
      }));
    }
  }, [step, selectedCollege, rideId, waitingPassengers, acceptedPassenger, otp]);

  function clearPersistedState() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  const searchResults = query.trim()
    ? colleges.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.short.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  // Poll for waiting passengers — only after rider clicks "Find Riders"
  useEffect(() => {
    if (step !== 'searching' || !selectedCollege) return;

    const poll = async () => {
      try {
        const res = await fetch(`${API}/rides/waiting-passengers?collegeId=${selectedCollege.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setWaitingPassengers(data.passengers);
        }
      } catch {}
    };

    poll();
    const timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  }, [step, selectedCollege, token]);

  // Message rotation while searching
  useEffect(() => {
    if (step !== 'searching') return;
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [step]);

  // After accepting, send live location
  useEffect(() => {
    if (!rideId || !otp) return;
    const sendLoc = async () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await fetch(`${API}/rides/${rideId}/location`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            });
          } catch {}
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };
    sendLoc();
    const timer = setInterval(sendLoc, 5000);
    return () => clearInterval(timer);
  }, [rideId, otp, token]);

  async function handleFindRiders() {
    if (!selectedCollege) return;
    setStep('searching');
    setWaitingPassengers([]);
  }

  async function handleConfirmRide(requestId, passengerData) {
    try {
      const res = await fetch(`${API}/rides/accept-request/${requestId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRideId(data.ride._id);
        setAcceptedPassenger(passengerData);
        setOtp(data.otp);
      }
    } catch {}
  }

  async function handleDone() {
    if (rideId) {
      try { await fetch(`${API}/rides/${rideId}/deactivate`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }); } catch {}
    }
    clearPersistedState();
    setStep('pick');
    setSelectedCollege(null);
    setRideId(null);
    setAcceptedPassenger(null);
    setOtp(null);
    setShowCollegeSearch(false);
    setQuery('');
    setWaitingPassengers([]);
  }

  const destPos = selectedCollege ? [selectedCollege.lat, selectedCollege.lng] : null;

  return (
    <div className="pb-20 relative">
      {step === 'pick' && (
        <div className="pb-20 relative">
          <div className="relative w-full overflow-hidden bg-gray-100" style={{ height: '75vh' }}>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #dcfce7 30%, #bbf7d0 60%, #86efac 100%)' }} />
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(90deg, #166534 1px, transparent 1px), linear-gradient(0deg, #166534 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `linear-gradient(35deg, #166534 1.5px, transparent 1.5px), linear-gradient(-35deg, #166534 1.5px, transparent 1.5px)`, backgroundSize: '120px 120px' }} />
            <div className="absolute w-32 h-20 rounded-full bg-green-300/25 right-[15%] top-[20%]" />
            <div className="absolute w-40 h-28 rounded-[40%] bg-blue-300/25 left-[5%] top-[10%]" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>

          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="bg-white rounded-2xl shadow-md border border-border overflow-hidden">
              <button
                onClick={() => setShowCollegeSearch(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5"
              >
                <div className="w-8 h-8 rounded-full bg-success-50 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  {selectedCollege ? (
                    <div>
                      <p className="text-sm font-medium text-text">{selectedCollege.short}</p>
                      <p className="text-xs text-gray-500 truncate">{selectedCollege.name}</p>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">Where are you heading?</span>
                  )}
                </div>
                {selectedCollege && (
                  <button onClick={(e) => { e.stopPropagation(); setSelectedCollege(null); }} className="text-gray-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                )}
              </button>
            </div>
          </div>

          {showCollegeSearch && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-20 left-4 right-4 z-20 bg-white rounded-2xl shadow-md border border-border overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                <button onClick={() => { setShowCollegeSearch(false); setQuery(''); }} className="text-gray-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search colleges..." className="flex-1 text-sm text-text placeholder-gray-400 bg-transparent outline-none" autoFocus />
              </div>
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto">
                  {searchResults.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCollege(c); setShowCollegeSearch(false); setQuery(''); }}
                      className="w-full text-left px-3 py-2.5 hover:bg-primary-50 transition-colors flex items-center gap-2.5"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#292928" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text">{c.short}</p>
                        <p className="text-xs text-gray-400 truncate">{c.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {selectedCollege && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-8 left-4 right-4 z-10"
            >
              <button onClick={handleFindRiders} className="w-full bg-primary text-text font-bold rounded-2xl py-4 flex items-center justify-center gap-2 shadow-lg shadow-primary/30 text-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                Find Riders
              </button>
            </motion.div>
          )}
        </div>
      )}

      {(step === 'searching' || otp) && selectedCollege && (
        <>
          <div className="relative w-full overflow-hidden bg-gray-100" style={{ height: '60vh' }}>
            {destPos && (
              <img src={getTileUrl(destPos[0], destPos[1], 14)} alt="" className="absolute inset-0 w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
            )}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(0deg, rgba(0,0,0,0.5) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
            </div>

            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5]" viewBox="0 0 400 400" preserveAspectRatio="none">
              <path d="M40 340 Q200 280 360 60" stroke="#c3f832" strokeWidth="3" fill="none" strokeDasharray="10 8" opacity="0.7" />
              <path d="M40 340 Q200 280 360 60" stroke="#22C55E" strokeWidth="3" fill="none" strokeDasharray="10 8" opacity="0.7" transform="translate(0, 4)" />
              <circle cx="40" cy="340" r="8" fill="#c3f832" stroke="#292928" strokeWidth="2" />
              <circle cx="360" cy="60" r="8" fill="#22C55E" stroke="#292928" strokeWidth="2" />
              <circle cx="40" cy="340" r="14" fill="none" stroke="#c3f832" strokeWidth="2" opacity="0.5">
                <animate attributeName="r" values="14;26;14" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="360" cy="60" r="14" fill="none" stroke="#22C55E" strokeWidth="2" opacity="0.5">
                <animate attributeName="r" values="14;26;14" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite" />
              </circle>
            </svg>

            <div className="absolute z-[6]" style={{ left: '20%', top: '72%' }}>
              <motion.div animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} className="w-2.5 h-2.5 rounded-full bg-primary" />
            </div>
            <div className="absolute z-[6]" style={{ left: '50%', top: '52%' }}>
              <motion.div animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} className="w-2 h-2 rounded-full bg-green-400" />
            </div>
            <div className="absolute z-[6]" style={{ left: '75%', top: '32%' }}>
              <motion.div animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 1 }} className="w-2 h-2 rounded-full bg-green-400" />
            </div>

            <div className="absolute z-[6]" style={{ left: '86%', top: '10%' }}>
              <svg width="32" height="32" viewBox="0 0 200 200" fill="none">
                <rect x="25" y="75" width="150" height="105" rx="3" stroke="#22C55E" strokeWidth="3" fill="rgba(34,197,94,0.1)" />
                <polygon points="100,15 15,75 185,75" stroke="#22C55E" strokeWidth="3" fill="none" />
                <rect x="40" y="75" width="6" height="105" stroke="#22C55E" strokeWidth="1.5" />
                <rect x="65" y="75" width="6" height="105" stroke="#22C55E" strokeWidth="1.5" />
                <rect x="95" y="75" width="10" height="105" stroke="#22C55E" strokeWidth="1.5" />
                <rect x="129" y="75" width="6" height="105" stroke="#22C55E" strokeWidth="1.5" />
                <rect x="154" y="75" width="6" height="105" stroke="#22C55E" strokeWidth="1.5" />
                <rect x="88" y="130" width="24" height="50" rx="2" stroke="#22C55E" strokeWidth="1.5" fill="rgba(34,197,94,0.1)" />
                <rect x="46" y="90" width="12" height="16" rx="1.5" stroke="#22C55E" strokeWidth="1.5" />
                <rect x="69" y="90" width="12" height="16" rx="1.5" stroke="#22C55E" strokeWidth="1.5" />
                <rect x="119" y="90" width="12" height="16" rx="1.5" stroke="#22C55E" strokeWidth="1.5" />
                <rect x="142" y="90" width="12" height="16" rx="1.5" stroke="#22C55E" strokeWidth="1.5" />
              </svg>
            </div>

            <motion.div
              className="absolute z-10 pointer-events-none"
              style={{ left: '10%', top: '80%' }}
              animate={{ left: ['10%', '85%'], top: ['80%', '10%'] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
            >
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/60 border-2 border-white">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#292928" strokeWidth="2.5"><circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" /><path d="M10 17h4l3-7-4-2-3 4h-4" /><line x1="6" y1="11" x2="10" y2="11" /></svg>
              </div>
              <motion.div className="absolute -bottom-1 -right-1 w-16 h-16 rounded-full bg-primary/20 -z-10" animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
            </motion.div>

            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
          </div>

          <div className="px-4 -mt-8 relative z-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-border shadow-sm p-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <div className="w-0.5 h-6 bg-gray-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">Your Location</p>
                  <p className="text-sm text-gray-500 truncate">{selectedCollege.short}</p>
                </div>
              </div>

              {step === 'searching' && waitingPassengers.length === 0 && (
                <>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <motion.span key={msgIndex} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-sm text-gray-500">{messages[msgIndex]}</motion.span>
                    <span className="flex gap-0.5">
                      {[0, 1, 2].map(i => (<motion.span key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} className="w-1.5 h-1.5 rounded-full bg-primary" />))}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                    <motion.div animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} className="w-1/2 h-full rounded-full bg-primary" />
                  </div>
                  <button onClick={handleDone} className="w-full py-3 rounded-xl border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors">
                    Cancel
                  </button>
                </>
              )}

              {step === 'searching' && waitingPassengers.length > 0 && !otp && (
                <div className="space-y-3">
                  {waitingPassengers.map(req => (
                    <div key={req._id} className="bg-green-50 rounded-xl p-4 border border-green-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-text font-bold text-lg">
                          {req.passenger.name?.[0] || '?'}
                        </div>
                        <div className="flex-1">
                          <p className="text-base font-semibold text-text">{req.passenger.name || 'Student'}</p>
                          <p className="text-xs text-gray-500">{req.pickup.address}</p>
                          <p className="text-sm text-green-700 font-medium mt-0.5">₹{FARE} fare</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleConfirmRide(req._id, req.passenger)}
                        className="w-full py-3 rounded-xl bg-primary text-text font-semibold text-sm hover:bg-primary-400 transition-colors"
                      >
                        Confirm Ride
                      </button>
                    </div>
                  ))}
                  <button onClick={handleDone} className="w-full py-3 rounded-xl border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors">
                    Cancel
                  </button>
                </div>
              )}

              {otp && acceptedPassenger && (
                <div className="bg-primary-50 rounded-xl p-4 border border-primary text-center">
                  <div className="w-16 h-16 rounded-full bg-primary mx-auto mb-3 flex items-center justify-center text-text font-bold text-xl">
                    {acceptedPassenger.name?.[0] || '?'}
                  </div>
                  <p className="text-base font-bold text-text mb-1">{acceptedPassenger.name || 'Student'}</p>
                  <p className="text-3xl font-bold text-primary mt-2 tracking-widest">{otp || '----'}</p>
                  <p className="text-xs text-gray-500 mt-1">Share this OTP with the passenger to verify</p>
                  <button onClick={handleDone} className="mt-4 py-2.5 px-6 rounded-xl bg-primary text-text font-semibold text-sm">
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
