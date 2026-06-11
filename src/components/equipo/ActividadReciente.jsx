import { useEffect, useState } from 'react';
import { Undo2, FileX, Trash2, RefreshCw, ShieldQuestion, History } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatMoney, formatFecha } from '@/utils/formatters';

const ACCIONES = {
  'revertir-cuota': { label: 'Cobro revertido', icon: Undo2, color: 'text-amber-600 bg-amber-50' },
  'eliminar-prestamo': {
    label: 'Préstamo eliminado',
    icon: FileX,
    color: 'text-rose-600 bg-rose-50',
  },
  'eliminar-cliente': {
    label: 'Cliente eliminado',
    icon: Trash2,
    color: 'text-rose-600 bg-rose-50',
  },
  refinanciar: { label: 'Refinanciación', icon: RefreshCw, color: 'text-violet-600 bg-violet-50' },
};

/**
 * Registro de auditoría de acciones sensibles (solo admin): quién revirtió
 * cobros, eliminó préstamos/clientes o refinanció, y cuándo.
 */
export default function ActividadReciente() {
  const { subscribeAuditoria, clientes } = useApp();
  const [eventos, setEventos] = useState([]);

  useEffect(() => subscribeAuditoria(setEventos), [subscribeAuditoria]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-card overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
          <History size={18} />
        </div>
        <div>
          <h2 className="font-bold text-slate-900">Actividad sensible</h2>
          <p className="text-xs text-slate-500">
            Reversiones, eliminaciones y refinanciaciones — quién y cuándo
          </p>
        </div>
      </div>

      {eventos.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">Sin actividad registrada todavía.</p>
      ) : (
        <div className="divide-y divide-slate-100 max-h-96 overflow-auto">
          {eventos.map((e) => {
            const meta = ACCIONES[e.accion] ?? {
              label: e.accion,
              icon: ShieldQuestion,
              color: 'text-slate-600 bg-slate-50',
            };
            const Icono = meta.icon;
            const cliente = e.clienteId ? clientes.find((c) => c.id === e.clienteId) : null;
            return (
              <div key={e.id} className="px-5 py-3 flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}
                >
                  <Icono size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                    <span>{meta.label}</span>
                    {e.monto != null && e.monto > 0 && (
                      <span className="tabular-nums text-slate-600 font-bold">
                        {formatMoney(e.monto)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {cliente?.nombre ? `${cliente.nombre} · ` : ''}
                    {e.detalle}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-semibold text-slate-700">
                    {e.autorEmail ?? 'desconocido'}
                  </div>
                  <div className="text-[11px] text-slate-400 tabular-nums">
                    {e.fecha ? formatFecha(e.fecha) : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
