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
            ${type === 'success' ? 'bg-success text-white' : 'bg-red-500 text-white'}`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {type === 'success' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
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
