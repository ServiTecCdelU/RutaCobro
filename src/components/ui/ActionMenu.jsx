import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

const MENU_WIDTH = 176; // w-44
const MARGIN = 8;

export default function ActionMenu({ actions }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const calcPosicion = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const alto = menuRef.current?.offsetHeight ?? actions.length * 42 + 8;
    const espacioAbajo = window.innerHeight - rect.bottom;
    const abrirArriba = espacioAbajo < alto + MARGIN && rect.top > alto + MARGIN;
    const left = Math.max(MARGIN, rect.right - MENU_WIDTH);
    const top = abrirArriba ? rect.top - alto - 4 : rect.bottom + 4;
    setCoords({ top, left });
  }, [actions.length]);

  useLayoutEffect(() => {
    if (open) calcPosicion();
  }, [open, calcPosicion]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (
        btnRef.current &&
        !btnRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onScrollOrResize = () => setOpen(false);
    document.addEventListener('mousedown', onClick);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
      >
        <MoreVertical size={16} />
      </button>
      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: coords.top, left: coords.left, width: MENU_WIDTH }}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden z-50"
          >
            {actions.map((a, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  a.onClick();
                }}
                disabled={a.disabled}
                className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  a.danger
                    ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {a.icon && <a.icon size={15} />}
                {a.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
