import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import colleges from '../data/solapurColleges';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function OfferRide() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [pickup, setPickup] = useState('');
  const [routeStops, setRouteStops] = useState([]);
  const [showCollegeSearch, setShowCollegeSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const searchResults = query.trim()
    ? colleges.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.short.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  function addStop(college) {
    if (routeStops.find(s => s.college.id === college.id)) return;
    setRouteStops(prev => [...prev, { college, order: prev.length }]);
    setShowCollegeSearch(false);
    setQuery('');
  }

  function removeStop(id) {
    setRouteStops(prev => prev.filter(s => s.college.id !== id).map((s, i) => ({ ...s, order: i })));
  }

  function moveStopUp(index) {
    if (index === 0) return;
    const updated = [...routeStops];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setRouteStops(updated.map((s, i) => ({ ...s, order: i })));
  }

  function moveStopDown(index) {
    if (index === routeStops.length - 1) return;
    const updated = [...routeStops];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setRouteStops(updated.map((s, i) => ({ ...s, order: i })));
  }

  async function handlePublish(e) {
    e.preventDefault();
    if (!pickup || routeStops.length === 0 || !time) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/rides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pickup,
          route: routeStops.map(s => ({
            college: {
              id: s.college.id,
              name: s.college.name,
              short: s.college.short,
              lat: s.college.lat,
              lng: s.college.lng,
            },
            order: s.order,
          })),
          date: new Date().toISOString().split('T')[0],
          time,
        }),
      });
      const data = await res.json();
      if (data.success) {
        navigate('/app/rider-dashboard');
      }
    } catch {} finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-20 px-4 pt-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/app/rides')} className="text-gray-500">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <h1 className="text-xl font-bold text-text">Offer a Ride</h1>
      </div>

      <form onSubmit={handlePublish} className="space-y-4">
        {/* Pickup */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Your Starting Point</label>
          <input
            value={pickup}
            onChange={e => setPickup(e.target.value)}
            placeholder="Where will you start?"
            className="input-field text-sm"
            required
          />
        </div>

        {/* Route Stops */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Colleges on Your Route</label>
          <div className="space-y-2 mb-2">
            {routeStops.length === 0 && (
              <p className="text-xs text-gray-400 italic">Add colleges you pass through along the way</p>
            )}
            {routeStops.map((stop, i) => (
              <div key={stop.college.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                <div className="w-6 h-6 rounded-full bg-primary text-xs font-bold flex items-center justify-center text-text shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{stop.college.short}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveStopUp(i)} disabled={i === 0} className="p-1 text-gray-400 hover:text-text disabled:opacity-30">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
                  </button>
                  <button type="button" onClick={() => moveStopDown(i)} disabled={i === routeStops.length - 1} className="p-1 text-gray-400 hover:text-text disabled:opacity-30">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                  <button type="button" onClick={() => removeStop(stop.college.id)} className="p-1 text-red-400 hover:text-red-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowCollegeSearch(true)}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-primary-500/40 text-primary-600 text-sm font-medium hover:bg-primary-50/50 transition-colors"
          >
            + Add College Stop
          </button>
        </div>

        {/* College search dropdown */}
        <AnimatePresence>
          {showCollegeSearch && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white rounded-2xl border border-border shadow-md overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                <button type="button" onClick={() => { setShowCollegeSearch(false); setQuery(''); }} className="text-gray-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search colleges..."
                  className="flex-1 text-sm text-text placeholder-gray-400 bg-transparent outline-none"
                  autoFocus
                />
              </div>
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto">
                  {searchResults.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => addStop(c)}
                      className="w-full text-left px-3 py-2.5 hover:bg-primary-50 transition-colors border-b border-border/50 last:border-0 flex items-center gap-2.5"
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
        </AnimatePresence>

        {/* Time */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Departure Time</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} className="input-field text-sm" required />
        </div>

        <button type="submit" disabled={submitting || routeStops.length === 0} className="btn-primary">
          {submitting ? 'Publishing...' : 'Start Ride'}
        </button>
      </form>
    </div>
  );
}
