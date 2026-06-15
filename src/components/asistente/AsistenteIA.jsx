import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send } from 'lucide-react';
import { useAsistente } from '@/hooks/useAsistente';

const SUGERENCIAS = [
  '¿Qué clientes están por caer en mora?',
  'Resumime las métricas de la cartera',
  '¿A quién conviene renovar?',
];

export default function AsistenteIA() {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const { mensajes, enviar, cargando, error } = useAsistente();
  const finRef = useRef(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  const submit = (e) => {
    e.preventDefault();
    enviar(texto);
    setTexto('');
  };

  return (
    <>
      {!abierto && (
        <button
          onClick={() => setAbierto(true)}
          aria-label="Abrir asistente IA"
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 rounded-2xl bg-brand-gradient text-white flex items-center justify-center shadow-brand hover:shadow-brand-sm active:scale-95 transition-all"
        >
          <Sparkles size={22} />
        </button>
      )}

      {abierto && (
        <div className="fixed inset-x-3 bottom-3 md:inset-auto md:bottom-6 md:right-6 md:w-96 z-50 flex flex-col rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 shadow-popover max-h-[80vh]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-gradient text-white flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">
                  Asistente
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Consultá tu cartera
                </p>
              </div>
            </div>
            <button
              onClick={() => setAbierto(false)}
              aria-label="Cerrar"
              className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {mensajes.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">Probá preguntar:</p>
                {SUGERENCIAS.map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    className="block w-full text-left text-sm px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {mensajes.map((m, i) => (
              <div
                key={i}
                className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {cargando && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                  Pensando…
                </div>
              </div>
            )}
            {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
            <div ref={finRef} />
          </div>

          <form
            onSubmit={submit}
            className="p-3 border-t border-slate-100 dark:border-slate-700 flex gap-2"
          >
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribí tu pregunta…"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={cargando || !texto.trim()}
              aria-label="Enviar"
              className="w-10 h-10 rounded-xl bg-brand-gradient text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
