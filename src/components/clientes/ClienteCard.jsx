import { memo } from 'react';
import { MapPin, Phone, AlertTriangle, Pencil, Trash2, Banknote, FileX, MessageCircle } from 'lucide-react';
import { formatMoney, formatFecha, linkWhatsApp } from '@/utils/formatters';
import { diasDeAtraso } from '@/utils/calculos';
import ActionMenu from '@/components/ui/ActionMenu';

function ClienteCard({
  cliente, prestamo, ruta,
  onPagar, onDetalle, onEditar, onEliminar, onEliminarPrestamo,
}) {
  const cuotas = prestamo.cuotasDetalle ?? [];
  const pagadas = cuotas.filter(c => c.pagada).length;
  const progreso = cuotas.length > 0 ? (pagadas / cuotas.length) * 100 : 0;
  const proxima = cuotas.find(c => !c.pagada);
  const atraso = proxima ? diasDeAtraso(proxima) : 0;
  const enMora = atraso > 0;
  const color = ruta?.color ?? '#64748b';

  const mensajeWpp = proxima
    ? `Hola ${cliente.nombre.split(' ')[0]}, te recuerdo la cuota ${proxima.nro} de ${formatMoney(proxima.monto)} que vence el ${formatFecha(proxima.vencimiento)}. ¡Gracias!`
    : `Hola ${cliente.nombre.split(' ')[0]}, gracias por haber finalizado el préstamo.`;
  const wppUrl = linkWhatsApp(cliente.tel, mensajeWpp);

  const menuActions = [
    ...(wppUrl ? [{
      label: 'Recordatorio por WhatsApp',
      icon: MessageCircle,
      onClick: () => window.open(wppUrl, '_blank', 'noopener'),
    }] : []),
    { label: 'Editar cliente', icon: Pencil, onClick: () => onEditar(cliente) },
    { label: 'Eliminar préstamo', icon: FileX, danger: true, onClick: () => onEliminarPrestamo(prestamo) },
    { label: 'Eliminar cliente', icon: Trash2, danger: true, onClick: () => onEliminar(cliente) },
  ];

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200/70 p-4 pl-5 hover:border-slate-300 hover:shadow-card-hover transition-all shadow-card overflow-hidden">
      <span
        className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
        style={{ background: color }}
        aria-hidden="true"
      />
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm"
          style={{ background: color }}
        >
          {cliente.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-semibold text-slate-900 truncate">{cliente.nombre}</h4>
            {enMora && (
              <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 ring-1 ring-rose-200/70">
                <AlertTriangle size={9} /> {atraso}d mora
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 mb-3">
            {cliente.direccion && (
              <span className="flex items-center gap-1"><MapPin size={11} />{cliente.direccion}</span>
            )}
            {cliente.tel && (
              <span className="flex items-center gap-1"><Phone size={11} />{cliente.tel}</span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progreso}%`, background: enMora ? '#f43f5e' : color }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-600 flex-shrink-0 tabular-nums">{pagadas}/{cuotas.length}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Próxima: <span className="font-semibold text-slate-700 tabular-nums">
                {proxima ? formatMoney(proxima.monto) : 'Finalizado'}
              </span>
            </span>
            {proxima && (
              <span className="text-slate-500">
                Vence: <span className="font-semibold text-slate-700 tabular-nums">{formatFecha(proxima.vencimiento)}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-start gap-1">
            <button
              onClick={() => onPagar(prestamo.id)}
              disabled={!proxima}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-emerald/50 inline-flex items-center gap-1"
            >
              <Banknote size={13} /> Cobrar
            </button>
            <ActionMenu actions={menuActions} />
          </div>
          <button
            onClick={() => onDetalle(prestamo.id)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
          >
            Detalle
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ClienteCard);
