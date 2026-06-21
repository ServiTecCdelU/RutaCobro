import { useMemo, useState, useEffect } from 'react';
import { Search, Filter, UserPlus, Users } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { diasDeAtraso } from '@/utils/calculos';
import { useToast } from '@/components/ui/Toast';
import { useCobrar } from '@/hooks/useCobrar';
import { usePaginacion } from '@/hooks/usePaginacion';
import Paginacion from '@/components/ui/Paginacion';
import RutaSelector from '@/components/ui/RutaSelector';
import ErrorBanner from '@/components/ui/ErrorBanner';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { RowSkeleton } from '@/components/ui/Skeleton';
import ClienteCard from '@/components/clientes/ClienteCard';
import ModalDetalle from '@/components/modals/ModalDetalle';
import ModalNuevoCliente from '@/components/modals/ModalNuevoCliente';
import ModalNuevoPrestamo from '@/components/modals/ModalNuevoPrestamo';

export default function Clientes() {
  const { clientes, prestamos, rutas, eliminarCliente, eliminarPrestamo, esAdmin, error, syncing } =
    useApp();
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
      if (filtroEstado === 'sin-prestamo') return false;
      if (filtroEstado === 'finalizado') return prestamo.estado === 'finalizado';
      if (filtroEstado === 'mora') {
        return (prestamo.cuotasDetalle ?? []).some((c) => !c.pagada && diasDeAtraso(c) > 0);
      }
      if (filtroEstado === 'activo') return prestamo.estado === 'activo';
      // 'todos': lista del día a día — se ocultan los finalizados (van en su propio chip)
      return prestamo.estado !== 'finalizado';
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
      let agregados = 0;
      for (const prestamo of ps) {
        if (matchEstado(prestamo)) {
          rows.push({ cliente, prestamo });
          agregados++;
        }
      }
      // En "Todos": cliente con préstamos pero todos finalizados → fila para re-prestar
      if (agregados === 0 && filtroEstado === 'todos') {
        rows.push({ cliente, prestamo: null, soloFinalizados: true });
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-display">
            Clientes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
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

      {syncing && clientes.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 shadow-card divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : clientes.length === 0 ? (
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
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
            </div>
            <button
              onClick={() => setShowFiltros((v) => !v)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                showFiltros
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <Filter size={15} /> Filtros
            </button>
          </div>

          {showFiltros && (
            <div className="flex flex-col gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 shadow-card">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Estado
                </p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    ['todos', 'Todos'],
                    ['activo', 'Activos'],
                    ['mora', 'En mora'],
                    ['finalizado', 'Finalizados'],
                    ['sin-prestamo', 'Sin préstamo'],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setFiltroEstado(val)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        filtroEstado === val
                          ? 'bg-brand-600 text-white shadow-brand-sm'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {rutas.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Ruta
                  </p>
                  <RutaSelector rutas={rutas} rutaActiva={rutaActiva} onSelect={setRutaActiva} />
                </div>
              )}
            </div>
          )}

          {items.length > 0 ? (
            <>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 shadow-card divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
                {pag.items.map(({ cliente, prestamo, soloFinalizados }) => {
                  const ruta = rutas.find((r) => r.id === cliente.rutaId);
                  return (
                    <ClienteCard
                      key={prestamo ? prestamo.id : `sin-${cliente.id}`}
                      cliente={cliente}
                      prestamo={prestamo}
                      soloFinalizados={soloFinalizados}
                      ruta={ruta}
                      onPagar={handleCobrar}
                      onPrestar={setModalPrestamo}
                      onDetalle={setModalDetalle}
                      onEditar={(c) => setModalCliente({ editar: c })}
                      onEliminar={esAdmin ? setConfirmBorrarCliente : null}
                      onEliminarPrestamo={esAdmin ? setConfirmBorrarPrestamo : null}
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
