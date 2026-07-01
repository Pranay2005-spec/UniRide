import { motion } from 'framer-motion';

export default function Button({ children, variant = 'primary', className = '', disabled, onClick, type = 'button' }) {
  const base = variant === 'primary'
    ? 'btn-primary'
    : 'btn-outline';

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${className}`}
    >
      {children}
    </motion.button>
  );
}
