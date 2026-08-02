import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const PAGE_SIZE = 5;

export default function MyRides() {
  const { token, role } = useAuth();
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    fetch(`${API}/rides/history`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(data => {
      if (data.success) setRides(data.rides);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const avatarColors = ['bg-rose-100 text-rose-600', 'bg-sky-100 text-sky-600', 'bg-amber-100 text-amber-600', 'bg-emerald-100 text-emerald-600', 'bg-violet-100 text-violet-600', 'bg-cyan-100 text-cyan-600'];

  function formatDate(d) {
    const date = new Date(d);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return { label: 'Today', color: 'text-emerald-600 bg-emerald-50' };
    if (date.toDateString() === yesterday.toDateString()) return { label: 'Yesterday', color: 'text-amber-600 bg-amber-50' };
    return { label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), color: 'text-gray-500 bg-gray-100' };
  }

  function formatTime(d) {
    return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  const visibleRides = rides.slice(0, visibleCount);
  const hasMore = visibleCount < rides.length;

  return (
    <div className="pb-20 min-h-screen bg-gray-50/50">
      <div className="bg-white px-4 pt-4 pb-4 shadow-sm border-b border-border/50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 hover:bg-gray-200 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-text">My Rides</h1>
        </div>
      </div>

      <div className="px-4 mt-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-32 animate-pulse border border-border/50" />
            ))}
          </div>
        ) : rides.length === 0 ? (
          <div className="mt-8">
            <div className="bg-white rounded-3xl py-16 px-6 text-center border border-border/50 shadow-sm">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center mx-auto mb-5 shadow-sm">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#292928" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" /><path d="M10 17h4l3-7-4-2-3 4h-4" /><line x1="6" y1="11" x2="10" y2="11" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-text mb-1.5">No rides yet</h3>
              <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">Your ride history will appear here once you take a ride.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Last 7 days · {rides.length} ride{rides.length > 1 ? 's' : ''}</p>
            </div>

            <AnimatePresence>
              {visibleRides.map((ride, i) => {
                const other = role === 'rider'
                  ? ride.passengers?.[0]?.user
                  : ride.driver;
                const otherName = other?.name || 'Unknown';
                const otherRating = other?.avgRating || 0;
                const pickup = ride.pickup || '—';
                const drop = ride.route?.[0]?.college?.name || ride.destination || '—';
                const dateInfo = formatDate(ride.updatedAt);
                const avatarClass = avatarColors[i % avatarColors.length];
                const roleLabel = role === 'rider' ? 'Passenger' : 'Driver';

                return (
                  <motion.div
                    key={ride._id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-full ${avatarClass} flex items-center justify-center text-sm font-bold shrink-0 shadow-sm`}>
                            {otherName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-text">{otherName}</p>
                              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{roleLabel}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex items-center gap-1">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="#c3f832" stroke="#c3f832" strokeWidth="2">
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                <span className="text-xs font-medium text-gray-500">{otherRating > 0 ? otherRating.toFixed(1) : 'New'}</span>
                              </div>
                              {ride.rideCode && (
                                <span className="text-[10px] font-mono font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{ride.rideCode}</span>
                              )}
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ride.paymentMethod === 'online' ? 'text-sky-600 bg-sky-50' : 'text-amber-600 bg-amber-50'}`}>
                                {ride.paymentMethod === 'online' ? 'UPI' : 'Cash'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold text-text">₹{ride.price || 0}</p>
                          <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${dateInfo.color}`}>
                            {dateInfo.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                        <div className="flex flex-col items-center gap-0.5 mt-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                          <div className="w-0.5 h-7 bg-gray-300" />
                          <div className="w-2 h-2 rounded-full bg-gray-400 ring-2 ring-gray-100" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-3">
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Pickup</p>
                            <p className="text-sm font-medium text-text truncate">{pickup}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Drop</p>
                            <p className="text-sm text-gray-500 truncate">{drop}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 pt-1">
                          <p className="text-[10px] text-gray-400 font-medium">{formatTime(ride.updatedAt)}</p>
                          <div className="mt-1.5 flex items-center gap-1 justify-end">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            <span className="text-[10px] font-semibold text-emerald-600">Completed</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {hasMore && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setVisibleCount(c => Math.min(c + PAGE_SIZE, rides.length))}
                className="w-full py-3.5 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-500 hover:border-primary hover:text-primary hover:bg-primary-50/30 transition-all flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                Show more ({rides.length - visibleCount} remaining)
              </motion.button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
