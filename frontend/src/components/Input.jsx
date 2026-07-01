export default function Input({ label, icon: Icon, className = '', ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-text/80">{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        )}
        <input
          className={`input-field ${Icon ? 'pl-11' : ''} ${className}`}
          {...props}
        />
      </div>
    </div>
  );
}
