import { motion } from 'framer-motion';

export default function RideCard({ ride, type = 'available', onJoin, onAction }) {
  const date = new Date(ride.date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  const statusColors = {
    active: 'bg-success/10 text-success',
    completed: 'bg-gray-100 text-gray-500',
    cancelled: 'bg-red-50 text-red-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card space-y-3"
    >
      {/* Driver info for available rides */}
      {type === 'available' && ride.driver && (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary font-bold text-sm">
            {ride.driver.name?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-text text-sm">{ride.driver.name || 'Driver'}</p>
            {ride.driver.collegeName && (
              <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 bg-primary-50 text-primary text-xs font-medium rounded-md">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                {ride.driver.collegeName}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Route */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1 pt-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <div className="w-0.5 h-8 bg-border" />
            <div className="w-2.5 h-2.5 rounded-full bg-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-text text-sm truncate">{ride.pickup}</p>
            <p className="font-medium text-text text-sm truncate mt-4">{ride.destination}</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3 text-gray-500">
          <span>{date}</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span>{ride.time}</span>
        </div>
        {type === 'available' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{ride.seats - (ride.passengers?.length || 0)} seats</span>
            <span className="text-base font-bold text-primary">₹{ride.price}</span>
          </div>
        )}
      </div>

      {/* Status badge for offered/joined rides */}
      {type !== 'available' && (
        <div className="flex items-center justify-between">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[ride.status] || statusColors.active}`}>
            {ride.status?.charAt(0).toUpperCase() + ride.status?.slice(1)}
          </span>
          <span className="text-base font-bold text-primary">₹{ride.price}</span>
        </div>
      )}

      {/* Action */}
      {type === 'available' && onJoin && (
        <button
          onClick={() => onJoin(ride._id)}
          className="w-full py-2.5 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary-700 transition-colors"
        >
          Book Ride
        </button>
      )}
      {type !== 'available' && onAction && (
        <button
          onClick={() => onAction(ride._id)}
          className="w-full py-2.5 border border-border text-text font-medium rounded-xl text-sm hover:bg-gray-50 transition-colors"
        >
          View Details
        </button>
      )}
    </motion.div>
  );
}
