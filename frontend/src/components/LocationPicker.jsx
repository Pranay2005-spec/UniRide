import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { motion } from 'framer-motion';

function LocationMarker({ position, onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
}

export default function LocationPicker({ onConfirm, onClose }) {
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMapClick = useCallback(async (pos) => {
    setPosition(pos);
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos[0]}&lon=${pos[1]}&addressdetails=1`,
        { headers: { 'User-Agent': 'UniRide/1.0' } }
      );
      const data = await res.json();
      setAddress(data.display_name || '');
    } catch {
      setAddress(`${pos[0].toFixed(4)}, ${pos[1].toFixed(4)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={onClose} className="text-gray-500">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <span className="font-semibold text-text">Pick your location</span>
          <div className="w-6" />
        </div>

        <div className="h-72 sm:h-96">
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
            <p className="text-sm text-gray-400 mb-3">Tap on the map to set your pickup</p>
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
