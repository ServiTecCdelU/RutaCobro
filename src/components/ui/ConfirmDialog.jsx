import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { useModal } from '@/hooks/useModal';

export default function ConfirmDialog({
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onClose,
}) {
  const [loading, setLoading] = useState(false);
  useModal(onClose);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const accent = variant === 'danger'
    ? { bg: 'bg-rose-100', text: 'text-rose-600', btn: 'bg-rose-600 hover:bg-rose-700' }
    : { bg: 'bg-amber-100', text: 'text-amber-600', btn: 'bg-brand-gradient hover:opacity-95' };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-[fadein_0.15s_ease-out]">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm shadow-popover animate-[pop_0.18s_ease-out]">
        <div className="p-5 flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl ${accent.bg} ${accent.text} flex items-center justify-center flex-shrink-0`}>
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600 mt-1">{message}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center flex-shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50 transition-colors ${accent.btn}`}
          >
            {loading ? 'Procesando…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
