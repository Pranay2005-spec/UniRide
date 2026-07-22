import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Welcome() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { sendOtp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (phone.length < 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await sendOtp(phone);
      if (res.success) {
        navigate('/otp', { state: { phone, otp: res.otp } });
      } else {
        setError(res.error || 'Something went wrong');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top section with illustration */}
      <div className="flex-1 flex flex-col items-center justify-end px-6 pb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          {/* Logo */}
          <div className="flex flex-col items-center gap-6 mb-2">
            <div className="w-32 h-32 md:w-40 md:h-40">
              <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-lg">
                <defs>
                  <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563EB"/>
                    <stop offset="100%" stopColor="#1D4ED8"/>
                  </linearGradient>
                </defs>
                <rect width="48" height="48" rx="12" fill="url(#shieldGrad)"/>
                <path d="M24 8L8 18v12l16 10 16-10V18L24 8z" fill="white" opacity="0.95"/>
                <path d="M24 14L14 20v8l10 6 10-6v-8L24 14z" fill="#2563EB"/>
                <circle cx="24" cy="24" r="3" fill="white"/>
              </svg>
            </div>
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl font-extrabold text-text tracking-tight">
                UniRide
              </h1>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl font-bold text-text mb-2">
            Affordable rides for students.
          </h2>
          <p className="text-gray-500 text-base leading-relaxed max-w-sm">
            Connect with verified students travelling on the same route.
          </p>
        </motion.div>
      </div>

      {/* Bottom section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="px-6 pb-10"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text/80 mb-1.5 block">
              Mobile Number
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text font-medium">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter your number"
                className="input-field pl-14 text-lg tracking-wider"
                maxLength={10}
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || phone.length < 10}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : 'Continue'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>

        <div className="mt-6 text-center space-y-2">
          <div>
            <span className="text-sm text-gray-400">Are you a rider? </span>
            <button
              type="button"
              onClick={() => navigate('/rider-login')}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Login here
            </button>
          </div>
          <div>
            <span className="text-sm text-gray-400">New rider? </span>
            <button
              type="button"
              onClick={() => navigate('/rider-signup')}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Sign up
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
