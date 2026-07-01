import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { useSavedColleges } from '../hooks/useSavedColleges';
import colleges from '../data/solapurColleges';

const allColleges = colleges;

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { savedIds, toggleSave, isSaved } = useSavedColleges();

  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const isVerified = user?.collegeName && user?.email;
  const savedColleges = colleges.filter(c => savedIds.includes(c.id));

  const searchResults = query.trim()
    ? allColleges.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.short.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : allColleges.slice(0, 8);

  function showToastMsg(message, type = 'success') {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  }

  function handleSelect(college) {
    setShowSearch(false);
    setQuery('');
    navigate('/app/rides', { state: { college } });
  }

  function handleToggleSave(college, e) {
    e.stopPropagation();
    toggleSave(college.id);
    showToastMsg(isSaved(college.id) ? 'Removed' : `${college.short} saved`);
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="px-4 pt-4 pb-1">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-text">
              Hi, {user?.name?.split(' ')[0] || 'there'}!
            </h1>
            <p className="text-xs text-gray-500">Share the journey, save the cost</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary font-bold text-sm">
            {user?.name?.[0] || '?'}
          </div>
        </div>
      </div>

      {/* Search / Location bar — Rapido style */}
      <div className="px-4 mb-4">
        {!showSearch ? (
          <button
            onClick={() => setShowSearch(true)}
            className="w-full bg-white rounded-2xl shadow-md border border-border overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50">
              <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <span className="text-gray-400 text-sm">Search college...</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-success-50 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="text-gray-400 text-sm">Where to?</span>
            </div>
          </button>
        ) : (
          <div className="bg-white rounded-2xl shadow-md border border-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => { setShowSearch(false); setQuery(''); }} className="text-gray-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search Solapur colleges..."
                className="flex-1 text-base text-text placeholder-gray-400 bg-transparent outline-none border-none"
                autoFocus
              />
            </div>
            {searchResults.length > 0 && (
              <div className="border-t border-border max-h-60 overflow-y-auto">
                {searchResults.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors border-b border-border/50 last:border-0 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text text-sm">{c.short}</p>
                      <p className="text-xs text-gray-400 truncate">{c.name}</p>
                    </div>
                    <button
                      onClick={e => handleToggleSave(c, e)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isSaved(c.id) ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={isSaved(c.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Verify chip */}
      {!isVerified && (
        <div className="px-4 mb-4">
          <button
            onClick={() => navigate('/app/profile')}
            className="w-full bg-gradient-to-r from-primary to-primary-700 rounded-xl py-3 px-4 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Verify as College Student — Get student pricing
          </button>
        </div>
      )}

      {/* Saved Colleges — Rapido saved locations style */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-text">Saved Colleges</h2>
          {savedColleges.length > 0 && (
            <span className="text-xs text-gray-400">{savedColleges.length} colleges</span>
          )}
        </div>

        {savedColleges.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl py-10 px-6 text-center border border-dashed border-gray-200">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 mb-3">Save colleges you travel to often for quick booking.</p>
            <button
              onClick={() => setShowSearch(true)}
              className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl"
            >
              Browse Colleges
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {savedColleges.map(college => (
              <motion.div
                key={college.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => navigate('/app/rides', { state: { college } })}
                  className="w-full text-left p-4 flex items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text">{college.short}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{college.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary">Find Rides</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>
                <div className="border-t border-border/50 px-4 py-2 flex items-center justify-between bg-gray-50/50">
                  <button
                    onClick={() => navigate('/app/rides', { state: { college } })}
                    className="text-xs font-medium text-primary"
                  >
                    Offer a ride here
                  </button>
                  <button
                    onClick={e => handleToggleSave(college, e)}
                    className="text-xs text-red-500 font-medium flex items-center gap-1"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#EF4444" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    Remove
                  </button>
                </div>
              </motion.div>
            ))}
            <button
              onClick={() => setShowSearch(true)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-500 text-sm font-medium hover:border-primary/30 hover:text-primary transition-colors"
            >
              + Add more colleges
            </button>
          </div>
        )}
      </div>

      <Toast {...toast} />
    </div>
  );
}
