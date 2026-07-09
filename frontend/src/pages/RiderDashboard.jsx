import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function RiderDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [offeredRides, setOfferedRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffered();
  }, []);

  async function fetchOffered() {
    try {
      const res = await fetch(`${API}/rides/offered`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setOfferedRides(data.rides);
    } catch {} finally {
      setLoading(false);
    }
  }

  const activeRide = offeredRides.find(r => r.active);
  const pendingRides = offeredRides.filter(r => !r.active && r.status === 'active');
  const pastRides = offeredRides.filter(r => r.status === 'completed' || r.status === 'cancelled');

  return (
    <div className="pb-20 px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-text">Rider Dashboard</h1>
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-text font-bold text-sm">
          {user?.name?.[0] || '?'}
        </div>
      </div>

      {/* Active ride banner */}
      {activeRide ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/20 border-2 border-primary rounded-2xl p-4 mb-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-bold text-text">Ride Active</span>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            {activeRide.pickup} → {activeRide.route?.[activeRide.route.length - 1]?.college?.short || activeRide.destination}
          </p>
          <div className="space-y-1.5 mb-3">
            {activeRide.route?.map((stop, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${i <= activeRide.currentStop ? 'bg-primary' : 'bg-gray-300'}`} />
                <span className={`${i <= activeRide.currentStop ? 'text-text font-medium' : 'text-gray-400'}`}>
                  {stop.college.short}
                </span>
                {i === activeRide.currentStop && (
                  <span className="text-[10px] bg-primary text-text px-1.5 py-0.5 rounded-full font-medium">Current</span>
                )}
                {i < activeRide.currentStop && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/app/offer-ride')}
              className="flex-1 py-2.5 rounded-xl bg-primary text-text font-semibold text-sm"
            >
              Manage Ride
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5 mb-4 border border-primary/20"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#292928" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-text">Start Driving</h2>
              <p className="text-xs text-gray-500">Offer a ride and help students reach college</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/app/offer-ride')}
            className="w-full py-3 rounded-xl bg-primary text-text font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Offer a Ride
          </button>
        </motion.div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Active', value: offeredRides.filter(r => r.active).length, color: 'text-primary' },
          { label: 'Pending', value: pendingRides.length, color: 'text-orange-500' },
          { label: 'Completed', value: pastRides.filter(r => r.status === 'completed').length, color: 'text-green-600' },
        ].map(stat => (
          <div key={stat.label} className="card text-center py-4">
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Pending rides */}
      {pendingRides.length > 0 && (
        <div className="mb-4">
          <h2 className="section-title">Pending Rides</h2>
          <div className="space-y-3">
            {pendingRides.map(ride => (
              <div key={ride._id} className="card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div className="w-0.5 h-5 bg-gray-300" />
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{ride.pickup}</p>
                    <p className="text-xs text-gray-400">{ride.route?.[ride.route.length - 1]?.college?.short || ride.destination}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-text">₹{ride.price}</p>
                    <p className="text-xs text-gray-400">{ride.seats - ride.passengers.length} seats</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    fetch(`${API}/rides/${ride._id}/start`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                    }).then(() => fetchOffered());
                  }}
                  className="w-full py-2.5 rounded-xl bg-primary text-text font-semibold text-sm hover:bg-primary-400 transition-colors"
                >
                  Start Ride
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past rides */}
      {pastRides.length > 0 && (
        <div>
          <h2 className="section-title">Past Rides</h2>
          <div className="space-y-2">
            {pastRides.slice(0, 5).map(ride => (
              <div key={ride._id} className="card !py-3 !px-3.5 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  ride.status === 'completed' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ride.status === 'completed' ? '#22C55E' : '#EF4444'} strokeWidth="2.5">
                    {ride.status === 'completed'
                      ? <polyline points="20 6 9 17 4 12" />
                      : <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                    }
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{ride.pickup} → {ride.route?.[ride.route.length - 1]?.college?.short || ride.destination}</p>
                  <p className="text-xs text-gray-400">{new Date(ride.date).toLocaleDateString()} • {ride.passengers.length} passenger{ride.passengers.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && offeredRides.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">No rides offered yet</p>
          <p className="text-xs text-gray-300 mt-1">Offer your first ride to start earning</p>
        </div>
      )}
    </div>
  );
}
