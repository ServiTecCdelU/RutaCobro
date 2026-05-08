import { useState, useEffect, useRef } from 'react';
import { MoreVertical } from 'lucide-react';

export default function ActionMenu({ actions }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden z-20">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setOpen(false); a.onClick(); }}
              disabled={a.disabled}
              className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                a.danger
                  ? 'text-rose-600 hover:bg-rose-50'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {a.icon && <a.icon size={15} />}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
