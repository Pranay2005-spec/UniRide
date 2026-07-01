import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from './Button';

export default function SearchCard({ onSearch }) {
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!pickup || !destination) return;
    onSearch({ pickup, destination });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card space-y-4"
    >
      <h2 className="text-lg font-bold text-text">Find a Ride</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <div className="absolute left-3 top-3 w-2.5 h-2.5 rounded-full bg-primary" />
          <input
            value={pickup}
            onChange={e => setPickup(e.target.value)}
            placeholder="Pickup location"
            className="input-field pl-8"
            required
          />
        </div>
        <div className="relative">
          <div className="absolute left-3 top-3 w-2.5 h-2.5 rounded-full bg-success" />
          <input
            value={destination}
            onChange={e => setDestination(e.target.value)}
            placeholder="Destination"
            className="input-field pl-8"
            required
          />
        </div>
        <Button type="submit" disabled={!pickup || !destination}>
          Find Ride
        </Button>
      </form>
    </motion.div>
  );
}
