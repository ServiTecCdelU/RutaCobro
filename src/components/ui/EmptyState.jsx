export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-10 flex flex-col items-center text-center shadow-card">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center mb-4 ring-1 ring-brand-100">
        <Icon size={28} strokeWidth={1.8} />
      </div>
      <h3 className="font-bold text-slate-900 text-base">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 mt-1.5 max-w-sm text-balance">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
