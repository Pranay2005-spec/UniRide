const shimmer = `relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent`;

export default function LoadingSkeleton({ count = 3, type = 'ride' }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`card ${shimmer} space-y-3`}>
          {type === 'ride' && (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-2.5 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-12" />
              </div>
            </>
          )}
          {type === 'profile' && (
            <div className="flex flex-col items-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-gray-200" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/4" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
