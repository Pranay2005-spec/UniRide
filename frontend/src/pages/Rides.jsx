import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Input from '../components/Input';
import RideCard from '../components/RideCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Rides() {
  const { token, user } = useAuth();
  const navState = useLocation().state;
  const college = navState?.college;

  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState(college?.name || '');
  const [searchRides, setSearchRides] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(!!college);

  const [tab, setTab] = useState('offer');
  const [offerForm, setOfferForm] = useState({
    pickup: '',
    destination: college?.name || '',
    time: '',
    seats: '',
    price: '',
  });
  const [offeredRides, setOfferedRides] = useState([]);
  const [joinedRides, setJoinedRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  function showToast(message, type = 'success') {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  }

  // Auto-detect location and pre-fill pickup
  useEffect(() => {
    if (college && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en`
            );
            const data = await res.json();
            const address = data.display_name?.split(',')?.slice(0, 2)?.join(',') || 'Current Location';
            setPickup(address);
            setOfferForm(prev => ({ ...prev, pickup: address }));
          } catch {
            setPickup('Current Location');
            setOfferForm(prev => ({ ...prev, pickup: 'Current Location' }));
          }
        },
        () => {
          // Location denied — user enters manually
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [college]);

  // Auto-search when college + pickup are set
  useEffect(() => {
    if (college && pickup) {
      handleSearch(pickup, college.name);
    }
  }, [pickup, college]);

  useEffect(() => {
    if (tab === 'offered') fetchOffered();
    if (tab === 'joined') fetchJoined();
  }, [tab]);

  async function handleSearch(from, to) {
    if (!from || !to) return;
    setSearching(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({ pickup: from, destination: to });
      const res = await fetch(`${API}/rides/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setSearchRides(data.rides);
    } catch {
      showToast('Failed to search rides', 'error');
    } finally {
      setSearching(false);
    }
  }

  async function fetchOffered() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/rides/offered`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setOfferedRides(data.rides);
    } catch {
      showToast('Failed to load rides', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchJoined() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/rides/joined`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setJoinedRides(data.rides);
    } catch {
      showToast('Failed to load rides', 'error');
    } finally {
      setLoading(false);
    }
  }

  const canVerify = user?.collegeName && user?.email;

  async function handleJoin(rideId) {
    if (!canVerify) {
      showToast('Verify your college account to book rides', 'warning');
      return;
    }
    try {
      const res = await fetch(`${API}/rides/${rideId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showToast('Ride booked successfully!');
        setSearchRides(prev => prev.filter(r => r._id !== rideId));
      } else {
        showToast(data.error || 'Failed to book ride', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  }

  function updateField(field, value) {
    setOfferForm(prev => ({ ...prev, [field]: value }));
  }

  async function handlePublish(e) {
    e.preventDefault();
    if (!canVerify) {
      showToast('Verify your college account to offer rides', 'warning');
      return;
    }
    if (!offerForm.pickup || !offerForm.destination || !offerForm.time || !offerForm.seats || !offerForm.price) {
      showToast('Please fill all fields', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/rides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...offerForm,
          date: new Date().toISOString().split('T')[0],
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Ride published successfully!');
        setOfferForm({ pickup: '', destination: '', time: '', seats: '', price: '' });
        setTab('offered');
      } else {
        showToast(data.error || 'Failed to publish ride', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-20">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold text-text">Rides</h1>
        <p className="text-sm text-gray-500">
          {college ? `Rides to ${college.short}` : 'Manage your rides'}
        </p>
      </div>

      <div className="px-4 space-y-4">
        {/* College search results */}
        {college && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="card space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text text-sm truncate">{college.short}</p>
                </div>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-3 w-2.5 h-2.5 rounded-full bg-primary" />
                <input
                  value={pickup}
                  onChange={e => setPickup(e.target.value)}
                  placeholder={pickup ? pickup : 'Your pickup location...'}
                  className="input-field pl-8 text-sm"
                />
              </div>
              <Button onClick={() => handleSearch(pickup, destination)} disabled={!pickup}>
                Search Rides
              </Button>
            </div>

            {searching ? (
              <LoadingSkeleton count={3} type="ride" />
            ) : searched && searchRides.length === 0 ? (
              <EmptyState
                title="No rides found"
                subtitle="Be the first — offer a ride to this college"
              />
            ) : searched ? (
              <div className="space-y-3">
                <h2 className="section-title">Available Rides ({searchRides.length})</h2>
                {searchRides.map(ride => (
                  <RideCard key={ride._id} ride={ride} onJoin={handleJoin} />
                ))}
              </div>
            ) : null}
          </motion.div>
        )}

        {/* Tab bar */}
        <div>
          <div className="flex bg-gray-100 rounded-xl p-1">
            {[
              { key: 'offer', label: 'Offer Ride' },
              { key: 'offered', label: 'My Offers' },
              { key: 'joined', label: 'Joined' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  tab === t.key ? 'bg-white text-primary shadow-sm' : 'text-gray-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Offer Ride Form */}
        {tab === 'offer' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="card">
              <h2 className="text-lg font-bold text-text mb-4">Offer a Ride</h2>
              <form onSubmit={handlePublish} className="space-y-3">
                <Input
                  label="Pickup Location"
                  value={offerForm.pickup}
                  onChange={e => updateField('pickup', e.target.value)}
                  placeholder="From where?"
                  required
                />
                <Input
                  label="Destination"
                  value={offerForm.destination}
                  onChange={e => updateField('destination', e.target.value)}
                  placeholder="Going to?"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Time"
                    type="time"
                    value={offerForm.time}
                    onChange={e => updateField('time', e.target.value)}
                    required
                  />
                  <Input
                    label="Seats"
                    type="number"
                    min="1"
                    value={offerForm.seats}
                    onChange={e => updateField('seats', e.target.value)}
                    placeholder="2"
                    required
                  />
                </div>
                <Input
                  label="Price (₹)"
                  type="number"
                  min="0"
                  value={offerForm.price}
                  onChange={e => updateField('price', e.target.value)}
                  placeholder="50"
                  required
                />
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Publishing...' : 'Publish Ride'}
                </Button>
              </form>
            </div>
          </motion.div>
        )}

        {/* My Offered Rides */}
        {tab === 'offered' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="section-title">My Offered Rides</h2>
            {loading ? (
              <LoadingSkeleton count={2} type="ride" />
            ) : offeredRides.length === 0 ? (
              <EmptyState
                title="No rides offered yet"
                subtitle="Offer your first ride to help fellow students"
              />
            ) : (
              <div className="space-y-3">
                {offeredRides.map(ride => (
                  <RideCard key={ride._id} ride={ride} type="offered" />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* My Joined Rides */}
        {tab === 'joined' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="section-title">My Joined Rides</h2>
            {loading ? (
              <LoadingSkeleton count={2} type="ride" />
            ) : joinedRides.length === 0 ? (
              <EmptyState
                title="No rides joined yet"
                subtitle="Search and book a ride from the Home tab"
              />
            ) : (
              <div className="space-y-3">
                {joinedRides.map(ride => (
                  <RideCard key={ride._id} ride={ride} type="joined" />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      <Toast {...toast} />
    </div>
  );
}
