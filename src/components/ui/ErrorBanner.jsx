import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

export default function ErrorBanner({ message }) {
  const [dismissed, setDismissed] = useState(false);
  if (!message || dismissed) return null;

  return (
    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
        <AlertTriangle size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-rose-900">Algo no está funcionando</p>
        <p className="text-xs text-rose-700 mt-0.5">{message}</p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="w-7 h-7 rounded-lg hover:bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
