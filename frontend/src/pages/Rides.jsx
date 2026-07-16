import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const cancelReasons = [
  { key: 'long_wait', label: 'Taking too long', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
  { key: 'changed_plan', label: 'Changed my plan', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> },
  { key: 'found_other', label: 'Found another ride', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg> },
  { key: 'price_issue', label: 'Price too high', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg> },
  { key: 'other', label: 'Other reason', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg> },
];

const messages = [
  'Finding nearest drivers...',
  'Calculating fastest route...',
  'Connecting to your driver...',
  'Hold tight, we\'re almost there...',
  'Locating the best ride for you...',
];

function getTileUrl(lat, lng, zoom = 14) {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

export default function Rides() {
  const { token, role, user } = useAuth();
  const { emit, on, connected } = useSocket();
  const navState = useLocation().state;
  const navigate = useNavigate();
  const [college, setCollege] = useState(() => {
    try { const s = sessionStorage.getItem('ur_ride'); if (s) { const p = JSON.parse(s); if (p.college) return p.college; } } catch {}
    return navState?.college;
  });
  const [pickup, setPickup] = useState(() => {
    try { const s = sessionStorage.getItem('ur_ride'); if (s) { const p = JSON.parse(s); if (p.pickup) return p.pickup; } } catch {}
    return navState?.pickup;
  });
  const [msgIndex, setMsgIndex] = useState(0);
  const [matchedRide, setMatchedRide] = useState(() => {
    try { const s = sessionStorage.getItem('ur_ride'); if (s) { const p = JSON.parse(s); if (p.matchedRide) return p.matchedRide; } } catch {}
    return null;
  });
  const [otp, setOtp] = useState(() => {
    try { const s = sessionStorage.getItem('ur_ride'); if (s) { const p = JSON.parse(s); if (p.otp) return p.otp; } } catch {}
    return null;
  });
  const [showCancel, setShowCancel] = useState(false);
  const [rideDetails, setRideDetails] = useState(() => {
    try { const s = sessionStorage.getItem('ur_ride'); if (s) { const p = JSON.parse(s); if (p.rideDetails) return p.rideDetails; } } catch {}
    return null;
  });
  const [verified, setVerified] = useState(() => {
    try { const s = sessionStorage.getItem('ur_ride'); if (s) { const p = JSON.parse(s); if (p.verified) return p.verified; } } catch {}
    return false;
  });
  const [redirecting, setRedirecting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Persist state to sessionStorage
  useEffect(() => {
    if (matchedRide || college) {
      sessionStorage.setItem('ur_ride', JSON.stringify({ matchedRide, otp, college, pickup, verified, rideDetails }));
    }
  }, [matchedRide, otp, college, pickup, verified, rideDetails]);

  function clearPersistedState() {
    sessionStorage.removeItem('ur_ride');
  }

  const pickupPos = pickup?.position;

  useEffect(() => {
    if (role === 'rider') {
      setRedirecting(true);
      navigate('/app/rider-ride', { replace: true });
    }
  }, [role]);

  if (redirecting) return null;

  useEffect(() => {
    if (!college || !pickup) return;
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [college, pickup]);

  // Create ride request via socket, listen for match
  useEffect(() => {
    if (!college?.id || !pickup || !connected) return;
    if (matchedRide) return;

    const unsubError = on('error', (data) => {
      setRequestError(data.message || 'Failed to request ride');
    });

    const unsubMatched = on('matched', (data) => {
      setMatchedRide(data.ride._id);
      setOtp(data.otp);
      setRideDetails(data.ride);
    });

    emit('requestRide', { college, pickup });

    return () => {
      unsubError();
      unsubMatched();
    };
  }, [college?.id, pickup?.address, connected, matchedRide, retryCount]);

  // Cancel pending request on unmount only (if not matched)
  const wasMatched = useRef(false);
  wasMatched.current = matchedRide;
  useEffect(() => {
    return () => {
      if (!wasMatched.current) {
        emit('cancelRequest');
      }
    };
  }, []);

  function handleCancel(reason) {
    setShowCancel(false);
    emit('cancelRequest');
    clearPersistedState();
    setMatchedRide(null);
    setOtp(null);
    navigate('/app/home');
  }

  // After matching, listen for rider location, share passenger location, and listen for verification
  useEffect(() => {
    if (!matchedRide || !connected) return;

    emit('joinRideRoom', matchedRide);

    const unsubRiderLoc = on('riderLocation', (data) => {
      setRideDetails(prev => prev ? { ...prev, currentLocation: { lat: data.lat, lng: data.lng } } : prev);
    });

    const unsubVerified = on('passengerVerified', (data) => {
      if (data.rideId === matchedRide) {
        setVerified(true);
        setRideDetails(prev => prev ? { ...prev, verified: true } : prev);
      }
    });

    let locWatcher = null;
    if (navigator.geolocation) {
      locWatcher = navigator.geolocation.watchPosition(
        (pos) => {
          emit('updateLocation', { rideId: matchedRide, lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
      );
    }

    return () => {
      unsubRiderLoc();
      unsubVerified();
      if (locWatcher != null) navigator.geolocation.clearWatch(locWatcher);
    };
  }, [matchedRide, connected]);

  const driver = rideDetails?.driver;
  const driverPos = rideDetails?.currentLocation?.lat != null
    ? [rideDetails.currentLocation.lat, rideDetails.currentLocation.lng]
    : null;
  const mapCenter = driverPos || [college?.lat || 17.68, college?.lng || 75.91];

  if (!college || !pickup) {
    return (
      <div className="pb-20 relative">
        <div className="relative w-full overflow-hidden" style={{ height: '60vh', background: 'linear-gradient(180deg, #f0fdf4 0%, #dcfce7 30%, #bbf7d0 60%, #86efac 100%)' }}>
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `linear-gradient(90deg, #166534 1px, transparent 1px), linear-gradient(0deg, #166534 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `linear-gradient(35deg, #166534 1.5px, transparent 1.5px), linear-gradient(-35deg, #166534 1.5px, transparent 1.5px)`,
            backgroundSize: '120px 120px',
          }} />
          <div className="absolute w-24 h-16 rounded-full bg-green-300/30 left-[15%] top-[25%]" />
          <div className="absolute w-32 h-20 rounded-full bg-green-300/25 right-[20%] top-[55%]" />
          <div className="absolute w-40 h-28 rounded-[40%] bg-blue-300/25 right-[10%] top-[15%]" />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        </div>

        <div className="px-4 -mt-12 relative z-10">
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#292928" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" /><path d="M10 17h4l3-7-4-2-3 4h-4" /><line x1="6" y1="11" x2="10" y2="11" /></svg>
            </div>
            <p className="text-base font-semibold text-text">No ride booked yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">Choose your pickup and destination to get started</p>
            <button onClick={() => navigate('/app/home')} className="btn-primary flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              Book a Ride
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 relative">
      <div className="relative w-full overflow-hidden bg-gray-100" style={{ height: matchedRide ? '70vh' : '60vh' }}>
          {matchedRide ? (
            <>
              <img src={getTileUrl(mapCenter[0], mapCenter[1], 14)} alt="" className="absolute inset-0 w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(0deg, rgba(0,0,0,0.5) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
              </div>

              {/* Route: pickup -> college */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5]" viewBox="0 0 400 400" preserveAspectRatio="none">
                <path d="M40 340 Q200 280 360 60" stroke="#c3f832" strokeWidth="3" fill="none" strokeDasharray="10 8" opacity="0.7" />
                <path d="M40 340 Q200 280 360 60" stroke="#22C55E" strokeWidth="3" fill="none" strokeDasharray="10 8" opacity="0.7" transform="translate(0, 4)" />
                <circle cx="40" cy="340" r="8" fill="#c3f832" stroke="#292928" strokeWidth="2" />
                <circle cx="360" cy="60" r="8" fill="#22C55E" stroke="#292928" strokeWidth="2" />
              </svg>

              {/* Driver (rider) live location */}
              {driverPos && college?.lat && (
                <div className="absolute z-10" style={{
                  left: `${((driverPos[1] - college.lng) / 0.02 + 50)}%`,
                  top: `${(50 - (driverPos[0] - college.lat) / 0.02)}%`,
                }}>
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/60 border-2 border-white">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#292928" strokeWidth="2.5"><circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" /><path d="M10 17h4l3-7-4-2-3 4h-4" /><line x1="6" y1="11" x2="10" y2="11" /></svg>
                  </div>
                  <motion.div className="absolute -bottom-1 -right-1 w-16 h-16 rounded-full bg-primary/20 -z-10" animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
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

              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
            </>
          ) : (
          <>
            {pickupPos && (
              <img src={getTileUrl(pickupPos[0], pickupPos[1], 14)} alt="" className="absolute inset-0 w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
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
          </>
        )}
      </div>

      <div className="px-4 -mt-8 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-border shadow-sm p-4"
        >
          {matchedRide ? (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-full bg-primary mx-auto mb-3 overflow-hidden flex items-center justify-center">
                {driver?.profilePicture ? (
                  <img src={driver.profilePicture} alt={driver.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-text font-bold text-xl">{driver?.name?.[0] || '?'}</span>
                )}
              </div>
              <p className="text-base font-bold text-text">{driver?.name || 'Rider'}</p>
              <p className="text-sm text-green-700 font-medium mt-1">₹30 fare</p>

              {/* Rider distance indicator */}
              {driverPos && (
                <p className="text-xs text-gray-500 mt-1">
                  Rider is on the way
                </p>
              )}

              {verified ? (
                <div className="mt-2">
                  <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    Verified by Rider
                  </div>
                  <p className="text-sm font-semibold text-green-700 mt-2">Heading to {college?.short || 'college'} →</p>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-primary mt-3 tracking-widest">{otp || '----'}</p>
                  <p className="text-xs text-gray-500 mt-1">Show this OTP to the rider when they arrive</p>
                </>
              )}
            </div>
          ) : requestError ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              </div>
              <p className="text-sm text-red-500 mb-3">{requestError}</p>
              <button onClick={() => { setRequestError(''); setRetryCount(c => c + 1); }} className="btn-primary !py-2.5 !text-sm">
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <div className="w-0.5 h-6 bg-gray-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{pickup.address}</p>
                  <p className="text-sm text-gray-500 truncate">{college.short}</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mb-3">
                <motion.span key={msgIndex} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-sm text-gray-500">{messages[msgIndex]}</motion.span>
                <span className="flex gap-0.5">
                  {[0, 1, 2].map(i => (
                    <motion.span key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} className="w-1.5 h-1.5 rounded-full bg-primary" />
                  ))}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} className="w-1/2 h-full rounded-full bg-primary" />
              </div>

              <button onClick={() => setShowCancel(true)} className="w-full mt-4 py-3 rounded-xl border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors">
                Cancel Ride
              </button>
            </>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {showCancel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-bold text-text text-center">Cancel Ride</h2>
                <p className="text-xs text-gray-400 text-center mt-1">What made you cancel?</p>
                <div className="mt-5 space-y-2">
                  {cancelReasons.map(reason => (
                    <button key={reason.key} onClick={() => handleCancel(reason)} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border hover:bg-gray-50 transition-colors text-left">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">{reason.icon}</div>
                      <span className="text-sm font-medium text-text">{reason.label}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowCancel(false)} className="w-full mt-4 py-3 text-sm font-medium text-gray-500 hover:text-text transition-colors">Keep waiting</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
