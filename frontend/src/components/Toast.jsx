import { motion, AnimatePresence } from 'framer-motion';

export default function Toast({ message, type = 'success', visible, onClose }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className={`fixed bottom-24 left-4 right-4 max-w-sm mx-auto z-50 px-4 py-3 rounded-xl shadow-lg 
            ${type === 'success' ? 'bg-success text-white' : type === 'warning' ? 'bg-warning text-text' : 'bg-red-500 text-white'}`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {type === 'success' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : type === 'warning' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
