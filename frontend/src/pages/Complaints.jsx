import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQS = [
  { q: 'How is my ride fare calculated?', a: 'Fare is dynamic — distance × ₹4 + ₹10. The total is shown before you request a ride and confirmed on your ride card.' },
  { q: 'How do I pay for an online (UPI) ride?', a: 'After OTP verification, the rider shows a QR code on their phone. Scan it with any UPI app (GPay, PhonePe, Paytm), or tap "Pay Now" in the app. Once paid, tap "I\'ve paid" to confirm.' },
  { q: 'How does OTP verification work?', a: 'When the rider reaches your pickup, share your 4-digit OTP shown on the ride card. The rider enters it to confirm you are on board.' },
  { q: 'What is my ride code?', a: 'Every ride has a unique code like RIDE-4A7K2, shown on your ride card. Keep it handy — it helps us track your ride when raising a complaint.' },
  { q: 'Can I cancel a ride?', a: 'Yes. While searching, tap "Cancel Ride". Your request is cancelled and the next closest passenger is shown to the rider automatically.' },
  { q: 'How do I become a verified rider?', a: 'Switch to rider mode and sign up with your driving license (number + photo). You can drive only after admin verification sets your status to "verified".' },
  { q: 'What should I do if payment fails?', a: 'Try the "Pay Now" link again or ask the rider to refresh the QR. If it still fails, pay by cash and tap "I\'ve paid" after settling with the rider.' },
];

export default function Complaints() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="pb-20">
      <div className="bg-gradient-to-b from-primary-100/40 to-white px-5 pt-8 pb-6">
        <h1 className="text-xl font-bold text-text">Help & Support</h1>
      </div>

      <div className="px-4 -mt-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#292928" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          </div>
          <h2 className="text-sm font-bold text-text">Frequently Asked Questions</h2>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          {FAQS.map((faq, i) => {
            const open = openFaq === i;
            return (
              <div key={i} className="border-b border-border/60 last:border-0">
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-gray-50/50 transition-colors"
                >
                  <span className="text-sm font-semibold text-text">{faq.q}</span>
                  <motion.svg
                    animate={{ rotate: open ? 180 : 0 }}
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    className="text-gray-400 shrink-0"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </motion.svg>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-xs text-gray-500 leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
