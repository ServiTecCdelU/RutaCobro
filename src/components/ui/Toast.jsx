import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, Undo2 } from 'lucide-react';

const ToastContext = createContext(null);

let idSeed = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (opts) => {
      const id = ++idSeed;
      const toast = {
        id,
        variant: opts.variant ?? 'info',
        title: opts.title ?? '',
        description: opts.description,
        action: opts.action,
        actions: opts.actions,
        duration: opts.duration ?? 4000,
      };
      setToasts((ts) => [...ts, toast]);
      if (toast.duration > 0) {
        setTimeout(() => dismiss(id), toast.duration);
      }
      return id;
    },
    [dismiss],
  );

  const api = {
    show,
    success: (title, opts = {}) => show({ ...opts, title, variant: 'success' }),
    error: (title, opts = {}) => show({ ...opts, title, variant: 'error' }),
    info: (title, opts = {}) => show({ ...opts, title, variant: 'info' }),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-24 md:bottom-4 right-4 left-4 sm:left-auto z-[70] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const { variant, title, description, action } = toast;
  const palette = {
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: 'text-emerald-600',
      Icon: CheckCircle2,
    },
    error: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      icon: 'text-rose-600',
      Icon: AlertTriangle,
    },
    info: { bg: 'bg-slate-900', border: 'border-slate-800', icon: 'text-white', Icon: Info },
  }[variant];

  const isDark = variant === 'info';
  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const textSub = isDark ? 'text-slate-300' : 'text-slate-600';

  // `action` (legacy, ícono fijo Undo2) + `actions` (lista con ícono por acción).
  const actions = [...(action ? [{ ...action, icon: Undo2 }] : []), ...(toast.actions ?? [])];
  const btnClass = isDark
    ? 'bg-white text-slate-900 hover:bg-slate-100'
    : 'bg-slate-900 text-white hover:bg-slate-800';

  return (
    <div
      className={`pointer-events-auto w-full sm:w-96 ${palette.bg} border ${palette.border} rounded-2xl shadow-lg p-4 flex items-start gap-3 animate-[slideup_0.2s_ease-out]`}
    >
      <div className={`flex-shrink-0 ${palette.icon}`}>
        <palette.Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${textMain}`}>{title}</p>
        {description && <p className={`text-xs mt-0.5 ${textSub}`}>{description}</p>}
        {actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {actions.map((a, i) => {
              const ActionIcon = a.icon;
              return (
                <button
                  key={i}
                  onClick={() => {
                    a.onClick();
                    if (a.keepOpen !== true) onDismiss();
                  }}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${btnClass}`}
                >
                  {ActionIcon && <ActionIcon size={13} />} {a.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
          isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-black/5 text-slate-500'
        }`}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
