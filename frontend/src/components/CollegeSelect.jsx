import { useState, useRef, useEffect } from 'react';
import colleges from '../data/solapurColleges';

export default function CollegeSelect({ value, onChange, placeholder = 'Search your college...' }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = colleges.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.short.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  function select(college) {
    setQuery(college.short);
    onChange(college.name);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <input
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="input-field"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 transition-colors border-b border-border/50 last:border-0"
            >
              <span className="font-medium text-text">{c.short}</span>
              <span className="text-xs text-gray-400 block">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
