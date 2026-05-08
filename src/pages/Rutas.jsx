import { useMemo, useState } from 'react';
import { Plus, Route, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatMoney } from '@/utils/formatters';
import ErrorBanner from '@/components/ui/ErrorBanner';
import EmptyState from '@/components/ui/EmptyState';
import ActionMenu from '@/components/ui/ActionMenu';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ModalRuta from '@/components/modals/ModalRuta';
import { useToast } from '@/components/ui/Toast';

export default function Rutas() {
  const { rutas, clientes, prestamos, eliminarRuta, error } = useApp();
  const toast = useToast();
  const [modal, setModal] = useState(null); // null | { nueva: true } | { editar: ruta }
  const [confirmBorrar, setConfirmBorrar] = useState(null);

  const stats = useMemo(() => {
    const clientesPorRuta = new Map();
    clientes.forEach(c => {
      if (!clientesPorRuta.has(c.rutaId)) clientesPorRuta.set(c.rutaId, []);
      clientesPorRuta.get(c.rutaId).push(c);
    });
    const clienteIdsPorRuta = new Map(
      [...clientesPorRuta.entries()].map(([rid, list]) => [rid, new Set(list.map(c => c.id))])
    );

    return rutas.map(r => {
      const clis = clientesPorRuta.get(r.id) ?? [];
      const clienteIds = clienteIdsPorRuta.get(r.id) ?? new Set();
      const pres = prestamos.filter(p => clienteIds.has(p.clienteId));
      let cobrado = 0;
      let pendiente = 0;
      for (const p of pres) {
        for (const c of p.cuotasDetalle ?? []) {
          const pagado = c.pagado ?? (c.pagada ? c.monto : 0);
          cobrado += pagado;
          pendiente += c.monto - pagado;
        }
      }
      return { ...r, clientes: clis.length, prestamos: pres.length, cobrado, pendiente };
    });
  }, [rutas, clientes, prestamos]);

  const intentarBorrar = (ruta) => {
    if (ruta.clientes > 0) {
      toast.error('No se puede eliminar', {
        description: `La ruta tiene ${ruta.clientes} cliente(s) asignado(s).`,
      });
      return;
    }
    setConfirmBorrar(ruta);
  };

  const confirmarBorrar = async () => {
    const ruta = confirmBorrar;
    await eliminarRuta(ruta.id);
    toast.success('Ruta eliminada', { description: ruta.nombre });
  };

  return (
    <div className="space-y-5">
      {error && <ErrorBanner message={error} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-display">Rutas</h1>
          <p className="text-sm text-slate-500 mt-1 tabular-nums">{rutas.length} rutas activas</p>
        </div>
        <button
          onClick={() => setModal({ nueva: true })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-gradient text-white text-sm font-semibold hover:opacity-95 active:scale-[0.98] shadow-brand-sm hover:shadow-brand transition-all"
        >
          <Plus size={16} /> <span className="hidden sm:inline">Nueva ruta</span>
        </button>
      </div>

      {stats.length === 0 ? (
        <EmptyState
          icon={Route}
          title="Sin rutas creadas"
          description="Las rutas agrupan clientes por zona de cobro y asignan un cobrador."
          action={
            <button
              onClick={() => setModal({ nueva: true })}
              className="px-5 py-2.5 rounded-xl bg-brand-gradient text-white text-sm font-semibold hover:opacity-95 active:scale-[0.98] shadow-brand-sm hover:shadow-brand transition-all"
            >
              Crear primera ruta
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map(r => (
            <div key={r.id} className="relative bg-white rounded-2xl border border-slate-200/70 p-5 shadow-card hover:shadow-card-hover hover:border-slate-300 transition-all overflow-hidden">
              <div
                className="absolute top-0 inset-x-0 h-1"
                style={{ background: `linear-gradient(90deg, ${r.color}, ${r.color}88)` }}
                aria-hidden="true"
              />
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-sm" style={{ background: r.color }}>
                  {r.nombre[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 truncate">{r.nombre}</div>
                  <div className="text-xs text-slate-500 truncate">{r.cobrador}</div>
                </div>
                <ActionMenu actions={[
                  { label: 'Editar', icon: Pencil, onClick: () => setModal({ editar: r }) },
                  { label: 'Eliminar', icon: Trash2, danger: true, onClick: () => intentarBorrar(r) },
                ]} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Clientes', r.clientes],
                  ['Préstamos', r.prestamos],
                  ['Cobrado', formatMoney(r.cobrado)],
                  ['Pendiente', formatMoney(r.pendiente)],
                ].map(([label, val]) => (
                  <div key={label} className="bg-slate-50/80 rounded-xl p-3 ring-1 ring-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{label}</div>
                    <div className="text-sm font-bold text-slate-900 tabular-nums">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal?.nueva && <ModalRuta onClose={() => setModal(null)} />}
      {modal?.editar && <ModalRuta onClose={() => setModal(null)} ruta={modal.editar} />}

      {confirmBorrar && (
        <ConfirmDialog
          title={`Eliminar ruta "${confirmBorrar.nombre}"`}
          message="¿Seguro que querés eliminar esta ruta? Esta acción no se puede deshacer."
          confirmText="Eliminar ruta"
          onConfirm={confirmarBorrar}
          onClose={() => setConfirmBorrar(null)}
        />
      )}
    </div>
  );
}
