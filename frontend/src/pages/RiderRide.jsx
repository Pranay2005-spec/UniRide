import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { customIcons } from '../lib/customIcons';
import colleges from '../data/solapurColleges';

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

function FlyToMarker({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 14, { duration: 1 });
    }
  }, [position, map]);
  return null;
}

export default function RiderRide() {
  const { token, user } = useAuth();
  const { emit, on, connected } = useSocket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(() => {
    try { const s = sessionStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); if (p.rideId && p.otp) return 'confirmed'; } } catch {}
    return 'pick';
  });
  const [selectedCollege, setSelectedCollege] = useState(() => {
    try { const s = sessionStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); if (p.rideId && p.otp && p.selectedCollege) return p.selectedCollege; } } catch {}
    const id = searchParams.get('college');
    if (id) return colleges.find(c => c.id === id) || null;
    return null;
  });
  const [showCollegeSearch, setShowCollegeSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [waitingPassengers, setWaitingPassengers] = useState([]);
  const [msgIndex, setMsgIndex] = useState(0);
  const [rideId, setRideId] = useState(() => {
    try { const s = sessionStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); if (p.rideId) return p.rideId; } } catch {}
    return null;
  });
  const [acceptedPassenger, setAcceptedPassenger] = useState(() => {
    try { const s = sessionStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); if (p.rideId && p.otp && p.acceptedPassenger) return p.acceptedPassenger; } } catch {}
    return null;
  });
  const [otp, setOtp] = useState(() => {
    try { const s = sessionStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); if (p.otp) return p.otp; } } catch {}
    return null;
  });
  const [rideDetails, setRideDetails] = useState(() => {
    try { const s = sessionStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); if (p.rideDetails) return p.rideDetails; } } catch {}
    return null;
  });
  const [pickupPos, setPickupPos] = useState(() => {
    try { const s = sessionStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); if (p.pickupPos) return p.pickupPos; } } catch {}
    return null;
  });
  const [verifyMsg, setVerifyMsg] = useState('');
  const riderPosRef = useRef(null);

  // Persist active ride state across page refreshes
  useEffect(() => {
    if (rideId && otp) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        step: 'confirmed', selectedCollege, rideId, acceptedPassenger, otp, rideDetails, pickupPos,
      }));
    } else if (step === 'pick') {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [step, selectedCollege, rideId, acceptedPassenger, otp, rideDetails, pickupPos]);

  function calcDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // After accepting, listen for passenger location via socket
  useEffect(() => {
    if (!rideId || !connected) return;

    emit('joinRideRoom', rideId);

    const unsubPassLoc = on('passengerLocation', (data) => {
      setRideDetails(prev => {
        if (!prev) return prev;
        const passengers = [...(prev.passengers || [])];
        const idx = passengers.findIndex(p => (p.user?._id || p.user) === data.userId);
        if (idx >= 0) {
          passengers[idx] = { ...passengers[idx], location: { lat: data.lat, lng: data.lng } };
        }
        return { ...prev, passengers };
      });
    });

    return () => {
      unsubPassLoc();
    };
  }, [rideId, connected]);

  function clearPersistedState() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  const searchResults = query.trim()
    ? colleges.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.short.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  // Listen for waiting passengers via socket — show only 1 closest at a time
  useEffect(() => {
    if (step !== 'searching' || !selectedCollege || !connected) return;

    emit('findRiders', { collegeId: selectedCollege.id });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        riderPosRef.current = { lat, lng };
        emit('findRiders', { collegeId: selectedCollege.id, riderLat: lat, riderLng: lng });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000 }
    );

    const unsubWaiting = on('waitingPassengers', (requests) => {
      setWaitingPassengers(requests);
    });

    const unsubNew = on('newPassenger', (request) => {
      setWaitingPassengers(prev => {
        if (prev.some(p => p._id === request._id)) return prev;
        const newReq = { ...request };
        const pos = riderPosRef.current;
        if (pos && request.pickup?.position) {
          newReq.distance = Math.round(calcDistance(pos.lat, pos.lng, request.pickup.position[0], request.pickup.position[1]));
        }
        const updated = [...prev, newReq];
        updated.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        return updated;
      });
    });

    const unsubCancelled = on('passengerCancelled', (data) => {
      setWaitingPassengers(prev => prev.filter(p => p._id !== data.requestId));
    });

    const unsubAccepted = on('passengerAccepted', (data) => {
      setWaitingPassengers(prev => prev.filter(p => p._id !== data.requestId));
    });

    return () => {
      unsubWaiting();
      unsubNew();
      unsubCancelled();
      unsubAccepted();
      emit('stopFindRiders', selectedCollege.id);
    };
  }, [step, selectedCollege, connected]);

  // Message rotation while searching
  useEffect(() => {
    if (step !== 'searching') return;
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [step]);

  const [riderPos, setRiderPos] = useState(null);

  // After accepting, send live location via socket
  useEffect(() => {
    if (!rideId || !otp || !connected) return;
    if (!navigator.geolocation) return;

    const onPosition = (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setRiderPos({ lat, lng });
      emit('updateLocation', { rideId, lat, lng });
    };

    const onError = () => {};

    const watcher = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true, timeout: 10000, maximumAge: 3000,
    });

    return () => navigator.geolocation.clearWatch(watcher);
  }, [rideId, otp, connected]);

  async function handleFindRiders() {
    if (!selectedCollege) return;
    setStep('searching');
    setWaitingPassengers([]);
  }

  function handleConfirmRide(requestId, passengerData, passengerPickup) {
    setVerifyMsg('');
    let cleanup = () => {};
    const unsubError = on('error', (data) => {
      setVerifyMsg(data.message || 'Failed to accept request');
      cleanup();
    });
    const unsubAccepted = on('requestAccepted', (data) => {
      setRideId(data.ride._id);
      setAcceptedPassenger(passengerData);
      setOtp(data.otp);
      setRideDetails(data.ride);
      setStep('confirmed');
      const pickup = data.pickup || passengerPickup;
      if (pickup?.position) {
        setPickupPos(pickup.position);
      }
      cleanup();
    });
    cleanup = () => { unsubError(); unsubAccepted(); };
    emit('acceptRequest', requestId);
  }

  async function handleVerifyOtp() {
    if (!rideId || !acceptedPassenger) return;
    const otpInput = prompt('Enter the OTP shown by the passenger:');
    if (!otpInput) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/rides/${rideId}/verify-passenger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ passengerId: acceptedPassenger._id, otp: otpInput }),
      });
      const data = await res.json();
      if (data.success) {
        setVerifyMsg('Passenger verified successfully!');
      } else {
        setVerifyMsg(data.error || 'Verification failed');
      }
    } catch {
      setVerifyMsg('Network error');
    }
  }

  function handleDone() {
    if (step === 'searching' && selectedCollege) {
      emit('stopFindRiders', selectedCollege.id);
    }
    if (rideId) {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/rides/${rideId}/deactivate`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
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
    setRideDetails(null);
    setPickupPos(null);
    setVerifyMsg('');
    setRiderPos(null);
  }

  const destPos = selectedCollege ? [selectedCollege.lat, selectedCollege.lng] : null;
  const isVerified = rideDetails?.passengers?.find(p => {
    const pid = p.user?._id || p.user;
    return pid === acceptedPassenger?._id;
  })?.verified;
  const passengerLoc = rideDetails?.passengers?.[0]?.location;

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

      {step !== 'pick' && selectedCollege && (
        <>
          {otp ? (
            <div className="relative w-full overflow-hidden bg-gray-100" style={{ height: '50vh' }}>
              <MapContainer center={[riderPos?.lat || destPos[0], riderPos?.lng || destPos[1]]} zoom={14} className="absolute inset-0 w-full h-full z-0" zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FlyToMarker position={passengerLoc?.lat ? [passengerLoc.lat, passengerLoc.lng] : (pickupPos ? [pickupPos[0], pickupPos[1]] : null)} />
                {riderPos && <Marker position={[riderPos.lat, riderPos.lng]} icon={customIcons.riderIcon} />}
                {passengerLoc?.lat ? (
                  <Marker position={[passengerLoc.lat, passengerLoc.lng]} icon={customIcons.passengerIcon} />
                ) : pickupPos ? (
                  <Marker position={[pickupPos[0], pickupPos[1]]} icon={customIcons.passengerIcon} />
                ) : null}
                <Marker position={[selectedCollege.lat, selectedCollege.lng]} icon={customIcons.destinationIcon} />
              </MapContainer>
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
            </div>
          ) : (
            <div className="relative w-full overflow-hidden bg-gray-100" style={{ height: '60vh' }}>
              {destPos && (
                <img src={getTileUrl(destPos[0], destPos[1], 14)} alt="" className="absolute inset-0 w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
              )}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(0deg, rgba(0,0,0,0.5) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
              </div>

              {/* Route line: pickup -> college */}
              {destPos && (
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
              )}

              {/* Rider location marker */}
              {riderPos && (
                <div className="absolute z-10" style={{
                  left: `${((riderPos.lng - destPos[1]) / 0.02 + 50)}%`,
                  top: `${(50 - (riderPos.lat - destPos[0]) / 0.02)}%`,
                }}>
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/60 border-2 border-white">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#292928" strokeWidth="2.5"><circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" /><path d="M10 17h4l3-7-4-2-3 4h-4" /><line x1="6" y1="11" x2="10" y2="11" /></svg>
                  </div>
                </div>
              )}

              {/* Passenger pickup marker */}
              {pickupPos && !passengerLoc?.lat && (
                <div className="absolute z-10" style={{
                  left: `${((pickupPos[1] - destPos[1]) / 0.02 + 50)}%`,
                  top: `${(50 - (pickupPos[0] - destPos[0]) / 0.02)}%`,
                }}>
                  <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center shadow-lg border-2 border-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  </div>
                  <motion.div className="absolute -bottom-1 -right-1 w-14 h-14 rounded-full bg-orange-400/20 -z-10" animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
                </div>
              )}

              {/* Passenger live location marker */}
              {passengerLoc?.lat && (
                <div className="absolute z-10" style={{
                  left: `${((passengerLoc.lng - destPos[1]) / 0.02 + 50)}%`,
                  top: `${(50 - (passengerLoc.lat - destPos[0]) / 0.02)}%`,
                }}>
                  <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center shadow-lg border-2 border-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  </div>
                  <motion.div className="absolute -bottom-1 -right-1 w-14 h-14 rounded-full bg-orange-400/20 -z-10" animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
                </div>
              )}

              {/* Destination marker */}
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

              {/* Animated vehicle moving along route when searching */}
              {!otp && (
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
              )}

              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
            </div>
          )}

          <div className="px-4 -mt-8 relative z-20 overflow-y-auto max-h-[50vh] sm:max-h-none sm:overflow-visible">
            {verifyMsg && !otp && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 text-center">
                {verifyMsg}
              </motion.div>
            )}
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
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-text font-bold text-lg">
                        {waitingPassengers[0].passenger.name?.[0] || '?'}
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-semibold text-text">{waitingPassengers[0].passenger.name || 'Student'}</p>
                        <p className="text-xs text-gray-500">{waitingPassengers[0].pickup.address}</p>
                        <p className="text-sm text-green-700 font-medium mt-0.5">₹{FARE} fare</p>
                        {waitingPassengers[0].distance != null && (
                          <p className="text-xs text-gray-400 mt-0.5">{waitingPassengers[0].distance >= 1000 ? (waitingPassengers[0].distance / 1000).toFixed(1) + ' km' : waitingPassengers[0].distance + ' m'} away</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleConfirmRide(waitingPassengers[0]._id, waitingPassengers[0].passenger, waitingPassengers[0].pickup)}
                      className="w-full py-3 rounded-xl bg-primary text-text font-semibold text-sm hover:bg-primary-400 transition-colors"
                    >
                      Confirm Ride
                    </button>
                  </div>
                  <button onClick={handleDone} className="w-full py-3 rounded-xl border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors">
                    Cancel
                  </button>
                </div>
              )}

              {otp && acceptedPassenger && (
                <div>
                  {/* Passenger pickup address */}
                  <div className="bg-white rounded-xl border border-border p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#292928" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Pickup location</p>
                        <p className="text-sm font-medium text-text truncate">{rideDetails?.pickup || pickupPos ? 'Passenger location' : ''}</p>
                      </div>
                    </div>
                  </div>

                  {/* Passenger info card */}
                  <div className="bg-primary-50 rounded-xl p-4 border border-primary text-center">
                    <div className="w-16 h-16 rounded-full bg-primary mx-auto mb-3 flex items-center justify-center text-text font-bold text-xl">
                      {acceptedPassenger.name?.[0] || '?'}
                    </div>
                    <p className="text-base font-bold text-text mb-1">{acceptedPassenger.name || 'Student'}</p>

                    {/* Distance indicator */}
                    {passengerLoc?.lat && riderPos && (
                      <div className="text-sm mb-2">
                        {(() => {
                          const dist = calcDistance(riderPos.lat, riderPos.lng, passengerLoc.lat, passengerLoc.lng);
                          const color = dist <= 10 ? 'text-green-600' : 'text-orange-500';
                          return <span className={`font-medium ${color}`}>{Math.round(dist)}m away — {dist <= 10 ? 'arrived!' : 'heading to passenger'}</span>;
                        })()}
                      </div>
                    )}

                    {/* If rider is nearby but not verified yet, show note */}
                    {passengerLoc?.lat && riderPos && calcDistance(riderPos.lat, riderPos.lng, passengerLoc.lat, passengerLoc.lng) <= 10 && !isVerified && (
                      <p className="text-xs text-green-600 mb-2">You've arrived! Ask the passenger for their OTP.</p>
                    )}

                    {/* OTP display */}
                    {isVerified ? (
                      <div>
                        <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium mb-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                          Passenger Verified
                        </div>
                        <p className="text-sm font-semibold text-green-700 mt-2">Heading to {selectedCollege?.short || 'college'} →</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-gray-500 mb-3">Ask the passenger for their OTP</p>
                        <button
                          onClick={handleVerifyOtp}
                          className="w-full py-2.5 rounded-xl bg-primary text-text font-semibold text-sm hover:bg-primary-400 transition-colors"
                        >
                          Verify OTP
                        </button>
                      </>
                    )}

                    {verifyMsg && (
                      <p className={`text-sm mt-2 ${verifyMsg.includes('success') || verifyMsg.includes('Verified') ? 'text-green-600' : 'text-red-500'}`}>
                        {verifyMsg}
                      </p>
                    )}

                    <button onClick={handleDone} className="mt-3 py-2 px-6 rounded-xl border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors">
                      End Ride
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
