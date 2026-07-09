import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import VerificationBadge from '../components/VerificationBadge';
import CollegeSelect from '../components/CollegeSelect';
import Toast from '../components/Toast';
import { motion } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ProfilePage() {
  const { user, token, role, logout, setUser, toggleRole } = useAuth();

  const [showVerifyForm, setShowVerifyForm] = useState(false);
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

  const stats = [
    { label: 'Rides Offered', value: user.ridesOffered || 0 },
    { label: 'Rides Joined', value: user.ridesJoined || 0 },
    { label: 'Money Saved', value: `₹${user.moneySaved || 0}` },
  ];

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
        setShowVerifyForm(false);
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

  return (
    <div className="pb-20">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold text-text">Profile</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 space-y-4"
      >
        {/* Profile Header */}
        <div className="card flex flex-col items-center py-8">
          <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary text-2xl font-bold mb-3">
            {user.profilePicture ? (
              <img src={user.profilePicture} alt="" className="w-full h-full rounded-full object-cover" />
            ) : initials}
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-text">{user.name || 'Student'}</h2>
            <VerificationBadge verified={isVerified} />
          </div>
          <p className="text-sm text-gray-500">{user.collegeName || 'College not set'}</p>
        </div>

        {/* Stats */}
        <div className="card grid grid-cols-3 gap-4 py-5">
          {stats.map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-xl font-bold text-text">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Role Switcher */}
        <div className="card">
          <h3 className="font-semibold text-text mb-3">I want to...</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => role !== 'user' && toggleRole()}
              className={`rounded-xl p-4 border-2 transition-all text-left ${
                role === 'user'
                  ? 'border-primary bg-primary-50'
                  : 'border-border bg-white hover:bg-gray-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                role === 'user' ? 'bg-primary' : 'bg-gray-100'
              }`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={role === 'user' ? '#292928' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" /><path d="M10 17h4l3-7-4-2-3 4h-4" /><line x1="6" y1="11" x2="10" y2="11" />
                </svg>
              </div>
              <p className={`text-sm font-semibold ${role === 'user' ? 'text-text' : 'text-gray-500'}`}>Book Rides</p>
              <p className="text-xs text-gray-400 mt-0.5">Find rides to college</p>
            </button>
            <button
              onClick={() => role !== 'rider' && toggleRole()}
              className={`rounded-xl p-4 border-2 transition-all text-left ${
                role === 'rider'
                  ? 'border-primary bg-primary-50'
                  : 'border-border bg-white hover:bg-gray-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                role === 'rider' ? 'bg-primary' : 'bg-gray-100'
              }`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={role === 'rider' ? '#292928' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <p className={`text-sm font-semibold ${role === 'rider' ? 'text-text' : 'text-gray-500'}`}>Drive & Earn</p>
              <p className="text-xs text-gray-400 mt-0.5">Offer rides to students</p>
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-text">Account Info</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm font-medium text-text">{user.email || 'Not set'}</span>
            </div>
            <div className="border-t border-border" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Phone</span>
              <span className="text-sm font-medium text-text">+91 {user.phone || ''}</span>
            </div>
            <div className="border-t border-border" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Roll Number</span>
              <span className="text-sm font-medium text-text">{user.rollNumber || 'Not set'}</span>
            </div>
          </div>
        </div>

        {/* College Verification Section — only for students */}
        {role === 'rider' ? null : isVerified ? (
          <div className="card bg-success/5 border border-success/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#22C55E">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-text text-sm">College Verified</h3>
                <p className="text-xs text-gray-500">You're getting student pricing on all rides.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="card space-y-4 border-2 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text">Get College Verified</h3>
                <p className="text-xs text-gray-500 mt-0.5">Verify your student status to unlock exclusive student pricing on every ride.</p>
              </div>
            </div>

            {!showVerifyForm ? (
              <button
                onClick={() => setShowVerifyForm(true)}
                className="btn-primary !py-2.5 !text-sm"
              >
                Verify as College Student
              </button>
            ) : (
              <form onSubmit={handleVerify} className="space-y-3 pt-2">
                <div>
                  <label className="text-sm font-medium text-text/80 mb-1 block">College Name</label>
                  <CollegeSelect
                    value={verifyForm.collegeName}
                    onChange={val => updateVerifyField('collegeName', val)}
                    placeholder="Search Solapur colleges..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-text/80 mb-1 block">Roll Number</label>
                  <input
                    value={verifyForm.rollNumber}
                    onChange={e => updateVerifyField('rollNumber', e.target.value)}
                    placeholder="Your Roll Number"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-text/80 mb-1 block">College Email</label>
                  <input
                    type="email"
                    value={verifyForm.email}
                    onChange={e => updateVerifyField('email', e.target.value)}
                    placeholder="you@college.edu"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-text/80 mb-1 block">Upload Student ID</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setStudentIdFile(e.target.files[0])}
                    className="input-field text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary file:font-medium"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowVerifyForm(false)}
                    className="btn-outline !w-auto px-5 !py-2.5 !text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={verifying}
                    className="btn-primary flex-1 !py-2.5 !text-sm flex items-center justify-center gap-2"
                  >
                    {verifying ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pb-4">
          <button
            onClick={logout}
            className="w-full py-3.5 rounded-xl border-2 border-red-200 text-red-500 font-semibold 
                       hover:bg-red-50 transition-colors text-base"
          >
            Logout
          </button>
        </div>
      </motion.div>

      <Toast {...toast} />
    </div>
  );
}
