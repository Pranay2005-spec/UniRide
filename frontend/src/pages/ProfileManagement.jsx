import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ProfileManagement() {
  const { user, logout, token, setUser } = useAuth();
  const navigate = useNavigate();

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  function showToastMsg(message, type = 'success') {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  }

  function startEdit(field) {
    const vals = { name: user.name, email: user.email };
    setEditValue(vals[field] || '');
    setEditing(field);
  }

  function cancelEdit() {
    setEditing(null);
    setEditValue('');
  }

  async function saveEdit() {
    if (!editValue.trim()) {
      showToastMsg('Value cannot be empty', 'error');
      return;
    }
    setSaving(true);
    try {
      const body = {};
      if (editing === 'name') body.name = editValue.trim();
      if (editing === 'email') body.email = editValue.trim();

      const res = await fetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        showToastMsg('Updated successfully');
        setEditing(null);
      } else {
        showToastMsg(data.error || 'Update failed', 'error');
      }
    } catch {
      showToastMsg('Network error', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showToastMsg('Account deleted');
        setTimeout(() => logout(), 1000);
      } else {
        showToastMsg(data.error || 'Delete failed', 'error');
        setShowDeleteConfirm(false);
      }
    } catch {
      showToastMsg('Network error', 'error');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate('/app/profile')} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#292928" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-text">Profile Management</h1>
      </div>

      <div className="px-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-border shadow-sm px-5 divide-y divide-border/50"
        >
          {/* Name */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-400 font-medium">Name</p>
              {editing === 'name' ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="flex-1 text-sm font-medium text-text border border-primary rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/30"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                  />
                  <button onClick={saveEdit} disabled={saving} className="text-xs font-semibold text-primary hover:text-primary-600">
                    {saving ? '...' : 'Save'}
                  </button>
                  <button onClick={cancelEdit} className="text-xs font-medium text-gray-400 hover:text-gray-600">Cancel</button>
                </div>
              ) : (
                <p className="text-sm font-medium text-text mt-0.5">{user.name || 'Not set'}</p>
              )}
            </div>
            {editing !== 'name' && (
              <button onClick={() => startEdit('name')} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center shrink-0 ml-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
          </div>

          {/* Email */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-400 font-medium">Email</p>
              {editing === 'email' ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="flex-1 text-sm font-medium text-text border border-primary rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/30"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                  />
                  <button onClick={saveEdit} disabled={saving} className="text-xs font-semibold text-primary hover:text-primary-600">
                    {saving ? '...' : 'Save'}
                  </button>
                  <button onClick={cancelEdit} className="text-xs font-medium text-gray-400 hover:text-gray-600">Cancel</button>
                </div>
              ) : (
                <p className="text-sm font-medium text-text mt-0.5">{user.email || 'Not set'}</p>
              )}
            </div>
            {editing !== 'email' && (
              <button onClick={() => startEdit('email')} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center shrink-0 ml-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
          </div>

          {/* Phone (read-only) */}
          <div className="py-4">
            <p className="text-xs text-gray-400 font-medium">Phone</p>
            <p className="text-sm font-medium text-text mt-0.5">+91 {user.phone || ''}</p>
          </div>
        </motion.div>

        {/* Logout & Delete */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden divide-y divide-border/50"
        >
          <button onClick={logout} className="w-full flex items-center gap-3.5 px-4 py-4 hover:bg-gray-50 transition-colors text-left">
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-gray-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-text flex-1">Logout</p>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center gap-3.5 px-4 py-4 hover:bg-red-50 transition-colors text-left">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0 text-red-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-500">Delete Account</p>
              <p className="text-xs text-gray-400">Permanently delete your account and data</p>
            </div>
          </button>
        </motion.div>
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-text mb-1">Delete Account?</h2>
                <p className="text-sm text-gray-500">This action is permanent. Your rides, stats, and all data will be removed.</p>
                <div className="mt-6 space-y-2">
                  <button onClick={handleDeleteAccount} disabled={deleting} className="w-full py-3.5 rounded-2xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors text-sm flex items-center justify-center gap-2">
                    {deleting ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : 'Yes, Delete My Account'}
                  </button>
                  <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-3 text-sm font-medium text-gray-500 hover:text-text transition-colors">Cancel</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast {...toast} />
    </div>
  );
}
