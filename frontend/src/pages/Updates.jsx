import { useNavigate } from 'react-router-dom';

const updates = [
  {
    date: 'July 2026',
    title: 'UniRide Launches!',
    description: 'Beta version is now live for Solapur college students. Book bike rides with verified students from your college.',
    tag: 'New',
  },
];

export default function Updates() {
  const navigate = useNavigate();

  return (
    <div className="pb-20">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-text">Updates</h1>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {updates.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl py-14 px-6 text-center border border-dashed border-gray-200">
            <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 20V10M12 20V4M6 20v-6" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-text mb-1">No updates yet</h3>
            <p className="text-sm text-gray-400">Check back later for the latest project news.</p>
          </div>
        ) : (
          updates.map((update, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-600">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-text text-sm">{update.title}</h3>
                    {update.tag && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-text">{update.tag}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{update.description}</p>
                  <p className="text-[11px] text-gray-400 mt-2">{update.date}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
