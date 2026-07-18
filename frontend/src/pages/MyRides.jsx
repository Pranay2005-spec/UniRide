import { useNavigate } from 'react-router-dom';

export default function MyRides() {
  const navigate = useNavigate();

  return (
    <div className="pb-20">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-text">My Rides</h1>
      </div>

      <div className="px-4 mt-8">
        <div className="bg-gray-50 rounded-2xl py-14 px-6 text-center border border-dashed border-gray-200">
          <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" /><path d="M10 17h4l3-7-4-2-3 4h-4" /><line x1="6" y1="11" x2="10" y2="11" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-text mb-1">No rides yet</h3>
          <p className="text-sm text-gray-400">Your ride history will appear here once you take a ride.</p>
        </div>
      </div>
    </div>
  );
}
