export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-10 flex flex-col items-center text-center shadow-card">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/30 text-brand-500 dark:text-brand-300 flex items-center justify-center mb-4 ring-1 ring-brand-100 dark:ring-brand-800">
        <Icon size={28} strokeWidth={1.8} />
      </div>
      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm text-balance">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
