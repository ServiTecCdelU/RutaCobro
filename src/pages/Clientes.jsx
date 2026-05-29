import { useMemo, useState, useEffect } from 'react';
import { Search, Filter, UserPlus, Users, Pencil, Trash2, Banknote } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { diasDeAtraso } from '@/utils/calculos';
import { useToast } from '@/components/ui/Toast';
import { useCobrar } from '@/hooks/useCobrar';
import { usePaginacion } from '@/hooks/usePaginacion';
import Paginacion from '@/components/ui/Paginacion';
import RutaSelector from '@/components/ui/RutaSelector';
import ErrorBanner from '@/components/ui/ErrorBanner';
import EmptyState from '@/components/ui/EmptyState';
import ActionMenu from '@/components/ui/ActionMenu';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ClienteCard from '@/components/clientes/ClienteCard';
import ModalDetalle from '@/components/modals/ModalDetalle';
import ModalNuevoCliente from '@/components/modals/ModalNuevoCliente';
import ModalNuevoPrestamo from '@/components/modals/ModalNuevoPrestamo';

export default function Clientes() {
  const { clientes, prestamos, rutas, eliminarCliente, eliminarPrestamo, error } = useApp();
  const toast = useToast();
  const { cobrarProxima } = useCobrar();

  const [rutaActiva, setRutaActiva] = useState('all');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [showFiltros, setShowFiltros] = useState(false);

  const [modalDetalle, setModalDetalle] = useState(null);
  const [modalCliente, setModalCliente] = useState(null); // null | { nuevo: true } | { editar: cliente }
  const [modalPrestamo, setModalPrestamo] = useState(null);
  const [confirmBorrarCliente, setConfirmBorrarCliente] = useState(null);
  const [confirmBorrarPrestamo, setConfirmBorrarPrestamo] = useState(null);

  const items = useMemo(() => {
    const prestamosPorCliente = new Map();
    for (const p of prestamos) {
      if (!prestamosPorCliente.has(p.clienteId)) prestamosPorCliente.set(p.clienteId, []);
      prestamosPorCliente.get(p.clienteId).push(p);
    }

    const q = busqueda.toLowerCase().trim();
    const clientesFiltrados = clientes
      .filter((c) => rutaActiva === 'all' || c.rutaId === rutaActiva)
      .filter((c) => !q || c.nombre.toLowerCase().includes(q) || c.dni?.includes(q));

    const matchEstado = (prestamo) => {
      if (filtroEstado === 'todos') return true;
      if (filtroEstado === 'sin-prestamo') return false;
      if (filtroEstado === 'mora') {
        return (prestamo.cuotasDetalle ?? []).some((c) => !c.pagada && diasDeAtraso(c) > 0);
      }
      if (filtroEstado === 'activo') return prestamo.estado === 'activo';
      return true;
    };

    const rows = [];
    for (const cliente of clientesFiltrados) {
      const ps = prestamosPorCliente.get(cliente.id) ?? [];
      if (ps.length === 0) {
        if (filtroEstado === 'todos' || filtroEstado === 'sin-prestamo') {
          rows.push({ cliente, prestamo: null });
        }
        continue;
      }
      for (const prestamo of ps) {
        if (matchEstado(prestamo)) rows.push({ cliente, prestamo });
      }
    }
    return rows;
  }, [clientes, prestamos, rutaActiva, busqueda, filtroEstado]);

  const pag = usePaginacion(items, 20);
  const resetPag = pag.reset;

  useEffect(() => {
    resetPag();
  }, [rutaActiva, busqueda, filtroEstado, resetPag]);

  const handleCobrar = (prestamoId) => cobrarProxima(prestamoId);

  const handleEliminarCliente = async () => {
    const c = confirmBorrarCliente;
    try {
      await eliminarCliente(c.id);
      toast.success('Cliente eliminado', { description: c.nombre });
    } catch (err) {
      toast.error('No se pudo eliminar', { description: err.message });
    }
  };

  const handleEliminarPrestamo = async () => {
    const p = confirmBorrarPrestamo;
    try {
      await eliminarPrestamo(p.id);
      toast.success('Préstamo eliminado');
    } catch (err) {
      toast.error('No se pudo eliminar', { description: err.message });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {error && <ErrorBanner message={error} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-display">
            Clientes
          </h1>
          <p className="text-sm text-slate-500 mt-1 tabular-nums">
            {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'} · {prestamos.length}{' '}
            {prestamos.length === 1 ? 'préstamo' : 'préstamos'}
          </p>
        </div>
        <button
          onClick={() => setModalCliente({ nuevo: true })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-gradient text-white text-sm font-semibold hover:opacity-95 active:scale-[0.98] shadow-brand-sm hover:shadow-brand transition-all"
        >
          <UserPlus size={16} /> <span className="hidden sm:inline">Nuevo cliente</span>
        </button>
      </div>

      {clientes.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Todavía no tenés clientes"
          description="Creá el primero para empezar a registrar préstamos."
          action={
            <button
              onClick={() => setModalCliente({ nuevo: true })}
              className="px-5 py-2.5 rounded-xl bg-brand-gradient text-white text-sm font-semibold hover:opacity-95 active:scale-[0.98] shadow-brand-sm hover:shadow-brand transition-all"
            >
              Crear primer cliente
            </button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Buscar por nombre o DNI…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
            </div>
            <button
              onClick={() => setShowFiltros((v) => !v)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                showFiltros
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Filter size={15} /> Filtros
            </button>
          </div>

          {showFiltros && (
            <div className="flex flex-col gap-3 p-4 bg-white rounded-2xl border border-slate-200/70 shadow-card">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Estado
                </p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    ['todos', 'Todos'],
                    ['activo', 'Activos'],
                    ['mora', 'En mora'],
                    ['sin-prestamo', 'Sin préstamo'],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setFiltroEstado(val)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        filtroEstado === val
                          ? 'bg-brand-600 text-white shadow-brand-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {rutas.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Ruta
                  </p>
                  <RutaSelector rutas={rutas} rutaActiva={rutaActiva} onSelect={setRutaActiva} />
                </div>
              )}
            </div>
          )}

          {items.length > 0 ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {pag.items.map(({ cliente, prestamo }) => {
                  const ruta = rutas.find((r) => r.id === cliente.rutaId);
                  if (!prestamo) {
                    return (
                      <div
                        key={`sin-${cliente.id}`}
                        className="relative bg-white rounded-xl sm:rounded-2xl border border-slate-200/70 p-3 pl-4 sm:p-4 sm:pl-5 shadow-card hover:shadow-card-hover transition-all overflow-hidden flex flex-col"
                      >
                        <span
                          className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
                          style={{ background: ruta?.color ?? '#64748b' }}
                          aria-hidden="true"
                        />
                        <div className="flex items-center gap-2.5 mb-3">
                          <div
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0 shadow-sm"
                            style={{ background: ruta?.color ?? '#64748b' }}
                          >
                            {cliente.nombre
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 truncate text-sm sm:text-base leading-tight">
                              {cliente.nombre}
                            </h4>
                            <p className="text-[11px] text-slate-500">Sin préstamo</p>
                          </div>
                          <div className="flex-shrink-0">
                            <ActionMenu
                              actions={[
                                {
                                  label: 'Editar cliente',
                                  icon: Pencil,
                                  onClick: () => setModalCliente({ editar: cliente }),
                                },
                                {
                                  label: 'Eliminar cliente',
                                  icon: Trash2,
                                  danger: true,
                                  onClick: () => setConfirmBorrarCliente(cliente),
                                },
                              ]}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => setModalPrestamo(cliente.id)}
                          className="mt-auto w-full px-3 py-2 rounded-lg bg-brand-gradient text-white text-xs font-semibold hover:opacity-95 active:scale-95 transition-all shadow-brand-sm inline-flex items-center justify-center gap-1"
                        >
                          <Banknote size={13} /> Prestar
                        </button>
                      </div>
                    );
                  }
                  return (
                    <ClienteCard
                      key={prestamo.id}
                      cliente={cliente}
                      prestamo={prestamo}
                      ruta={ruta}
                      onPagar={handleCobrar}
                      onDetalle={setModalDetalle}
                      onEditar={(c) => setModalCliente({ editar: c })}
                      onEliminar={setConfirmBorrarCliente}
                      onEliminarPrestamo={setConfirmBorrarPrestamo}
                    />
                  );
                })}
              </div>
              <Paginacion
                pagina={pag.pagina}
                totalPaginas={pag.totalPaginas}
                total={pag.total}
                hayAnterior={pag.hayAnterior}
                haySiguiente={pag.haySiguiente}
                anterior={pag.anterior}
                siguiente={pag.siguiente}
              />
            </>
          ) : (
            <EmptyState
              icon={Search}
              title="Sin resultados"
              description="Probá con otros criterios de búsqueda o filtros."
            />
          )}
        </>
      )}

      {modalDetalle && (
        <ModalDetalle prestamoId={modalDetalle} onClose={() => setModalDetalle(null)} />
      )}
      {modalCliente?.nuevo && <ModalNuevoCliente onClose={() => setModalCliente(null)} />}
      {modalCliente?.editar && (
        <ModalNuevoCliente onClose={() => setModalCliente(null)} cliente={modalCliente.editar} />
      )}
      {modalPrestamo && (
        <ModalNuevoPrestamo
          onClose={() => setModalPrestamo(null)}
          clienteIdInicial={modalPrestamo}
        />
      )}

      {confirmBorrarCliente && (
        <ConfirmDialog
          title={`Eliminar a ${confirmBorrarCliente.nombre}`}
          message="Se eliminarán también su préstamo y movimientos. Esta acción no se puede deshacer."
          confirmText="Eliminar cliente"
          onConfirm={handleEliminarCliente}
          onClose={() => setConfirmBorrarCliente(null)}
        />
      )}
      {confirmBorrarPrestamo && (
        <ConfirmDialog
          title="Eliminar préstamo"
          message="Se eliminará el préstamo junto con todos sus movimientos de cobro. Esta acción no se puede deshacer."
          confirmText="Eliminar préstamo"
          onConfirm={handleEliminarPrestamo}
          onClose={() => setConfirmBorrarPrestamo(null)}
        />
      )}
    </div>
  );
}
