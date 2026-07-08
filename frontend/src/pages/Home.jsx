import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Toast from '../components/Toast';
import LocationPicker from '../components/LocationPicker';
import { useAuth } from '../context/AuthContext';
import { useSavedRoutes } from '../hooks/useSavedRoutes';
import colleges from '../data/solapurColleges';

const allColleges = colleges;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { routes, addRoute, removeRoute } = useSavedRoutes();

  const [pickup, setPickup] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [showCollegeSearch, setShowCollegeSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [showManageSaved, setShowManageSaved] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const isVerified = user?.collegeName && user?.email;

  useEffect(() => {
    if (!isVerified) {
      const timer = setTimeout(() => {
        showToastMsg(
          'Verify your college email & name to get student pricing',
          'warning'
        );
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const searchResults = query.trim()
    ? allColleges.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.short.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : allColleges.slice(0, 8);

  function showToastMsg(message, type = 'success') {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  }

  function handlePickupConfirm(location) {
    setPickup(location);
    setShowMap(false);
  }

  function handleCollegeSelect(college) {
    setSelectedCollege(college);
    setShowCollegeSearch(false);
    setQuery('');
  }

  function handleFindRides() {
    if (!pickup && !selectedCollege) {
      showToastMsg('Set both pickup and destination', 'error');
      return;
    }
    if (!pickup) {
      showToastMsg('Choose your pickup location', 'error');
      return;
    }
    if (!selectedCollege) {
      showToastMsg('Select a destination college', 'error');
      return;
    }
    setShowConfirm(true);
  }

  function handleConfirmRide() {
    setShowConfirm(false);
    navigate('/app/rides', {
      state: { college: selectedCollege, pickup }
    });
  }

  function handleSaveRoute() {
    if (!pickup || !selectedCollege) return;
    const saved = addRoute(pickup, selectedCollege);
    if (saved) {
      showToastMsg('Route saved!');
    } else {
      showToastMsg('Route already saved', 'warning');
    }
  }

  function handleSelectRoute(route) {
    setPickup(route.pickup);
    setSelectedCollege(route.college);
  }

  function calcDistance() {
    if (!pickup?.position || !selectedCollege?.lat || !selectedCollege?.lng) return null;
    const [lat1, lon1] = pickup.position;
    const lat2 = selectedCollege.lat;
    const lon2 = selectedCollege.lng;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  const distance = calcDistance();
  const bikePrice = distance ? Math.round(distance * 4 + 10) : null;
  const carPrice = distance ? Math.round(distance * 8 + 15) : null;

  return (
    <div className="pb-20 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
        {/* College building — top right */}
        <svg className="absolute top-4 right-4 w-64 h-64 text-primary-700/15" viewBox="0 0 200 200" fill="none">
          <rect x="25" y="75" width="150" height="105" rx="3" stroke="currentColor" strokeWidth="2" />
          <polygon points="100,15 15,75 185,75" stroke="currentColor" strokeWidth="2" fill="none" />
          <rect x="40" y="75" width="6" height="105" stroke="currentColor" strokeWidth="1.5" />
          <rect x="65" y="75" width="6" height="105" stroke="currentColor" strokeWidth="1.5" />
          <rect x="95" y="75" width="10" height="105" stroke="currentColor" strokeWidth="1.5" />
          <rect x="129" y="75" width="6" height="105" stroke="currentColor" strokeWidth="1.5" />
          <rect x="154" y="75" width="6" height="105" stroke="currentColor" strokeWidth="1.5" />
          <rect x="88" y="130" width="24" height="50" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <rect x="46" y="90" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="69" y="90" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="119" y="90" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="142" y="90" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="46" y="114" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="142" y="114" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>

        {/* Students — top right */}
        <svg className="absolute top-4 right-14 w-36 h-24 text-primary-700/15" viewBox="0 0 400 220" fill="currentColor">
          <circle cx="40" cy="16" r="9" /><rect x="26" y="28" width="28" height="32" rx="5" />
          <circle cx="130" cy="20" r="9" /><rect x="116" y="32" width="28" height="32" rx="5" />
          <circle cx="220" cy="14" r="9" /><rect x="206" y="26" width="28" height="32" rx="5" />
          <circle cx="310" cy="18" r="9" /><rect x="296" y="30" width="28" height="32" rx="5" />
        </svg>

        {/* Small graduation cap — top left */}
        <svg className="absolute top-20 left-4 w-16 h-16 text-primary-700/10" viewBox="0 0 100 100" fill="none">
          <polygon points="50,10 5,40 50,60 95,40" stroke="currentColor" strokeWidth="2" fill="none" />
          <polygon points="50,55 50,85 75,75 75,45" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="50" y1="85" x2="50" y2="95" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="30" y1="33" x2="30" y2="50" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
          <line x1="70" y1="33" x2="70" y2="50" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
      </div>

      {/* Header */}
      <div className="px-4 pt-4 pb-1 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-text">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-xs text-gray-500">Share the journey, save the cost</p>
          </div>
          <button
            onClick={() => navigate('/app/profile')}
            className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary font-bold text-sm"
          >
            {user?.name?.[0] || '?'}
          </button>
        </div>
      </div>

      {/* Pickup + Destination — Rapido style */}
      <div className="px-4 mb-4 relative z-10">
        <div className="bg-white rounded-2xl shadow-md border border-border overflow-hidden">
          {/* Pickup */}
          <button
            onClick={() => setShowMap(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-border/50"
          >
            <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div className="flex-1 min-w-0 text-left">
              {pickup ? (
                <div>
                  <p className="text-sm font-medium text-text">Pickup</p>
                  <p className="text-xs text-gray-500 truncate">{pickup.address}</p>
                </div>
              ) : (
                <span className="text-gray-400 text-sm">Choose pickup location</span>
              )}
            </div>
            {pickup && (
              <button
                onClick={(e) => { e.stopPropagation(); setPickup(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </button>

          {/* Destination / College search */}
          <button
            onClick={() => setShowCollegeSearch(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5"
          >
            <div className="w-8 h-8 rounded-full bg-success-50 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0 text-left">
              {selectedCollege ? (
                <div>
                  <p className="text-sm font-medium text-text">{selectedCollege.short}</p>
                  <p className="text-xs text-gray-500 truncate">{selectedCollege.name}</p>
                </div>
              ) : (
                <span className="text-gray-400 text-sm">Where to?</span>
              )}
            </div>
            {selectedCollege && (
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedCollege(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </button>
        </div>

        {/* Find Rides */}
        <button
          onClick={handleFindRides}
          className="w-full mt-3 bg-primary text-text font-semibold rounded-2xl py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Find Rides
        </button>

        {/* Save Route */}
        {pickup && selectedCollege && (
          <button
            onClick={handleSaveRoute}
            className="w-full mt-2 py-2.5 rounded-2xl border-2 border-dashed border-primary-500/40 text-primary-600 text-sm font-medium hover:bg-primary-50/50 transition-colors flex items-center justify-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            Save this Route
          </button>
        )}

      </div>

      {/* College search dropdown */}
      <AnimatePresence>
        {showCollegeSearch && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="px-4 mb-4 relative z-10"
          >
            <div className="bg-white rounded-2xl shadow-md border border-border overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => { setShowCollegeSearch(false); setQuery(''); }} className="text-gray-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search Solapur colleges..."
                  className="flex-1 text-base text-text placeholder-gray-400 bg-transparent outline-none border-none"
                  autoFocus
                />
              </div>
              {searchResults.length > 0 && (
                <div className="border-t border-border max-h-60 overflow-y-auto">
                  {searchResults.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleCollegeSelect(c)}
                      className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors border-b border-border/50 last:border-0 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text text-sm">{c.short}</p>
                        <p className="text-xs text-gray-400 truncate">{c.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Routes */}
      <div className="px-4 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-text">Saved Routes</h2>
          <div className="flex items-center gap-2">
            {routes.length > 0 && (
              <span className="text-xs text-gray-400">{routes.length} routes</span>
            )}
            {routes.length > 0 && (
              <button
                onClick={() => setShowManageSaved(true)}
                className="text-xs font-semibold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full"
              >
                Manage
              </button>
            )}
          </div>
        </div>

        {routes.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl py-10 px-6 text-center border border-dashed border-gray-200">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 mb-3">Save your daily pickup & drop spots for quick booking.</p>
            <button
              onClick={() => setShowManageSaved(true)}
              className="px-6 py-2.5 bg-primary text-text text-sm font-semibold rounded-xl"
            >
              Manage Routes
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {routes.map(route => (
              <motion.div
                key={route.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => handleSelectRoute(route)}
                  className="w-full text-left p-4 flex items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500">
                      <polyline points="17 2 12 7 7 2" /><path d="M12 7v14" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text">{route.college.short}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{route.pickup.address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary-500">Go</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>
                <div className="border-t border-border/50 px-4 py-2 flex items-center justify-between bg-gray-50/50">
                  <button
                    onClick={() => navigate('/app/rides', {
                      state: { college: route.college, pickup: route.pickup }
                    })}
                    className="text-xs font-medium text-primary-600"
                  >
                    Find Rides
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeRoute(route.id); showToastMsg('Route removed'); }}
                    className="text-xs text-red-500 font-medium flex items-center gap-1"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#EF4444" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    Remove
                  </button>
                </div>
              </motion.div>
            ))}
            <button
              onClick={() => setShowManageSaved(true)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-500 text-sm font-medium hover:border-primary-500/30 hover:text-primary-600 transition-colors"
            >
              + Add saved route
            </button>
          </div>
        )}
      </div>

      {/* Manage Routes modal */}
      <AnimatePresence>
        {showManageSaved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-border shrink-0">
                <button onClick={() => setShowManageSaved(false)} className="text-gray-500">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                <span className="font-semibold text-text">Saved Routes</span>
                <div className="w-6" />
              </div>
              <div className="overflow-y-auto flex-1">
                {routes.length === 0 ? (
                  <div className="py-16 px-6 text-center">
                    <p className="text-sm text-gray-400">No saved routes yet.</p>
                    <p className="text-xs text-gray-300 mt-1">Set your pickup and destination, then save the route.</p>
                  </div>
                ) : (
                  routes.map(route => (
                    <div
                      key={route.id}
                      className="flex items-center gap-3 px-4 py-3.5 border-b border-border/30"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500">
                          <polyline points="17 2 12 7 7 2" /><path d="M12 7v14" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text text-sm">{route.college.short}</p>
                        <p className="text-xs text-gray-400 truncate">{route.pickup.address}</p>
                      </div>
                      <button
                        onClick={() => { removeRoute(route.id); showToastMsg('Route removed'); }}
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ride confirmation */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-600">
                    <circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" /><path d="M10 17h4l3-7-4-2-3 4h-4" /><line x1="6" y1="11" x2="10" y2="11" />
                  </svg>
                </div>

                <h2 className="text-lg font-bold text-text text-center">Confirm Bike Ride</h2>
                <p className="text-xs text-gray-400 text-center mt-1">Review your ride details below</p>

                <div className="mt-5 space-y-3">
                  <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3.5">
                    <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pickup</p>
                      <p className="text-sm text-text mt-0.5 line-clamp-2">{pickup?.address}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3.5">
                    <div className="w-8 h-8 rounded-full bg-success-50 flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Destination</p>
                      <p className="text-sm text-text mt-0.5">{selectedCollege?.short} — {selectedCollege?.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-primary-50/50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-600">
                        <circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" /><path d="M10 17h4l3-7-4-2-3 4h-4" /><line x1="6" y1="11" x2="10" y2="11" />
                      </svg>
                      <span className="text-sm font-medium text-text">Bike fare</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-gray-400">{distance < 1 ? `${(distance * 1000).toFixed(0)} m` : `${distance.toFixed(1)} km`}</span>
                      <span className="text-base font-bold text-text">₹{bikePrice}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <button
                    onClick={handleConfirmRide}
                    className="w-full bg-primary text-text font-semibold rounded-2xl py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" /><path d="M10 17h4l3-7-4-2-3 4h-4" /><line x1="6" y1="11" x2="10" y2="11" />
                    </svg>
                    Confirm Ride
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="w-full py-3 text-sm font-medium text-gray-500 hover:text-text transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map picker modal */}
      <AnimatePresence>
        {showMap && (
          <LocationPicker onConfirm={handlePickupConfirm} onClose={() => setShowMap(false)} />
        )}
      </AnimatePresence>

      <Toast {...toast} />
    </div>
  );
}
