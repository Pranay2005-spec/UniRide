import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const isVerified = !!(user.collegeName && user.email);
  const initials = user.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?';

  const menuItems = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" /><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      ),
      label: 'Profile Management',
      sub: 'Name, email, phone & account settings',
      route: '/app/profile-management',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" /><path d="M10 17h4l3-7-4-2-3 4h-4" /><line x1="6" y1="11" x2="10" y2="11" />
        </svg>
      ),
      label: 'My Rides',
      sub: 'View your ride history',
      route: '/app/my-rides',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1v3m0 16v3M4.22 4.22l2.12 2.12m11.32 11.32l2.12 2.12M1 12h3m16 0h3M4.22 19.78l2.12-2.12m11.32-11.32l2.12-2.12" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      ),
      label: 'Payments',
      sub: 'Payment methods & history',
      route: '/app/payments',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      label: 'College Verification',
      sub: isVerified ? 'Verified' : 'Verify your student status',
      badge: isVerified ? { text: 'Verified', color: 'text-success bg-success/10' } : null,
      route: '/app/college-verification',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      label: role === 'rider' ? 'Switch to Book Rides' : 'Switch to Drive & Earn',
      sub: role === 'rider' ? 'You are currently a Rider' : 'You are currently a Student',
      route: '/app/create-rider-account',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      ),
      label: 'Updates',
      sub: 'Latest project updates & news',
      route: '/app/updates',
    },
  ];

  return (
    <div className="pb-20">
      {/* Profile Header */}
      <div className="bg-gradient-to-b from-primary-100/40 to-white px-5 pt-8 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary text-xl font-bold ring-2 ring-primary/20">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt="" className="w-full h-full rounded-full object-cover" />
              ) : initials}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-text truncate">{user.name || 'Student'}</h1>
            <p className="text-sm text-gray-500 mt-0.5">+91 {user.phone || ''}</p>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-around mt-6 bg-white rounded-2xl shadow-sm border border-border px-2 py-4"
        >
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-text">{user.ridesOffered || 0}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Rides Offered</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-text">{user.ridesJoined || 0}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Rides Joined</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-text">₹{user.moneySaved || 0}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Money Saved</p>
          </div>
        </motion.div>
      </div>

      {/* Menu */}
      <div className="px-4 -mt-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden divide-y divide-border/50"
        >
          {menuItems.map((item, i) => (
            <button
              key={i}
              onClick={() => item.route && navigate(item.route)}
              className="w-full flex items-center gap-3.5 px-4 py-4 hover:bg-primary-50/50 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-gray-600">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{item.sub}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.badge && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${item.badge.color}`}>
                    {item.badge.text}
                  </span>
                )}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
