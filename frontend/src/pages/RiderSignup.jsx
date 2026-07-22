import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function RiderSignup() {
  const navigate = useNavigate();

  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [docType, setDocType] = useState('aadhaar');
  const [docNumber, setDocNumber] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSendOtp() {
    if (phone.length < 10) { setError('Enter a valid 10-digit phone number'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.success) setStep('otp');
      else setError(data.error || 'Failed to send OTP');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  async function handleVerifyOtp() {
    if (code.length < 6) { setError('Enter valid OTP'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/verify-rider-signup-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (data.success) setStep('details');
      else setError(data.error || 'Invalid OTP');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password || password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!docNumber) { setError('Enter document number'); return; }
    if (!docFile) { setError('Upload document image'); return; }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('phone', phone);
      formData.append('password', password);
      formData.append('docType', docType);
      formData.append('docNumber', docNumber);
      formData.append('riderDoc', docFile);

      const res = await fetch(`${API}/auth/setup-rider`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('role', data.user.role);
        navigate('/app/profile');
      } else {
        setError(data.error || 'Failed to create account');
      }
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-b from-primary-100 to-primary-50 px-5 pt-12 pb-20 rounded-b-[2rem]">
        <button onClick={() => step === 'phone' ? navigate(-1) : setStep('phone')} className="w-8 h-8 rounded-full bg-white/60 backdrop-blur flex items-center justify-center shadow-sm mb-8">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center mx-auto mb-4">
            <svg width="30" height="30" viewBox="0 0 48 48" fill="none">
              <path d="M24 8L8 20v12l16 10 16-10V20L24 8z" fill="#292928" opacity="0.9" />
              <circle cx="24" cy="24" r="4" fill="#c3f832" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-text">Become a Rider</h1>
          <p className="text-sm text-text/60 mt-1">Verify your phone and submit your ID to start driving</p>
        </motion.div>
      </div>

      <div className="px-4 -mt-14">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-xl border border-border overflow-hidden">
          <div className="p-6">
            <AnimatePresence mode="wait">
              {step === 'phone' && (
                <motion.div key="phone" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <div className="text-center mb-6">
                    <h2 className="text-lg font-bold text-text">Enter your phone</h2>
                    <p className="text-xs text-gray-500 mt-1">We'll send you a verification code</p>
                  </div>
                  <div className="space-y-4">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text font-medium text-sm z-10">+91</span>
                      <input type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Mobile number" className="input-field !pl-14 !py-3 !text-sm" maxLength={10} />
                    </div>
                    {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                    <button onClick={handleSendOtp} disabled={loading || phone.length < 10} className="btn-primary !py-3.5 !text-sm w-full">
                      {loading ? 'Sending...' : 'Send OTP'}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'otp' && (
                <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="text-center mb-6">
                    <h2 className="text-lg font-bold text-text">Verify OTP</h2>
                    <p className="text-xs text-gray-500 mt-1">Code sent to +91 {phone}</p>
                  </div>
                  <div className="space-y-4">
                    <input type="text" inputMode="numeric" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter 6-digit OTP" className="input-field !py-3 !text-sm text-center tracking-[8px] font-bold" maxLength={6} />
                    {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                    <button onClick={handleVerifyOtp} disabled={loading || code.length < 6} className="btn-primary !py-3.5 !text-sm w-full">
                      {loading ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'details' && (
                <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="text-center mb-6">
                    <h2 className="text-lg font-bold text-text">Set up your account</h2>
                    <p className="text-xs text-gray-500 mt-1">Choose a password and upload your ID</p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Password (min 6 chars)</label>
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create password" className="input-field !py-3 !text-sm" />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">ID Type</label>
                      <select value={docType} onChange={e => setDocType(e.target.value)} className="input-field !py-3 !text-sm">
                        <option value="aadhaar">Aadhaar Card</option>
                        <option value="pan">PAN Card</option>
                        <option value="driving_license">Driving License</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">ID Number</label>
                      <input type="text" value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder="Enter ID number" className="input-field !py-3 !text-sm" />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Upload ID Image</label>
                      <input type="file" accept="image/*" onChange={e => setDocFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-100 file:text-primary hover:file:bg-primary-200" />
                    </div>

                    {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                    <button type="submit" disabled={loading} className="btn-primary !py-3.5 !text-sm w-full">
                      {loading ? 'Creating...' : 'Create Rider Account'}
                    </button>

                    <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                      Your ID will be reviewed by our team. You'll be able to start offering rides after verification.
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
