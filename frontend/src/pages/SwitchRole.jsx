import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function SwitchRole() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState('checking');
  const [riderStatus, setRiderStatus] = useState(null);
  const [password, setPassword] = useState('');
  const [docType, setDocType] = useState('driving_license');
  const [docNumber, setDocNumber] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  function showToast(message, type = 'success') {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  }

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      const res = await fetch(`${API}/auth/rider-application-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.applied) {
        setRiderStatus(data.status);
        setStatus(data.status === 'verified' ? 'verified' : 'applied');
      } else {
        setStatus('form');
      }
    } catch {
      setStatus('form');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!docNumber) { setError('Enter your driving license number'); return; }
    if (!docFile) { setError('Upload your driving license image'); return; }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('password', password);
      formData.append('docType', docType);
      formData.append('docNumber', docNumber);
      formData.append('riderDoc', docFile);

      const res = await fetch(`${API}/auth/apply-rider`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setRiderStatus('pending');
        setStatus('applied');
        showToast('Rider application submitted!');
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'checking') {
    return (
      <div className="pb-20 min-h-screen bg-gradient-to-b from-primary-100/30 to-white flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  if (status === 'verified') {
    return (
      <div className="pb-20 min-h-screen bg-gradient-to-b from-primary-100/30 to-white">
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shrink-0 shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1 className="text-xl font-bold text-text">Switch to Rider</h1>
        </div>
        <div className="px-4 mt-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-border overflow-hidden p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h2 className="text-xl font-bold text-text mb-2">You're a Verified Rider!</h2>
            <p className="text-sm text-gray-500 mb-6">You can now offer rides and earn money.</p>
            <button onClick={() => navigate('/app/rider-dashboard')} className="btn-primary !py-3 !text-sm w-full">Go to Rider Dashboard</button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (status === 'applied') {
    return (
      <div className="pb-20 min-h-screen bg-gradient-to-b from-primary-100/30 to-white">
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shrink-0 shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1 className="text-xl font-bold text-text">Switch to Rider</h1>
        </div>
        <div className="px-4 mt-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-border overflow-hidden p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text mb-2">Application Submitted!</h2>
            <p className="text-sm text-gray-500 mb-2">Your documents are under review by our team.</p>
            {riderStatus === 'rejected' && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4">
                Your previous application was rejected. Please submit again with correct documents.
              </div>
            )}
            {riderStatus === 'pending' && (
              <p className="text-xs text-gray-400 mb-4">You'll be notified once your rider account is approved.</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => navigate('/app/profile')} className="flex-1 py-3 rounded-xl border-2 border-border text-text font-semibold text-sm">Back to Profile</button>
              {riderStatus === 'rejected' && (
                <button onClick={() => setStatus('form')} className="flex-1 py-3 rounded-xl bg-primary text-text font-semibold text-sm">Apply Again</button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 min-h-screen bg-gradient-to-b from-primary-100/30 to-white">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shrink-0 shadow-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <h1 className="text-xl font-bold text-text">Become a Rider</h1>
      </div>

      <div className="px-4 mt-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-border overflow-hidden">
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#292928" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-text">Drive & Earn</h2>
              <p className="text-xs text-gray-500 mt-1">Offer rides to fellow students and earn money. Your driving license will be verified by our team.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text font-medium text-sm z-10">+91</span>
                  <input type="tel" value={user?.phone || ''} disabled className="input-field !pl-14 !py-3 !text-sm tracking-wider !bg-gray-50 !text-gray-400" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Password (for rider account)</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password (min 6 chars)" className="input-field !py-3 !text-sm" minLength={6} />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Document Type</label>
                <select value={docType} onChange={e => setDocType(e.target.value)} className="input-field !py-3 !text-sm">
                  <option value="driving_license">Driving License</option>
                  <option value="aadhaar">Aadhaar Card</option>
                  <option value="pan">PAN Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Document Number</label>
                <input type="text" value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder="Enter document number" className="input-field !py-3 !text-sm" />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Upload Driving License Image</label>
                <input type="file" accept="image/*" onChange={e => setDocFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-100 file:text-primary hover:file:bg-primary-200" />
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-xs text-center">{error}</motion.p>
              )}

              <button type="submit" disabled={loading || password.length < 6 || !docNumber || !docFile} className="btn-primary !py-3.5 !text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 w-full">
                {loading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : 'Submit for Verification'}
              </button>

              <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                Your documents will be reviewed by our team. You'll be able to start offering rides only after verification.
              </p>
            </form>
          </div>
        </motion.div>
      </div>

      <Toast {...toast} />
    </div>
  );
}