import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const tabs = [
  { name: 'Home', icon: HomeIcon, path: '/app/home' },
  { name: 'Rides', icon: RidesIcon, path: '/app/rides' },
  { name: 'Profile', icon: ProfileIcon, path: '/app/profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border pb-safe">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.name}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center gap-0.5 py-1 px-4"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-0.5 w-8 h-0.5 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <tab.icon active={isActive} />
              <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                {tab.name}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#2563EB' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function RidesIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#2563EB' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function ProfileIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#2563EB' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
