import { useState, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function useCurrentLocation() {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const getLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        setError('Geolocation not supported');
        reject(new Error('Geolocation not supported'));
        return;
      }
      setLocating(true);
      setError('');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false);
          resolve([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          setLocating(false);
          const msg = err.code === 1 ? 'Location permission denied' : 'Could not get location';
          setError(msg);
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  return { getLocation, locating, error };
}

function LocationMarker({ position, onMapClick }) {
  const map = useMapEvents({
    click(e) {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom(), { duration: 0.5 });
    }
  }, [position]);
  return position ? <Marker position={position} /> : null;
}

const searchCache = new Map();

async function reverseViaProxy(lat, lon) {
  const res = await fetch(`${API}/geo/reverse?lat=${lat}&lon=${lon}`);
  if (!res.ok) return null;
  return res.json();
}

async function detectCity() {
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        p => resolve([p.coords.latitude, p.coords.longitude]),
        reject,
        { enableHighAccuracy: false, timeout: 5000 }
      );
    });
    const data = await reverseViaProxy(pos[0], pos[1]);
    if (data?.address) {
      const a = data.address;
      return {
        city: a.city || a.town || a.village || a.county || '',
        state: a.state || '',
        country: a.country || '',
      };
    }
  } catch {}
  return null;
}

export default function LocationPicker({ onConfirm, onClose }) {
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { getLocation, locating, error: geoError } = useCurrentLocation();
  const searchTimer = useRef(null);
  const userCity = useRef(null);

  useEffect(() => {
    detectCity().then(loc => { userCity.current = loc; });
  }, []);

  async function handleSearch(query) {
    if (query.trim().length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const cached = searchCache.get(query);
    if (cached) {
      setSearchResults(cached);
      setShowResults(cached.length > 0);
      return;
    }

    setSearching(true);
    try {
      const params = new URLSearchParams({ q: query });
      const loc = userCity.current;
      if (loc?.city) params.set('city', loc.city);
      if (loc?.state) params.set('state', loc.state);
      if (loc?.country) params.set('country', loc.country);
      const res = await fetch(`${API}/geo/search?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      searchCache.set(query, data);
      setSearchResults(data);
      setShowResults(data.length > 0);
    } catch {
    } finally {
      setSearching(false);
    }
  }

  function handleSearchInput(e) {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const cached = searchCache.get(val);
    if (cached) {
      setSearchResults(cached);
      setShowResults(cached.length > 0);
      clearTimeout(searchTimer.current);
      return;
    }

    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => handleSearch(val), 400);
  }

  function selectSearchResult(result) {
    setPosition([parseFloat(result.lat), parseFloat(result.lon)]);
    setAddress(result.display_name);
    setSearchQuery(result.display_name.split(',')[0]);
    setShowResults(false);
  }

  async function reverseGeocode(pos, saveCity = false) {
    setLoading(true);
    try {
      const data = await reverseViaProxy(pos[0], pos[1]);
      setAddress(data?.display_name || `${pos[0].toFixed(4)}, ${pos[1].toFixed(4)}`);
      if (saveCity && data?.address) {
        const a = data.address;
        userCity.current = {
          city: a.city || a.town || a.village || a.county || '',
          state: a.state || '',
          country: a.country || '',
        };
      }
    } catch {
      setAddress(`${pos[0].toFixed(4)}, ${pos[1].toFixed(4)}`);
    } finally {
      setLoading(false);
    }
  }

  const handleMapClick = useCallback(async (pos) => {
    setPosition(pos);
    reverseGeocode(pos);
  }, []);

  async function handleUseCurrentLocation() {
    try {
      const pos = await getLocation();
      setPosition(pos);
      reverseGeocode(pos, true);
    } catch {
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 rounded-t-2xl">
          <button onClick={onClose} className="text-gray-500">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <span className="font-semibold text-text">Pick your location</span>
          <div className="w-6" />
        </div>

        {geoError && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-100">
            <p className="text-xs text-red-600">{geoError}</p>
          </div>
        )}

        <div className="px-4 pt-3 space-y-2">
          {/* Search */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={searchQuery}
                onChange={handleSearchInput}
                placeholder="Search area, street, landmark..."
                className="flex-1 text-sm bg-transparent outline-none border-none text-text placeholder-gray-400"
              />
              {searching && (
                <svg className="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>
            <AnimatePresence>
              {showResults && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-border max-h-48 overflow-y-auto z-20"
                >
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => selectSearchResult(r)}
                      className="w-full text-left px-3 py-2.5 hover:bg-primary-50 border-b border-border/30 last:border-0"
                    >
                      <p className="text-sm font-medium text-text truncate">{r.display_name}</p>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-50 text-primary-700 font-medium text-sm hover:bg-primary-100 transition-colors disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {locating ? (
                <circle cx="12" cy="12" r="10" strokeDasharray="30 10" className="animate-spin" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
                </>
              )}
            </svg>
            {locating ? 'Getting location...' : 'Use current location'}
          </button>
        </div>

        <div className="h-64 sm:h-80 mt-3">
          <MapContainer center={[17.6599, 75.9064]} zoom={13} className="h-full w-full" zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker position={position} onMapClick={handleMapClick} />
          </MapContainer>
        </div>

        <div className="p-4 border-t border-border">
          {position ? (
            <div className="mb-3">
              <p className="text-sm font-medium text-text">Selected location</p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {loading ? 'Getting address...' : address}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {position[0].toFixed(4)}, {position[1].toFixed(4)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-3">Tap on the map or use current location</p>
          )}
          <button
            onClick={() => position && onConfirm({ position, address: address || `${position[0].toFixed(4)}, ${position[1].toFixed(4)}` })}
            disabled={!position}
            className="btn-primary disabled:opacity-40"
          >
            Confirm Pickup Location
          </button>
        </div>
      </div>
    </motion.div>
  );
}
