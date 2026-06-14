import { memo } from 'react';
import { AlertTriangle, Pencil, Trash2, Banknote, FileX, MessageCircle } from 'lucide-react';
import { formatMoney, formatFecha, linkWhatsApp } from '@/utils/formatters';
import { diasDeAtraso } from '@/utils/calculos';
import ActionMenu from '@/components/ui/ActionMenu';

function Avatar({ nombre, color }) {
  const iniciales = nombre
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');
  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm"
      style={{ background: color }}
    >
      {iniciales}
    </div>
  );
}

function ClienteCard({
  cliente,
  prestamo,
  ruta,
  onPagar,
  onPrestar,
  onDetalle,
  onEditar,
  onEliminar,
  onEliminarPrestamo,
}) {
  const color = ruta?.color ?? '#64748b';

  // ── Fila sin préstamo ──
  if (!prestamo) {
    return (
      <div className="flex items-center gap-3 py-2.5 px-3 hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors">
        <Avatar nombre={cliente.nombre} color={color} />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate text-sm leading-tight">
            {cliente.nombre}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Sin préstamo</p>
        </div>
        <button
          onClick={() => onPrestar(cliente.id)}
          className="px-3 py-2 rounded-lg bg-brand-gradient text-white text-xs font-semibold hover:opacity-95 active:scale-95 transition-all shadow-brand-sm inline-flex items-center gap-1 flex-shrink-0"
        >
          <Banknote size={13} /> <span className="hidden sm:inline">Prestar</span>
        </button>
        <ActionMenu
          actions={[
            { label: 'Editar cliente', icon: Pencil, onClick: () => onEditar(cliente) },
            ...(onEliminar
              ? [
                  {
                    label: 'Eliminar cliente',
                    icon: Trash2,
                    danger: true,
                    onClick: () => onEliminar(cliente),
                  },
                ]
              : []),
          ]}
        />
      </div>
    );
  }

  const cuotas = prestamo.cuotasDetalle ?? [];
  const pagadas = cuotas.filter((c) => c.pagada).length;
  const progreso = cuotas.length > 0 ? (pagadas / cuotas.length) * 100 : 0;
  const proxima = cuotas.find((c) => !c.pagada);
  const atraso = proxima ? diasDeAtraso(proxima) : 0;
  const enMora = atraso > 0;

  const mensajeWpp = proxima
    ? `Hola ${cliente.nombre.split(' ')[0]}, te recuerdo la cuota ${proxima.nro} de ${formatMoney(proxima.monto)} que vence el ${formatFecha(proxima.vencimiento)}. ¡Gracias!`
    : `Hola ${cliente.nombre.split(' ')[0]}, gracias por haber finalizado el préstamo.`;
  const wppUrl = linkWhatsApp(cliente.tel, mensajeWpp);

  const menuActions = [
    ...(wppUrl
      ? [
          {
            label: 'Recordatorio por WhatsApp',
            icon: MessageCircle,
            onClick: () => window.open(wppUrl, '_blank', 'noopener'),
          },
        ]
      : []),
    { label: 'Editar cliente', icon: Pencil, onClick: () => onEditar(cliente) },
    ...(onEliminarPrestamo
      ? [
          {
            label: 'Eliminar préstamo',
            icon: FileX,
            danger: true,
            onClick: () => onEliminarPrestamo(prestamo),
          },
        ]
      : []),
    ...(onEliminar
      ? [
          {
            label: 'Eliminar cliente',
            icon: Trash2,
            danger: true,
            onClick: () => onEliminar(cliente),
          },
        ]
      : []),
  ];

  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-3 transition-colors ${
        enMora
          ? 'bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100/70 dark:hover:bg-rose-950/50'
          : 'hover:bg-slate-50/70 dark:hover:bg-slate-700/40'
      }`}
    >
      <Avatar nombre={cliente.nombre} color={color} />

      {/* Datos (toca para ver detalle) */}
      <button onClick={() => onDetalle(prestamo.id)} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate text-sm leading-tight">
            {cliente.nombre}
          </h4>
          {enMora && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 ring-1 ring-rose-200/70">
              <AlertTriangle size={9} /> {atraso}d
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {pagadas}/{cuotas.length}
          </span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="truncate">
            Próx:{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {proxima ? formatMoney(proxima.monto) : 'Finalizado'}
            </span>
            {proxima && (
              <span className="hidden sm:inline text-slate-400 dark:text-slate-500">
                {' '}
                · {formatFecha(proxima.vencimiento)}
              </span>
            )}
          </span>
        </div>
      </button>

      {/* Progreso (solo desktop) */}
      <div className="hidden md:block w-20 flex-shrink-0">
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progreso}%`, background: enMora ? '#f43f5e' : color }}
          />
        </div>
      </div>

      {/* Cobrar */}
      <button
        onClick={() => onPagar(prestamo.id)}
        disabled={!proxima}
        className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 inline-flex items-center gap-1 flex-shrink-0"
      >
        <Banknote size={13} /> <span className="hidden sm:inline">Cobrar</span>
      </button>

      <ActionMenu actions={menuActions} />
    </div>
  );
}

export default memo(ClienteCard);
