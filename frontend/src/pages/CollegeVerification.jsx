import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CollegeSelect from '../components/CollegeSelect';
import Toast from '../components/Toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function CollegeVerification() {
  const { user, token, setUser } = useAuth();
  const navigate = useNavigate();

  const [verifyForm, setVerifyForm] = useState({
    collegeName: '',
    rollNumber: '',
    email: '',
  });
  const [studentIdFile, setStudentIdFile] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  if (!user) return null;

  const isVerified = !!(user.collegeName && user.email);
  const initials = user.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?';

  function showToastMsg(message, type = 'success') {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  }

  function updateVerifyField(field, value) {
    setVerifyForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (!verifyForm.collegeName || !verifyForm.rollNumber || !verifyForm.email) {
      showToastMsg('Please fill all fields', 'error');
      return;
    }
    setVerifying(true);
    try {
      const fd = new FormData();
      Object.entries(verifyForm).forEach(([k, v]) => fd.append(k, v));
      if (studentIdFile) fd.append('studentIdCard', studentIdFile);

      const res = await fetch(`${API}/auth/verify-college`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        showToastMsg('College verified! You now get student pricing.');
      } else {
        showToastMsg(data.error || 'Verification failed', 'error');
      }
    } catch {
      showToastMsg('Network error', 'error');
    } finally {
      setVerifying(false);
    }
  }

  if (isVerified) {
    return (
      <div className="pb-20">
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-text">College Verification</h1>
        </div>

        <div className="px-4 mt-6">
          <div className="bg-success/5 border border-success/20 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#22C55E">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-text mb-1">College Verified</h2>
            <p className="text-sm text-gray-500">You are verified at <strong>{user.collegeName}</strong>. You get student pricing on all rides!</p>
            <button
              onClick={() => navigate('/app/home')}
              className="mt-6 btn-primary !w-auto px-8 !py-3 !text-sm mx-auto"
            >
              Back to Home
            </button>
          </div>
        </div>

        <Toast {...toast} />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-text">College Verification</h1>
      </div>

      <div className="px-4 mt-2">
        <div className="bg-gradient-to-b from-primary-100/40 to-white rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#292928" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-text">Verify Your College</h2>
              <p className="text-xs text-gray-500 mt-0.5">Get exclusive student pricing on every ride</p>
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">College Name</label>
              <CollegeSelect
                value={verifyForm.collegeName}
                onChange={val => updateVerifyField('collegeName', val)}
                placeholder="Search Solapur colleges..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Roll Number</label>
                <input
                  value={verifyForm.rollNumber}
                  onChange={e => updateVerifyField('rollNumber', e.target.value)}
                  placeholder="e.g. 2021XXXXX"
                  className="input-field !py-2.5 !text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">College Email</label>
                <input
                  type="email"
                  value={verifyForm.email}
                  onChange={e => updateVerifyField('email', e.target.value)}
                  placeholder="you@college.edu"
                  className="input-field !py-2.5 !text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Upload Student ID (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setStudentIdFile(e.target.files[0])}
                className="input-field !py-2 !text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary file:font-medium file:text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={verifying}
              className="btn-primary !py-3 !text-sm flex items-center justify-center gap-2"
            >
              {verifying ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : 'Submit'}
            </button>
          </form>
        </div>
      </div>

      <Toast {...toast} />
    </div>
  );
}
