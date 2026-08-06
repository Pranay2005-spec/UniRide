import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useRideState } from '../context/RideStateContext';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { customIcons } from '../lib/customIcons';
import { buildUpiUrl } from '../lib/upi';
import ReviewModal from '../components/ReviewModal';
import ChatOverlay from '../components/ChatOverlay';

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

function PaymentCard({ ride }) {
  const upiUrl = buildUpiUrl({
    upiId: ride?.driver?.upiId,
    name: ride?.driver?.name,
    amount: ride?.price,
    txnNote: ride?.rideCode,
  });

  if (!upiUrl) {
    return (
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
        <p className="text-sm font-semibold text-amber-800">UPI not available</p>
        <p className="text-xs text-amber-600 mt-1">The rider hasn't set up a UPI ID yet. Please pay by cash when you meet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="p-4">
        <p className="text-sm font-semibold text-text text-center mb-1">Pay ₹{ride?.price || 30} via UPI</p>
        <p className="text-xs text-gray-400 text-center mb-3">Scan the QR shown on the rider's phone, or pay from your UPI app.</p>
        <a
          href={upiUrl}
          className="w-full py-3 rounded-xl bg-primary text-text font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-400 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
          Pay Now
        </a>
        <p className="text-xs text-gray-500 text-center mt-2">Your rider will confirm the payment once they receive it.</p>
      </div>
    </div>
  );
}

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

export default function Rides() {
  const { role } = useAuth();
  const { connected } = useSocket();
  const {
    searching, matchedRide, otp, rideDetails, verified,
    college, pickup, passengerPos, lastError,
    showReview, reviewTarget, reviewRideId,
    paymentPending,
    startRideRequest, cancelRideRequest, retryRideRequest,
    dismissReview,
    chatMessages, unreadChatCount,
  } = useRideState();
  const navState = useLocation().state;
  const navigate = useNavigate();
  const [msgIndex, setMsgIndex] = useState(0);
  const [showCancel, setShowCancel] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [initializing, setInitializing] = useState(!!navState?.college);

  // Redirect riders to their page
  useEffect(() => {
    if (role === 'rider') {
      setRedirecting(true);
      navigate('/app/rider-ride', { replace: true });
    }
  }, [role]);

  // Rotate searching messages
  useEffect(() => {
    if (!college || !pickup) return;
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [college, pickup]);

  // Start ride request — from navState on fresh navigation only. A refresh or
  // revisit resumes from context state (and is validated server-side in the
  // context), so it must NOT re-create a request here.
  useEffect(() => {
    if (!connected) return;
    if (matchedRide) return;
    if (searching) return;

    if (navState?.college && navState?.pickup) {
      startRideRequest(navState.college, navState.pickup, navState.fare, navState.paymentMethod);
      setInitializing(false);
    }
  }, [connected]);

  if (redirecting) return null;

  const pickupPos = pickup?.position;

  function handleCancel(reason) {
    setShowCancel(false);
    cancelRideRequest();
    navigate('/app/home');
  }

  const driver = rideDetails?.driver;
  const driverPos = rideDetails?.currentLocation?.lat != null
    ? [rideDetails.currentLocation.lat, rideDetails.currentLocation.lng]
    : null;
  const mapCenter = driverPos || [college?.lat || 17.68, college?.lng || 75.91];

  if (!college || !pickup) {
    if (initializing) {
      return (
        <div className="pb-20 relative min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary" style={{ animation: `pulse 1.2s ease-in-out infinite ${i * 0.2}s` }} />
                ))}
              </span>
            </div>
            <p className="text-sm text-gray-500">Connecting to nearby drivers...</p>
          </div>
        </div>
      );
    }
    return (
      <>
        <div className="pb-20 relative">
          <div className="relative w-full overflow-hidden bg-gray-100" style={{ height: '60vh' }}>
            <MapContainer center={[passengerPos?.lat || 17.6759, passengerPos?.lng || 75.9067]} zoom={13} className="absolute inset-0 w-full h-full z-0" zoomControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {passengerPos && (
                <>
                  <Marker position={[passengerPos.lat, passengerPos.lng]} icon={customIcons.youAreHereIcon} />
                  <FlyToMarker position={[passengerPos.lat, passengerPos.lng]} />
                </>
              )}
            </MapContainer>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>

          <div className="px-4 -mt-4 relative z-10">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-4 text-center">
              <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#292928" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" /><path d="M10 17h4l3-7-4-2-3 4h-4" /><line x1="6" y1="11" x2="10" y2="11" /></svg>
              </div>
              <p className="text-[15px] font-semibold text-text">No ride booked yet</p>
              <p className="text-xs text-gray-400 mt-0.5 mb-3">Choose your pickup and destination to get started</p>
              <button onClick={() => navigate('/app/home')} className="btn-primary !py-2 !text-sm flex items-center justify-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                Book a Ride
              </button>
            </div>
          </div>
        </div>
        {showReview && reviewTarget && (
          <ReviewModal
            target={reviewTarget}
            targetRole="rider"
            rideId={reviewRideId}
            onClose={dismissReview}
            onSubmit={() => {}}
          />
        )}
      </>
    );
  }

  return (
    <div className="pb-20 relative">
      {matchedRide ? (
        <div className="flex flex-col h-[calc(100vh-5rem)]">
          <div className="flex-1 min-h-0 relative overflow-hidden bg-gray-100">
            <MapContainer key={driverPos ? driverPos.join(',') : 'center'} center={mapCenter} zoom={14} className="absolute inset-0 w-full h-full z-0" zoomControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FlyToMarker position={driverPos} />
              {driverPos && <Marker position={driverPos} icon={customIcons.riderIcon} />}
              {passengerPos && <Marker position={[passengerPos.lat, passengerPos.lng]} icon={customIcons.passengerIcon} />}
              {college?.lat != null && college?.lng != null && <Marker position={[college.lat, college.lng]} icon={customIcons.destinationIcon} />}
            </MapContainer>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
          </div>
          <div className="shrink-0 mx-4 -mt-8 relative z-20">
            <div className="bg-white rounded-2xl border border-border shadow-sm">
              <button
                onClick={() => setSheetExpanded(prev => !prev)}
                className="w-full text-left px-4 py-3 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-text font-bold text-sm shrink-0 overflow-hidden">
                  {driver?.profilePicture ? (
                    <img src={driver.profilePicture} alt={driver.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{driver?.name?.[0] || '?'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-semibold text-text truncate">{driver?.name || 'Rider'}</p>
                      {driver?.avgRating > 0 && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#c3f832" stroke="#c3f832" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          <span className="text-xs font-semibold text-text">{driver.avgRating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!verified ? (
                        <div className="px-3 py-1.5 rounded-xl bg-yellow-100 text-yellow-700 text-xs font-medium whitespace-nowrap">
                          Show OTP
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                          Verified
                        </div>
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
                    <p className="text-xs text-green-700 font-medium">₹{rideDetails?.price || 30} fare</p>
                    {rideDetails?.paymentMethod === 'online' ? (
                      <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">UPI</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Cash</span>
                    )}
                    {paymentPending && (
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Payment pending</span>
                    )}
                    {rideDetails?.paymentStatus === 'paid' && (
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
                  {driverPos && (
                    <p className="text-sm text-gray-500">Rider is on the way</p>
                  )}
                  {!verified ? (
                    <>
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-3xl font-bold text-primary text-center tracking-widest">{otp || rideDetails?.otp || '----'}</p>
                        {rideDetails?.rideCode && (
                          <span className="text-[10px] font-mono font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{rideDetails.rideCode}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 text-center">Show this OTP to the rider when they arrive</p>
                      <button onClick={() => setShowCancel(true)} className="w-full py-2.5 rounded-xl border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors">
                        Cancel Ride
                      </button>
                    </>
                  ) : rideDetails?.paymentMethod === 'online' && rideDetails?.paymentStatus !== 'paid' ? (
                    <>
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-3xl font-bold text-primary text-center tracking-widest">{otp || rideDetails?.otp || '----'}</p>
                        {rideDetails?.rideCode && (
                          <span className="text-[10px] font-mono font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{rideDetails.rideCode}</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-green-700">Heading to {college?.short || 'college'} →</p>
                      <PaymentCard ride={rideDetails} />
                      {paymentPending && (
                        <p className="text-xs text-gray-500 text-center">Ride ended — waiting for the rider to confirm your payment.</p>
                      )}
                    </>
                  ) : rideDetails?.paymentStatus === 'paid' ? (
                    <div className="flex flex-col items-center gap-2 py-1">
                      <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-semibold">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        Payment received
                      </div>
                      <p className="text-sm font-semibold text-green-700">Heading to {college?.short || 'college'} →</p>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-green-700">Heading to {college?.short || 'college'} →</p>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="relative w-full overflow-hidden bg-gray-100" style={{ height: '60vh' }}>
            <MapContainer
              center={[pickupPos?.[0] || college?.lat || 17.68, pickupPos?.[1] || college?.lng || 75.91]}
              zoom={14}
              className="absolute inset-0 w-full h-full z-0"
              zoomControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {pickupPos && (
                <>
                  <Marker position={[pickupPos[0], pickupPos[1]]} icon={customIcons.passengerPulseIcon} />
                  <FlyToMarker position={[pickupPos[0], pickupPos[1]]} />
                </>
              )}
              {passengerPos && <Marker position={[passengerPos.lat, passengerPos.lng]} icon={customIcons.youAreHereIcon} />}
              {college?.lat != null && college?.lng != null && <Marker position={[college.lat, college.lng]} icon={customIcons.destinationIcon} />}
            </MapContainer>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
          </div>

          <div className="px-4 -mt-8 relative z-20 overflow-y-auto max-h-[50vh] sm:max-h-none sm:overflow-visible">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-border shadow-sm p-4"
            >
              {lastError ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                  </div>
                  <p className="text-sm text-red-500 mb-3">{lastError}</p>
                  <button onClick={retryRideRequest} className="btn-primary !py-2.5 !text-sm">
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
        </>
      )}

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

      <AnimatePresence>
        {showReview && reviewTarget && (
          <ReviewModal
            target={reviewTarget}
            targetRole="rider"
            rideId={reviewRideId}
            onClose={dismissReview}
            onSubmit={() => {}}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChat && matchedRide && (
          <ChatOverlay
            rideId={matchedRide}
            otherName={driver?.name}
            onClose={() => setShowChat(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
