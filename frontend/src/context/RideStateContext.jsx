import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const RideStateContext = createContext();

const STORAGE_KEY = 'ur_ride';
const RIDER_STORAGE_KEY = 'ur_rider_ride';

function loadPersisted(key) {
  try {
    const s = sessionStorage.getItem(key);
    if (s) return JSON.parse(s);
  } catch {}
  return {};
}

function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function RideStateProvider({ children }) {
  const { emit, on, connected } = useSocket();
  const { token } = useAuth();

  // === Passenger state ===
  const [searching, setSearching] = useState(false);
  const [matchedRide, setMatchedRide] = useState(() => loadPersisted(STORAGE_KEY).matchedRide || null);
  const [otp, setOtp] = useState(() => loadPersisted(STORAGE_KEY).otp || null);
  const [rideDetails, setRideDetails] = useState(() => loadPersisted(STORAGE_KEY).rideDetails || null);
  const [verified, setVerified] = useState(() => loadPersisted(STORAGE_KEY).verified || false);
  const [college, setCollege] = useState(() => loadPersisted(STORAGE_KEY).college || null);
  const [pickup, setPickup] = useState(() => loadPersisted(STORAGE_KEY).pickup || null);
  const [fare, setFare] = useState(() => loadPersisted(STORAGE_KEY).fare || null);
  const [passengerPos, setPassengerPos] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewRideId, setReviewRideId] = useState(null);

  // === Rider state ===
  const [riderStep, setRiderStep] = useState(() => {
    const p = loadPersisted(RIDER_STORAGE_KEY);
    return (p.rideId && p.otp) ? 'confirmed' : 'pick';
  });
  const [riderCollege, setRiderCollege] = useState(() => loadPersisted(RIDER_STORAGE_KEY).selectedCollege || null);
  const [waitingPassengers, setWaitingPassengers] = useState([]);
  const [acceptedPassenger, setAcceptedPassenger] = useState(() => loadPersisted(RIDER_STORAGE_KEY).acceptedPassenger || null);
  const [riderRideId, setRiderRideId] = useState(() => loadPersisted(RIDER_STORAGE_KEY).rideId || null);
  const [riderOtp, setRiderOtp] = useState(() => loadPersisted(RIDER_STORAGE_KEY).otp || null);
  const [riderRideDetails, setRiderRideDetails] = useState(() => loadPersisted(RIDER_STORAGE_KEY).rideDetails || null);
  const [riderPickupPos, setRiderPickupPos] = useState(() => loadPersisted(RIDER_STORAGE_KEY).pickupPos || null);
  const [riderVerifyMsg, setRiderVerifyMsg] = useState('');
  const [riderPos, setRiderPos] = useState(null);

  // === Chat state ===
  const [chatMessages, setChatMessages] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const chatRideIdRef = useRef(null);

  // === Refs for stale closure safety ===
  const matchedRideRef = useRef(matchedRide);
  matchedRideRef.current = matchedRide;
  const riderRideIdRef = useRef(riderRideId);
  riderRideIdRef.current = riderRideId;
  const riderPosRef = useRef(null);
  const locWatcherRef = useRef(null);

  // === Persist passenger state ===
  useEffect(() => {
    if (matchedRide || college) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        matchedRide, otp, college, pickup, fare, verified, rideDetails,
      }));
    }
  }, [matchedRide, otp, college, pickup, fare, verified, rideDetails]);

  // === Persist rider state ===
  useEffect(() => {
    if (riderRideId && riderOtp) {
      sessionStorage.setItem(RIDER_STORAGE_KEY, JSON.stringify({
        selectedCollege: riderCollege, rideId: riderRideId, acceptedPassenger,
        otp: riderOtp, rideDetails: riderRideDetails, pickupPos: riderPickupPos,
      }));
    } else if (riderStep === 'pick') {
      sessionStorage.removeItem(RIDER_STORAGE_KEY);
    }
  }, [riderStep, riderCollege, riderRideId, acceptedPassenger, riderOtp, riderRideDetails, riderPickupPos]);

  function clearState() {
    setSearching(false);
    setMatchedRide(null);
    setOtp(null);
    setRideDetails(null);
    setVerified(false);
    setCollege(null);
    setPickup(null);
    setFare(null);
    setLastError(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function clearRiderState() {
    setRiderStep('pick');
    setRiderCollege(null);
    setWaitingPassengers([]);
    setAcceptedPassenger(null);
    setRiderRideId(null);
    setRiderOtp(null);
    setRiderRideDetails(null);
    setRiderPickupPos(null);
    setRiderVerifyMsg('');
    setRiderPos(null);
    sessionStorage.removeItem(RIDER_STORAGE_KEY);
  }

  // On mount, verify persisted match is still valid (passenger)
  useEffect(() => {
    if (!connected || !matchedRide) return;
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/rides/my-match`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!data.matched) {
          clearState();
        } else if (data.otp) {
          setOtp(data.otp);
          setVerified(data.verified);
        }
      } catch {}
    })();
  }, [connected]);

  // === Persistent socket listeners ===
  useEffect(() => {
    if (!connected) return;

    // --- Passenger listeners ---
    const unsubMatched = on('matched', (data) => {
      const otpVal = data?.otp || data?.ride?.otp;
      if (!data?.ride?._id || !otpVal) return;
      setSearching(false);
      setMatchedRide(data.ride._id);
      setOtp(otpVal);
      setRideDetails(data.ride);
      setChatMessages(prev => [...prev, {
        _id: 'sys',
        senderId: null,
        senderName: 'System',
        message: 'Ride confirmed! Chat with your rider here.',
        timestamp: new Date().toISOString(),
      }]);
    });

    const unsubVerified = on('passengerVerified', (data) => {
      setVerified(true);
      setRideDetails(prev => prev ? { ...prev, verified: true } : prev);
    });

    // --- Rider listeners ---
    const unsubWaiting = on('waitingPassengers', (requests) => {
      setWaitingPassengers(requests);
    });

    const unsubNewPassenger = on('newPassenger', (request) => {
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

    const unsubPassCancelled = on('passengerCancelled', (data) => {
      setWaitingPassengers(prev => prev.filter(p => p._id !== data.requestId));
    });

    const unsubPassAccepted = on('passengerAccepted', (data) => {
      setWaitingPassengers(prev => prev.filter(p => p._id !== data.requestId));
    });

    const unsubPassLoc = on('passengerLocation', (data) => {
      setRiderRideDetails(prev => {
        if (!prev) return prev;
        const passengers = [...(prev.passengers || [])];
        const idx = passengers.findIndex(p => (p.user?._id || p.user) === data.userId);
        if (idx >= 0) {
          passengers[idx] = { ...passengers[idx], location: { lat: data.lat, lng: data.lng } };
        }
        return { ...prev, passengers };
      });
    });

    // --- Shared listeners (check against both passenger and rider ride IDs) ---
    const unsubDeactivated = on('rideDeactivated', (data) => {
      const mr = matchedRideRef.current;
      const rr = riderRideIdRef.current;
      if ((mr && data.rideId === mr) || (rr && data.rideId === rr)) {
        if (mr && data.rideId === mr) clearState();
        if (rr && data.rideId === rr) clearRiderState();
      }
    });

    const unsubCompleted = on('rideCompleted', (data) => {
      const mr = matchedRideRef.current;
      const rr = riderRideIdRef.current;
      if ((mr && data.rideId === mr) || (rr && data.rideId === rr)) {
        if (data.showReview) {
          const target = data.driver || data.passenger;
          if (target) {
            setReviewTarget({ _id: target._id, name: target.name });
            setReviewRideId(data.rideId);
            setShowReview(true);
          }
        }
        if (mr && data.rideId === mr) clearState();
        if (rr && data.rideId === rr) clearRiderState();
      }
    });

    const unsubError = on('error', (data) => {
      setLastError(data.message || 'An error occurred');
    });

    // --- Chat ---
    const unsubNewMessage = on('newMessage', (data) => {
      setChatMessages(prev => [...prev, data]);
      const cr = chatRideIdRef.current;
      if (!cr || data.rideId !== cr) {
        setUnreadChatCount(prev => prev + 1);
      }
    });

    return () => {
      unsubMatched();
      unsubVerified();
      unsubWaiting();
      unsubNewPassenger();
      unsubPassCancelled();
      unsubPassAccepted();
      unsubPassLoc();
      unsubDeactivated();
      unsubCompleted();
      unsubError();
      unsubNewMessage();
    };
  }, [connected]);

  // === Geolocation watcher while passenger is matched ===
  useEffect(() => {
    if (!matchedRide || !navigator.geolocation) return;
    emit('joinRideRoom', matchedRide);
    locWatcherRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setPassengerPos({ lat, lng });
        emit('updateLocation', { rideId: matchedRide, lat, lng });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
    );
    return () => {
      if (locWatcherRef.current != null) {
        navigator.geolocation.clearWatch(locWatcherRef.current);
        locWatcherRef.current = null;
      }
    };
  }, [matchedRide]);

  // === Geolocation watcher while rider is in a ride ===
  useEffect(() => {
    if (!riderRideId || !riderOtp || !navigator.geolocation) return;
    emit('joinRideRoom', riderRideId);
    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setRiderPos({ lat, lng });
        emit('updateLocation', { rideId: riderRideId, lat, lng });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, [riderRideId, riderOtp]);

  // Reset on connection loss
  useEffect(() => {
    if (!connected) {
      if (matchedRideRef.current) {
        clearState();
        setPassengerPos(null);
      }
      if (riderRideIdRef.current) {
        clearRiderState();
      }
    }
  }, [connected]);

  const sendChatMessage = useCallback((rideId, message) => {
    if (!rideId || !message || !message.trim()) return;
    emit('sendMessage', { rideId, message: message.trim() });
  }, [emit]);

  const clearChat = useCallback(() => {
    setChatMessages([]);
    setUnreadChatCount(0);
    chatRideIdRef.current = null;
  }, []);

  // Reset chat when a new ride starts
  useEffect(() => {
    if (matchedRide || riderRideId) {
      setChatMessages([]);
      setUnreadChatCount(0);
    }
  }, [matchedRide, riderRideId]);

  // === Passenger actions ===
  const startRideRequest = useCallback((c, p, f) => {
    setCollege(c);
    setPickup(p);
    setFare(f);
    setSearching(true);
    setLastError(null);
    emit('requestRide', { college: c, pickup: p, fare: f });
  }, [emit]);

  const cancelRideRequest = useCallback(() => {
    emit('cancelRequest');
    clearState();
  }, [emit]);

  const retryRideRequest = useCallback(() => {
    if (college && pickup) {
      setLastError(null);
      setSearching(true);
      emit('requestRide', { college, pickup, fare });
    }
  }, [college, pickup, fare, emit]);

  const dismissReview = useCallback(() => {
    setShowReview(false);
    setReviewTarget(null);
    setReviewRideId(null);
  }, []);

  // === Rider actions ===
  const startFindRiders = useCallback((collegeId) => {
    let fallback = setTimeout(() => emit('findRiders', { collegeId }), 5000);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(fallback);
          const { latitude: lat, longitude: lng } = pos.coords;
          riderPosRef.current = { lat, lng };
          emit('findRiders', { collegeId, riderLat: lat, riderLng: lng });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [emit]);

  const stopFindRiders = useCallback((collegeId) => {
    emit('stopFindRiders', collegeId);
  }, [emit]);

  const setRiderCollegeAndSearch = useCallback((col) => {
    setRiderCollege(col);
    setRiderStep('searching');
    setWaitingPassengers([]);
    startFindRiders(col.id);
  }, [startFindRiders]);

  const riderAcceptRequest = useCallback((requestId, passengerData, passengerPickup) => {
    let cleanup;
    const unsubError = on('error', (data) => {
      setRiderVerifyMsg(data.message || 'Failed to accept request');
      if (cleanup) cleanup();
    });
    const unsubAccepted = on('requestAccepted', (data) => {
      setRiderRideId(data.ride._id);
      setAcceptedPassenger(passengerData);
      setRiderOtp(data.otp);
      setRiderRideDetails(data.ride);
      setRiderStep('confirmed');
      setChatMessages(prev => [...prev, {
        _id: 'sys',
        senderId: null,
        senderName: 'System',
        message: 'Ride confirmed! Chat with your passenger here.',
        timestamp: new Date().toISOString(),
      }]);
      const pickup = data.pickup || passengerPickup;
      if (pickup?.position) {
        setRiderPickupPos(pickup.position);
      }
      if (cleanup) cleanup();
    });
    cleanup = () => { unsubError(); unsubAccepted(); };
    emit('acceptRequest', requestId);
  }, [emit, on]);

  const riderClearVerifyMsg = useCallback(() => setRiderVerifyMsg(''), []);

  const riderMarkVerified = useCallback(() => {
    setRiderRideDetails(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        passengers: prev.passengers?.map(p => {
          const pid = p.user?._id || p.user;
          if (pid === acceptedPassenger?._id) return { ...p, verified: true };
          return p;
        }),
      };
    });
  }, [acceptedPassenger]);

  const riderEndRide = useCallback(() => clearRiderState(), []);

  return (
    <RideStateContext.Provider value={{
      // Passenger
      searching, matchedRide, otp, rideDetails, verified,
      college, pickup, fare, passengerPos, lastError,
      showReview, reviewTarget, reviewRideId,
      startRideRequest, cancelRideRequest, retryRideRequest, clearState,
      dismissReview,
      // Rider
      riderStep, riderCollege, waitingPassengers, acceptedPassenger,
      riderRideId, riderOtp, riderRideDetails, riderPickupPos,
      riderVerifyMsg, riderPos,
      setRiderCollegeAndSearch, stopFindRiders, riderAcceptRequest,
      riderClearVerifyMsg, riderMarkVerified, riderEndRide,
      setRiderVerifyMsg, clearRiderState, setRiderStep,
      setRiderCollege, setAcceptedPassenger, setRiderOtp, setRiderRideDetails,
      setRiderPickupPos, setRiderRideId,
      // Chat
      chatMessages, unreadChatCount, sendChatMessage, clearChat,
      setChatMessages, setUnreadChatCount, chatRideIdRef,
    }}>
      {children}
    </RideStateContext.Provider>
  );
}

export function useRideState() {
  return useContext(RideStateContext);
}
