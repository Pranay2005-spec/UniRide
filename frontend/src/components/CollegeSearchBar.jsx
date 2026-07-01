import { useState, useRef, useEffect } from 'react';
import colleges from '../data/solapurColleges';

export default function CollegeSearchBar({ onSelect, onClear }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = query.trim()
    ? colleges.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.short.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(college) {
    setQuery(college.short);
    setOpen(false);
    onSelect(college);
  }

  function handleClear() {
    setQuery('');
    onClear?.();
  }

  return (
    <div ref={ref} className="relative z-40">
      <div className="bg-white rounded-2xl shadow-lg shadow-black/10 border border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search colleges in Solapur..."
            className="flex-1 text-base text-text placeholder-gray-400 bg-transparent outline-none border-none"
          />
          {query && (
            <button onClick={handleClear} className="text-gray-400 hover:text-gray-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-border rounded-2xl shadow-lg max-h-64 overflow-y-auto">
          <div className="px-3 py-2 text-xs text-gray-400 font-medium">
            {filtered.length} college{filtered.length > 1 ? 's' : ''} found
          </div>
          {filtered.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c)}
              className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors border-b border-border/50 last:border-0 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-text text-sm">{c.short}</p>
                <p className="text-xs text-gray-400">{c.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query.trim() && filtered.length === 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-border rounded-2xl shadow-lg p-4 text-center">
          <p className="text-sm text-gray-500">No colleges found</p>
        </div>
      )}
    </div>
  );
}
