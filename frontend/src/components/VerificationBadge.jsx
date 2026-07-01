export default function VerificationBadge({ verified = false }) {
  if (!verified) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success text-xs font-semibold rounded-full">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
      </svg>
      Verified
    </span>
  );
}
