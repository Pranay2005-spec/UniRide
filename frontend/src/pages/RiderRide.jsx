import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useRideState } from '../context/RideStateContext';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { customIcons } from '../lib/customIcons';
import { buildUpiUrl } from '../lib/upi';
import { calcDistance } from '../lib/distance';
import { QRCodeSVG } from 'qrcode.react';
import colleges from '../data/solapurColleges';
import ReviewModal from '../components/ReviewModal';
import ChatOverlay from '../components/ChatOverlay';

const messages = [
  'Finding students heading your way...',
  'Checking who needs a ride...',
  'Matching with nearby students...',
  'Almost there, hold tight...',
  'Connecting you with passengers...',
];

const FARE = 30;

function FlyToMarker({ position }) {
  const map = useMap();
  const lastRef = useRef(null);
  useEffect(() => {
    if (!position) return;
    const [lat, lng] = position;
    const last = lastRef.current;
    if (last && Math.abs(last[0] - lat) < 0.0005 && Math.abs(last[1] - lng) < 0.0005) return;
    lastRef.current = [lat, lng];
    map.flyTo(position, 14, { duration: 1 });
  }, [position, map]);
  return null;
}

export default function RiderRide() {
  const { token, user } = useAuth();
  const { connected } = useSocket();
  const {
    riderStep, riderCollege, waitingPassengers, acceptedPassenger,
    riderRideId, riderOtp, riderRideDetails, riderPickupPos,
    riderVerifyMsg, riderPos, skippedPassengers,
    showReview, reviewTarget, reviewRideId,
    paymentPending,
    setRiderCollegeAndSearch, stopFindRiders, riderAcceptRequest,
    riderClearVerifyMsg, riderMarkVerified, riderEndRide, riderCancelRide,
    riderConfirmPayment, skipPassenger,
    setRiderVerifyMsg, setRiderCollege, clearRiderState, setRiderStep,
    setAcceptedPassenger, setRiderOtp, setRiderRideDetails,
    setRiderPickupPos, setRiderRideId, dismissReview,
    chatMessages, unreadChatCount,
  } = useRideState();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [showCollegeSearch, setShowCollegeSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [msgIndex, setMsgIndex] = useState(0);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');

  const searchResults = query.trim()
    ? colleges.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.short.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  // Restore college from URL param on first mount if not already set
  useEffect(() => {
    if (!riderCollege) {
      const id = searchParams.get('college');
      if (id) {
        const col = colleges.find(c => c.id === Number(id));
        if (col) setRiderCollegeAndSearch(col);
      }
    }
  }, []);

  // Message rotation while searching
  useEffect(() => {
    if (riderStep !== 'searching') return;
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [riderStep]);

  async function handleFindRiders() {
    if (!riderCollege) return;
    setRiderCollegeAndSearch(riderCollege);
  }

  function handleConfirmRide(requestId, passengerData, passengerPickup) {
    riderAcceptRequest(requestId, passengerData, passengerPickup);
  }

  function handleSkipPassenger() {
    if (visiblePassenger) skipPassenger(visiblePassenger._id);
  }

  function handleVerifyOtp() {
    setOtpInput('');
    setShowOtpModal(true);
  }

  async function submitOtp() {
    if (!riderRideId || !acceptedPassenger || !otpInput.trim()) return;
    setShowOtpModal(false);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/rides/${riderRideId}/verify-passenger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ passengerId: acceptedPassenger._id, otp: otpInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setRiderVerifyMsg('Passenger verified successfully!');
        riderMarkVerified();
      } else {
        setRiderVerifyMsg(data.error || 'Verification failed');
      }
    } catch {
      setRiderVerifyMsg('Network error');
    }
  }

  function handleDone() {
    if (riderStep === 'searching' && riderCollege) {
      stopFindRiders(riderCollege.id);
    }
    if (riderRideId) {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/rides/${riderRideId}/deactivate`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    riderEndRide();
    setShowCollegeSearch(false);
    setQuery('');
  }

  async function handleEndRide() {
    if (!riderRideId) return handleDone();
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/rides/${riderRideId}/complete`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  }

  function handleRiderCancel() {
    riderCancelRide();
    setShowOtpModal(false);
  }

  const destPos = riderCollege ? [riderCollege.lat, riderCollege.lng] : null;
  const visiblePassenger = waitingPassengers.find(p => !skippedPassengers.includes(p._id));
  const verifyMatchId = String(acceptedPassenger?._id);
  const upiUrl = buildUpiUrl({
    upiId: user?.upiId,
    name: user?.name,
    amount: riderRideDetails?.price,
    txnNote: riderRideDetails?.rideCode,
  });
  const isVerified = riderRideDetails?.passengers?.find(p => {
    const pid = String(p.user?._id || p.user);
    return pid === verifyMatchId;
  })?.verified;
  const passengerLoc = riderRideDetails?.passengers?.[0]?.location;

  return (
    <div className="pb-20 relative">
      {riderStep === 'pick' && (
<div className="pb-20 relative">
          <div className="relative w-full overflow-hidden bg-gray-100" style={{ height: '75vh' }}>
            <MapContainer center={[riderPos?.lat || 17.6759, riderPos?.lng || 75.9067]} zoom={13} className="absolute inset-0 w-full h-full z-0" zoomControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {riderPos && (
                <>
                  <Marker position={[riderPos.lat, riderPos.lng]} icon={customIcons.youAreHereIcon} />
                  <FlyToMarker position={[riderPos.lat, riderPos.lng]} />
                </>
              )}
              {riderCollege && <Marker position={[riderCollege.lat, riderCollege.lng]} icon={customIcons.destinationIcon} />}
            </MapContainer>
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>

          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="bg-white rounded-2xl shadow-md border border-border overflow-hidden">
              {riderCollege ? (
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-success-50 flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"><path d="M12 22c-2 0-8-5.06-8-10a8 8 0 1 1 16 0c0 4.94-6 10-8 10z" /><circle cx="12" cy="10" r="2.5" /></svg>
                  </div>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-text">{riderCollege.short}</span>
                    <span className="text-xs text-gray-400 truncate">{riderCollege.name}</span>
                  </div>
                  <span onClick={() => clearRiderState()} className="text-gray-400 cursor-pointer p-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </span>
                </div>
              ) : (
                <>
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-success-50 flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"><path d="M12 22c-2 0-8-5.06-8-10a8 8 0 1 1 16 0c0 4.94-6 10-8 10z" /><circle cx="12" cy="10" r="2.5" /></svg>
                  </div>
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Where are you going?" className="flex-1 text-sm text-text placeholder-gray-400 bg-transparent outline-none" autoFocus />
                </div>
                {query.trim() && searchResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border-t border-border">
                    {searchResults.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setRiderCollege(c); setQuery(''); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-primary-50 transition-colors flex items-center gap-2.5"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#292928" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V9l9-6 9 6v12" /><path d="M9 21V13h6v8" /></svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text">{c.short}</p>
                          <p className="text-xs text-gray-400 truncate">{c.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                </>
              )}
            </div>
          </div>

          {riderCollege && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-8 left-4 right-4 z-10"
            >
              <button onClick={handleFindRiders} className="w-full bg-primary text-text font-bold rounded-2xl py-4 flex items-center justify-center gap-2 shadow-lg shadow-primary/30 text-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                Find Passengers
              </button>
            </motion.div>
          )}
        </div>
      )}

      {riderStep !== 'pick' && riderCollege && (
        <>
          {riderOtp ? (
            <div className="flex flex-col h-[calc(100vh-5rem)]">
              <div className="flex-1 min-h-0 relative overflow-hidden bg-gray-100">
              <MapContainer center={[riderPos?.lat || destPos[0], riderPos?.lng || destPos[1]]} zoom={14} className="absolute inset-0 w-full h-full z-0" zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FlyToMarker position={passengerLoc?.lat ? [passengerLoc.lat, passengerLoc.lng] : (riderPickupPos ? [riderPickupPos[0], riderPickupPos[1]] : null)} />
                {riderPos && <Marker position={[riderPos.lat, riderPos.lng]} icon={customIcons.riderIcon} />}
                {passengerLoc?.lat ? (
                  <Marker position={[passengerLoc.lat, passengerLoc.lng]} icon={customIcons.passengerIcon} />
                ) : riderPickupPos ? (
                  <Marker position={[riderPickupPos[0], riderPickupPos[1]]} icon={customIcons.passengerIcon} />
                ) : null}
                <Marker position={[riderCollege.lat, riderCollege.lng]} icon={customIcons.destinationIcon} />
              </MapContainer>
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
            </div>
              <div className="shrink-0 mx-4 -mt-8 relative z-20">
                <div className="bg-white rounded-2xl border border-border shadow-sm">
                  <button
                    onClick={() => setSheetExpanded(prev => !prev)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-text font-bold text-sm shrink-0">
                      {acceptedPassenger?.name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-text truncate">{acceptedPassenger?.name || 'Student'}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isVerified ? (
                            <button onClick={(e) => { e.stopPropagation(); handleVerifyOtp(); }} className="px-3 py-1.5 rounded-xl bg-primary text-text font-semibold text-xs hover:bg-primary-400 transition-colors whitespace-nowrap">
                              Verify OTP
                            </button>
                          ) : (
                            <button className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap cursor-default">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                              Verified
                            </button>
                          )}
                          <motion.svg
                            animate={{ rotate: sheetExpanded ? 180 : 0 }}
                            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                            className="text-gray-400"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </motion.svg>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1.5">
                        <p className="text-xs text-green-700 font-medium">₹{riderRideDetails?.price || 30} fare</p>
                        {riderRideDetails?.paymentMethod === 'online' ? (
                          <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">UPI</span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Cash</span>
                        )}
                        {paymentPending && (
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Payment pending</span>
                        )}
                        {riderRideDetails?.paymentStatus === 'paid' && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                            Paid
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowChat(true); }}
                      className="relative w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 hover:bg-gray-200 transition-colors self-center"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#292928" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                      {unreadChatCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                          {unreadChatCount > 9 ? '9+' : unreadChatCount}
                        </span>
                      )}
                    </button>
                  </button>
                  <motion.div
                    animate={{ height: sheetExpanded ? 'auto' : 0, opacity: sheetExpanded ? 1 : 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                      {riderRideDetails?.rideCode && (
                        <p className="text-xs text-gray-400 text-center font-mono font-semibold">Ride code: {riderRideDetails.rideCode}</p>
                      )}
                      {isVerified && riderRideDetails?.paymentMethod === 'online' && riderRideDetails?.paymentStatus !== 'paid' && (
                        <div className="bg-sky-50 rounded-xl p-4 border border-sky-200">
                          <p className="text-sm font-semibold text-sky-800 text-center">Ask the passenger to scan & pay</p>
                          <p className="text-xs text-sky-600 text-center mt-0.5 mb-3">₹{riderRideDetails?.price || 30} via any UPI app</p>
                          {upiUrl ? (
                            <div className="bg-white p-3 rounded-xl border border-border flex justify-center">
                              <QRCodeSVG value={upiUrl} size={150} level="M" />
                            </div>
                          ) : (
                            <p className="text-xs text-amber-600 text-center">Set your UPI ID in Profile → UPI ID to accept online payments.</p>
                          )}
                        </div>
                      )}
                      {passengerLoc?.lat && riderPos && (
                        <div className="text-sm">
                          {(() => {
                            const dist = calcDistance(riderPos.lat, riderPos.lng, passengerLoc.lat, passengerLoc.lng);
                            const color = dist <= 10 ? 'text-green-600' : 'text-orange-500';
                            return <span className={`font-medium ${color}`}>{Math.round(dist)}m away — {dist <= 10 ? 'arrived!' : 'heading to passenger'}</span>;
                          })()}
                        </div>
                      )}
                      {passengerLoc?.lat && riderPos && calcDistance(riderPos.lat, riderPos.lng, passengerLoc.lat, passengerLoc.lng) <= 10 && !isVerified && (
                        <p className="text-xs text-green-600">You've arrived! Ask the passenger for their OTP.</p>
                      )}
                      {isVerified && (
                        <p className="text-sm font-semibold text-green-700">Heading to {riderCollege?.short || 'college'} →</p>
                      )}
                      {riderVerifyMsg && (
                        <p className={`text-sm ${riderVerifyMsg.includes('success') || riderVerifyMsg.includes('Verified') ? 'text-green-600' : 'text-red-500'}`}>
                          {riderVerifyMsg}
                        </p>
                      )}
                      {paymentPending && (
                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                          <p className="text-sm font-semibold text-amber-800">Payment received?</p>
                          <p className="text-xs text-amber-600 mt-1 mb-3">Ask the passenger to pay ₹{riderRideDetails?.price || 30} before confirming.</p>
                          <button onClick={riderConfirmPayment} className="w-full py-2.5 rounded-xl bg-primary text-text font-semibold text-sm hover:bg-primary-400 transition-colors">
                            Confirm Payment — Mark as Paid
                          </button>
                        </div>
                      )}
                      {riderRideDetails?.paymentStatus === 'paid' && (
                        <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-semibold">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                          Payment received
                        </div>
                      )}
                      {!paymentPending && (
                        <button onClick={handleEndRide} className="w-full py-2.5 rounded-xl border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors">
                          End Ride
                        </button>
                      )}
                      {!paymentPending && !isVerified && (
                        <button onClick={handleRiderCancel} className="w-full py-2.5 rounded-xl border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 transition-colors">
                          Cancel Ride
                        </button>
                      )}
                    </div>
                  </motion.div>
</div>
            </div>
            </div>
          ) : (
            <div className="flex flex-col h-[calc(100vh-5rem)]">
            <div className="flex-1 min-h-0 relative w-full overflow-hidden bg-gray-100">
              <MapContainer
                center={[riderPos?.lat || destPos[0], riderPos?.lng || destPos[1]]}
                zoom={14}
                className="absolute inset-0 w-full h-full z-0"
                zoomControl={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {riderPos && <Marker position={[riderPos.lat, riderPos.lng]} icon={customIcons.youAreHereIcon} />}
                {waitingPassengers
                  .filter(p => !skippedPassengers.includes(p._id) && p.pickup?.position)
                  .map(p => {
                    const isClosest = visiblePassenger?._id === p._id;
                    return (
                      <Marker
                        key={p._id}
                        position={[p.pickup.position[0], p.pickup.position[1]]}
                        icon={isClosest ? customIcons.passengerPulseIcon : customIcons.passengerIcon}
                      />
                    );
                  })}
                {destPos && <Marker position={destPos} icon={customIcons.destinationIcon} />}
                {riderPos && <FlyToMarker position={[riderPos.lat, riderPos.lng]} />}
              </MapContainer>
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
            </div>
            {!riderOtp && (
            <div className="shrink-0 px-4 -mt-8 relative z-20 overflow-y-auto max-h-[50vh]">
              {riderVerifyMsg && !riderOtp && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 text-center">
                {riderVerifyMsg}
              </motion.div>
            )}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-gray-50/60">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <div className="w-0.5 h-6 bg-gray-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">Your Location</p>
                  <p className="text-sm text-gray-500 truncate">{riderCollege.short}</p>
                </div>
                {riderStep === 'searching' && (
                  <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">Finding riders</span>
                )}
              </div>
              <AnimatePresence mode="wait">

              {riderStep === 'searching' && (waitingPassengers.length === 0 || !visiblePassenger) && (
                <motion.div
                  key="searching"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="p-4"
                >
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <motion.span key={msgIndex} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-sm text-gray-500">{waitingPassengers.length > 0 ? 'No more nearby passengers — waiting for new requests...' : messages[msgIndex]}</motion.span>
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
                </motion.div>
              )}

              {riderStep === 'searching' && visiblePassenger && !riderOtp && (
                <motion.div
                  key={visiblePassenger._id}
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  className="p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Passenger nearby</span>
                    </div>
                    {visiblePassenger.distance != null && (
                      <span className="text-xs font-medium text-gray-400">{visiblePassenger.distance >= 1000 ? (visiblePassenger.distance / 1000).toFixed(1) + ' km' : visiblePassenger.distance + ' m'}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pb-3">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                      {visiblePassenger.passenger.profilePicture ? (
                        <img src={visiblePassenger.passenger.profilePicture} alt={visiblePassenger.passenger.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary font-bold text-lg">{visiblePassenger.passenger.name?.[0] || '?'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-text truncate">{visiblePassenger.passenger.name || 'Student'}</p>
                      {visiblePassenger.passenger.collegeName && (
                        <p className="text-xs text-gray-400 truncate">{visiblePassenger.passenger.collegeName}</p>
                      )}
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 truncate">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                        {visiblePassenger.pickup.address}
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-border mb-3" />

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Trip fare</p>
                      <p className="text-lg font-bold text-text">₹{visiblePassenger.price ?? riderRideDetails?.price ?? FARE}</p>
                    </div>
                    {visiblePassenger.paymentMethod === 'online' ? (
                      <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-2 py-1 rounded-lg">UPI Payment</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">Cash Payment</span>
                    )}
                  </div>

                  <button
                    onClick={() => handleConfirmRide(visiblePassenger._id, visiblePassenger.passenger, visiblePassenger.pickup)}
                    className="w-full py-3.5 rounded-xl bg-primary text-text font-bold text-sm hover:bg-primary-400 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Confirm Ride
                  </button>
                  <button onClick={handleSkipPassenger} className="w-full py-3 mt-2 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 hover:text-gray-700 transition-colors flex items-center justify-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    Cancel
                  </button>
                </motion.div>
              )}

              {riderOtp && acceptedPassenger && (
                <motion.div
                  key="confirmed"
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  className="p-4"
                >
                  <div className="text-center py-2">
                    <div className="w-16 h-16 rounded-full bg-primary mx-auto mb-3 overflow-hidden flex items-center justify-center ring-4 ring-primary/15">
                      {acceptedPassenger.profilePicture ? (
                        <img src={acceptedPassenger.profilePicture} alt={acceptedPassenger.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-text font-bold text-xl">{acceptedPassenger.name?.[0] || '?'}</span>
                      )}
                    </div>
                    <p className="text-base font-bold text-text">{acceptedPassenger.name || 'Student'}</p>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-sm text-green-700 font-medium">₹{riderRideDetails?.price || 30} fare</p>
                      {riderRideDetails?.rideCode && (
                        <span className="text-[10px] font-mono font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{riderRideDetails.rideCode}</span>
                      )}
                      {riderRideDetails?.paymentMethod === 'online' ? (
                        <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">UPI</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Cash</span>
                      )}
                    </div>

                    {passengerLoc?.lat && riderPos && (
                      <div className="text-sm mt-1">
                        {(() => {
                          const dist = calcDistance(riderPos.lat, riderPos.lng, passengerLoc.lat, passengerLoc.lng);
                          const color = dist <= 10 ? 'text-green-600' : 'text-orange-500';
                          return <span className={`font-medium ${color}`}>{Math.round(dist)}m away — {dist <= 10 ? 'arrived!' : 'heading to passenger'}</span>;
                        })()}
                      </div>
                    )}

                    {isVerified ? (
                      <div className="mt-2">
                        <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                          Passenger Verified
                        </div>
                        <p className="text-sm font-semibold text-green-700 mt-2">Heading to {riderCollege?.short || 'college'} →</p>
                      </div>
                    ) : (
                      <>
                        {passengerLoc?.lat && riderPos && calcDistance(riderPos.lat, riderPos.lng, passengerLoc.lat, passengerLoc.lng) <= 10 && (
                          <p className="text-xs text-green-600 mt-2 mb-2">You've arrived! Ask the passenger for their OTP.</p>
                        )}
                        <button
                          onClick={handleVerifyOtp}
                          className="mt-3 w-full py-2.5 rounded-xl bg-primary text-text font-semibold text-sm hover:bg-primary-400 transition-colors"
                        >
                          Verify OTP
                        </button>
                      </>
                    )}

                    {riderVerifyMsg && (
                      <p className={`text-sm mt-2 ${riderVerifyMsg.includes('success') || riderVerifyMsg.includes('Verified') ? 'text-green-600' : 'text-red-500'}`}>
                        {riderVerifyMsg}
                      </p>
                    )}

                    {paymentPending && (
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 mt-3">
                        <p className="text-sm font-semibold text-amber-800">Payment received?</p>
                        <p className="text-xs text-amber-600 mt-1 mb-3">Ask the passenger to pay ₹{riderRideDetails?.price || 30} before confirming.</p>
                        <button onClick={riderConfirmPayment} className="w-full py-2.5 rounded-xl bg-primary text-text font-semibold text-sm hover:bg-primary-400 transition-colors">
                          Confirm Payment — Mark as Paid
                        </button>
                      </div>
                    )}
                    {riderRideDetails?.paymentStatus === 'paid' && (
                      <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-semibold mt-3">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        Payment received
                      </div>
                    )}
                    {!paymentPending && (
                      <button onClick={handleEndRide} className="mt-4 py-2 px-6 rounded-xl border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors">
                        End Ride
                      </button>
                    )}
                    {!paymentPending && !isVerified && (
                      <button onClick={handleRiderCancel} className="mt-2 py-2 px-6 rounded-xl border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 transition-colors">
                        Cancel Ride
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </motion.div>
            </div>
            )}
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showOtpModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-sm rounded-2xl overflow-hidden">
              <div className="p-4 text-center">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#292928" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 12h4" /><path d="M14 12h4" /></svg>
                </div>
                <h2 className="text-base font-bold text-text">Enter OTP</h2>
                <p className="text-xs text-gray-500 mt-0.5">Ask the passenger for their 4-digit code</p>
                <input
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="0000"
                  className="mt-3 w-28 mx-auto text-center text-xl font-bold text-text tracking-widest bg-gray-50 border border-border rounded-xl py-2 outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                  maxLength={4}
                  onKeyDown={e => { if (e.key === 'Enter' && otpInput.length === 4) submitOtp(); }}
                />
                <div className="mt-3 space-y-1.5">
                  <button onClick={submitOtp} disabled={otpInput.length !== 4} className="w-full py-2.5 rounded-xl bg-primary text-text font-semibold text-sm hover:bg-primary-400 transition-colors disabled:opacity-40">
                    Verify
                  </button>
                  <button onClick={() => setShowOtpModal(false)} className="w-full py-2 text-sm font-medium text-gray-500 hover:text-text transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReview && reviewTarget && (
          <ReviewModal
            target={reviewTarget}
            targetRole="passenger"
            rideId={reviewRideId}
            onClose={dismissReview}
            onSubmit={() => {}}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChat && riderRideId && (
          <ChatOverlay
            rideId={riderRideId}
            otherName={acceptedPassenger?.name}
            onClose={() => setShowChat(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
