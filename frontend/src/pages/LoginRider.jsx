import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function LoginRider() {
  const { role, setUser, setToken, setRole } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const targetLabel = 'Rider';

  function showToastMsg(message, type = 'success') {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (phone.length < 10) { setError('Enter a valid 10-digit phone number'); return; }
    if (!password) { setError('Enter your password'); return; }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/auth/login-rider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();

      if (data.success) {
        setToken(data.token);
        sessionStorage.setItem('token', data.token);
        setUser(data.user);
        const newRole = data.user.role || targetLabel.toLowerCase();
        setRole(newRole);
        sessionStorage.setItem('role', newRole);
        showToastMsg(`Logged in as ${targetLabel}!`);
        setTimeout(() => navigate('/app/profile'), 1000);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pb-20 min-h-screen bg-white">
      {/* Top brand section */}
      <div className="bg-gradient-to-b from-primary-100 to-primary-50 px-5 pt-12 pb-20 rounded-b-[2rem]">
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-white/60 backdrop-blur flex items-center justify-center shadow-sm mb-8">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center mx-auto mb-4">
            <svg width="30" height="30" viewBox="0 0 48 48" fill="none">
              <path d="M24 8L8 20v12l16 10 16-10V20L24 8z" fill="#292928" opacity="0.9" />
              <circle cx="24" cy="24" r="4" fill="#c3f832" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-text tracking-tight">UniRide</h1>
          <p className="text-sm text-text/60 mt-2 max-w-xs mx-auto leading-relaxed">
            Share the journey, save the cost. Connect with verified students travelling on the same route.
          </p>
        </motion.div>
      </div>

      {/* Form card */}
      <div className="px-4 -mt-14">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-border overflow-hidden"
        >
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#292928" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-text">Welcome back!</h2>
              <p className="text-xs text-gray-500 mt-1">
                Login to your rider account to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text font-medium text-sm z-10">+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter your mobile number"
                    className="input-field !pl-14 !py-3 !text-sm tracking-wider"
                    maxLength={10}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field !py-3 !text-sm"
                />
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-xs text-center">
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={loading || phone.length < 10 || !password}
                className="btn-primary !py-3.5 !text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : `Login as ${targetLabel}`}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-border text-center">
              <p className="text-sm text-gray-500">Don't have a rider account?</p>
              <Link to="/app/create-rider-account" className="mt-1 inline-block text-sm font-semibold text-primary hover:underline">
                Create one here
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      <Toast {...toast} />
    </div>
  );
}
