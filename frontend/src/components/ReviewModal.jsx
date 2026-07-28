import { useState } from 'react';
import { motion } from 'framer-motion';
import StarRating from './StarRating';
import { useAuth } from '../context/AuthContext';

export default function ReviewModal({ target, targetRole, rideId, onClose, onSubmit }) {
  const { token } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (rating === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetId: target._id, targetRole, rideId, rating, comment }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setTimeout(() => {
          onSubmit?.();
          onClose?.();
        }, 1500);
      } else {
        setError(data.error || 'Failed to submit review');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSkip() {
    onClose?.();
  }

  return (
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
        <div className="p-6 text-center">
          {submitted ? (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-lg font-bold text-text">Thank you!</p>
              <p className="text-sm text-gray-500 mt-1">Your review has been submitted.</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-3">
                {target?.profilePicture ? (
                  <img src={target.profilePicture} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="text-2xl font-bold text-text">{target?.name?.[0] || '?'}</span>
                )}
              </div>
              <p className="text-lg font-bold text-text">Rate your {targetRole === 'rider' ? 'rider' : 'passenger'}</p>
              <p className="text-sm text-gray-500 mt-1 mb-4">{target?.name || 'Unknown'}</p>

              <div className="flex justify-center mb-4">
                <StarRating value={rating} onChange={setRating} size="lg" />
              </div>

              {rating > 0 && (
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Share your experience (optional)..."
                  maxLength={500}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm text-text placeholder-gray-400 resize-none focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              )}

              {error && (
                <p className="text-sm text-red-500 mt-2">{error}</p>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleSkip}
                  className="flex-1 py-3 rounded-xl border-2 border-border text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={rating === 0 || submitting}
                  className="flex-1 py-3 rounded-xl bg-primary text-text font-semibold text-sm hover:bg-primary-400 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
