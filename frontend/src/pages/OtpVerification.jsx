import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import OtpInput from '../components/OtpInput';
import { useAuth } from '../context/AuthContext';

export default function OtpVerification() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtp } = useAuth();
  const phone = location.state?.phone || '';
  const devOtp = location.state?.otp || '';

  const [otp, setOtp] = useState(devOtp);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!phone) {
    navigate('/');
    return null;
  }

  async function handleVerify() {
    if (otp.length < 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await verifyOtp(phone, otp);
      if (res.success) {
        if (res.isNewUser) {
          navigate('/complete-profile');
        } else {
          navigate('/app/home');
        }
      } else {
        setError(res.error || 'Invalid OTP');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    setOtp('');
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-white flex flex-col px-6">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <button onClick={() => navigate(-1)} className="mb-8 text-gray-400 hover:text-text transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>

          <h1 className="text-2xl font-bold text-text mb-1">Verify Your Number</h1>
          <p className="text-gray-500 text-sm mb-8">
            Enter the 6-digit code sent to <span className="font-medium text-text">+91 {phone}</span>
          </p>

          {devOtp && (
            <div className="bg-gray-100 rounded-xl px-4 py-2.5 text-center mb-4">
              <span className="text-xs text-gray-500">Dev OTP: </span>
              <span className="text-lg font-bold text-primary tracking-widest">{devOtp}</span>
            </div>
          )}
          <OtpInput length={6} onChange={setOtp} />

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-sm text-center mt-4"
            >
              {error}
            </motion.p>
          )}

          <button
            onClick={handleVerify}
            disabled={loading || otp.length < 6}
            className="btn-primary mt-8 flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : 'Verify'}
          </button>

          <p className="text-center mt-6 text-sm text-gray-500">
            Didn't receive the code?{' '}
            <button onClick={handleResend} className="text-primary font-semibold hover:underline">
              Resend OTP
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
