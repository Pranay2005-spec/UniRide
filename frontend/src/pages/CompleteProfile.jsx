import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function CompleteProfile() {
  const { completeProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('name', name.trim());

      const res = await completeProfile(fd);
      if (res.success) {
        navigate('/app/home');
      } else {
        setError(res.error || 'Failed to save profile');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col px-6">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
              <path d="M24 4L4 14v20l20 10 20-10V14L24 4z" fill="white" opacity="0.9" />
              <path d="M24 12L12 18v12l12 6 12-6V18L24 12z" fill="#2563EB" />
              <circle cx="24" cy="24" r="4" fill="white" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-text mb-1">Welcome to UniRide!</h1>
          <p className="text-gray-500 text-sm mb-8">Tell us your name to get started</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text/80 mb-1.5 block">Your Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="John Doe"
                className="input-field text-center text-lg"
                autoFocus
                required
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : "Let's Go!"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
