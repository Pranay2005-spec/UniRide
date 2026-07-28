import { useState } from 'react';

export default function StarRating({ value, onChange, size = 'md', disabled = false }) {
  const [hovered, setHovered] = useState(0);

  const sizeClass = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !disabled && setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className={`${sizeClass} transition-colors ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <svg viewBox="0 0 24 24" fill={star <= (hovered || value) ? '#c3f832' : 'none'} stroke={star <= (hovered || value) ? '#c3f832' : '#d1d5db'} strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  );
}
