import React, { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Wallet, Users, AlertCircle, CheckCircle2,
  Plus, Search, MapPin, Calendar, DollarSign, Phone, MessageCircle,
  Filter, Download, MoreVertical, ArrowUpRight, ArrowDownRight,
  Clock, Target, Activity, ChevronRight, X, User, CreditCard,
  AlertTriangle, Banknote, Route, BarChart3
} from 'lucide-react';

// ============ DATOS MOCK REALISTAS ============
const RUTAS_INICIALES = [
  { id: 'r1', nombre: 'Centro', color: '#10b981', cobrador: 'Darío M.' },
  { id: 'r2', nombre: 'Norte', color: '#f59e0b', cobrador: 'Lucas P.' },
  { id: 'r3', nombre: 'Sur', color: '#8b5cf6', cobrador: 'Ana R.' },
  { id: 'r4', nombre: 'Oeste', color: '#ef4444', cobrador: 'Diego S.' },
];

const CLIENTES_INICIALES = [
  { id: 'c1', nombre: 'Fátima Bernardo', dni: '32.456.789', tel: '3442-456789', rutaId: 'r1', direccion: 'San Martín 1234' },
  { id: 'c2', nombre: 'Braian Correa', dni: '38.123.456', tel: '3442-789123', rutaId: 'r1', direccion: 'Belgrano 567' },
  { id: 'c3', nombre: 'Alicia Ozuna', dni: '25.987.654', tel: '3442-321654', rutaId: 'r2', direccion: 'Mitre 890' },
  { id: 'c4', nombre: 'Antonia Fernández', dni: '29.456.123', tel: '3442-654987', rutaId: 'r2', direccion: 'Sarmiento 234' },
  { id: 'c5', nombre: 'Wilma Godoy', dni: '34.789.012', tel: '3442-987321', rutaId: 'r3', direccion: 'Alberdi 678' },
  { id: 'c6', nombre: 'José Silva', dni: '27.345.678', tel: '3442-234567', rutaId: 'r3', direccion: 'Rivadavia 345' },
  { id: 'c7', nombre: 'Estela Rivero', dni: '31.876.543', tel: '3442-876543', rutaId: 'r4', direccion: 'Urquiza 901' },
  { id: 'c8', nombre: 'Carlos Méndez', dni: '26.543.210', tel: '3442-543210', rutaId: 'r1', direccion: '9 de Julio 456' },
];

// Generar préstamos con cuotas
const hoy = new Date('2026-04-18');
const fmtFecha = (d) => d.toISOString().split('T')[0];
const sumarDias = (fecha, dias) => {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
};

const generarCuotas = (monto, interes, cantCuotas, fechaInicio, frecuenciaDias = 7) => {
  const totalConInteres = monto * (1 + interes / 100);
  const valorCuota = Math.round(totalConInteres / cantCuotas);
  return Array.from({ length: cantCuotas }, (_, i) => ({
    nro: i + 1,
    monto: valorCuota,
    vencimiento: fmtFecha(sumarDias(fechaInicio, frecuenciaDias * (i + 1))),
    pagada: false,
    fechaPago: null,
  }));
};

const PRESTAMOS_INICIALES = [
  {
    id: 'p1', clienteId: 'c1', monto: 150000, interes: 30, cuotas: 12,
    fechaInicio: '2026-02-10', estado: 'activo',
    cuotasDetalle: (() => {
      const c = generarCuotas(150000, 30, 12, '2026-02-10');
      // Marcar 9 cuotas pagadas
      for (let i = 0; i < 9; i++) { c[i].pagada = true; c[i].fechaPago = c[i].vencimiento; }
      return c;
    })()
  },
  {
    id: 'p2', clienteId: 'c2', monto: 80000, interes: 25, cuotas: 8,
    fechaInicio: '2026-03-01', estado: 'activo',
    cuotasDetalle: (() => {
      const c = generarCuotas(80000, 25, 8, '2026-03-01');
      for (let i = 0; i < 6; i++) { c[i].pagada = true; c[i].fechaPago = c[i].vencimiento; }
      return c;
    })()
  },
  {
    id: 'p3', clienteId: 'c3', monto: 200000, interes: 35, cuotas: 10,
    fechaInicio: '2026-01-20', estado: 'mora',
    cuotasDetalle: (() => {
      const c = generarCuotas(200000, 35, 10, '2026-01-20');
      for (let i = 0; i < 6; i++) { c[i].pagada = true; c[i].fechaPago = c[i].vencimiento; }
      return c;
    })()
  },
  {
    id: 'p4', clienteId: 'c4', monto: 120000, interes: 30, cuotas: 10,
    fechaInicio: '2026-02-15', estado: 'activo',
    cuotasDetalle: (() => {
      const c = generarCuotas(120000, 30, 10, '2026-02-15');
      for (let i = 0; i < 7; i++) { c[i].pagada = true; c[i].fechaPago = c[i].vencimiento; }
      return c;
    })()
  },
  {
    id: 'p5', clienteId: 'c5', monto: 50000, interes: 20, cuotas: 5,
    fechaInicio: '2026-03-20', estado: 'activo',
    cuotasDetalle: (() => {
      const c = generarCuotas(50000, 20, 5, '2026-03-20');
      for (let i = 0; i < 3; i++) { c[i].pagada = true; c[i].fechaPago = c[i].vencimiento; }
      return c;
    })()
  },
  {
    id: 'p6', clienteId: 'c6', monto: 150000, interes: 30, cuotas: 12,
    fechaInicio: '2026-04-15', estado: 'activo',
    cuotasDetalle: generarCuotas(150000, 30, 12, '2026-04-15'),
  },
  {
    id: 'p7', clienteId: 'c7', monto: 200000, interes: 35, cuotas: 10,
    fechaInicio: '2026-04-15', estado: 'activo',
    cuotasDetalle: generarCuotas(200000, 35, 10, '2026-04-15'),
  },
  {
    id: 'p8', clienteId: 'c8', monto: 90000, interes: 25, cuotas: 8,
    fechaInicio: '2025-12-10', estado: 'mora',
    cuotasDetalle: (() => {
      const c = generarCuotas(90000, 25, 8, '2025-12-10');
      for (let i = 0; i < 5; i++) { c[i].pagada = true; c[i].fechaPago = c[i].vencimiento; }
      return c;
    })()
  },
];

// ============ HELPERS ============
const formatMoney = (n) => '$' + n.toLocaleString('es-AR');
const formatFecha = (d) => {
  const fecha = new Date(d);
  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
};

const diasDeAtraso = (cuota) => {
  if (cuota.pagada) return 0;
  const venc = new Date(cuota.vencimiento);
  const diff = Math.floor((hoy - venc) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};

// ============ COMPONENTES ============
function MetricCard({ label, value, change, icon: Icon, accent, sublabel }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-5 hover:border-slate-300 transition-all group">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 group-hover:opacity-10 transition-opacity" style={{ background: accent, transform: 'translate(30%, -30%)' }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>
          <Icon size={20} strokeWidth={2.2} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${change >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
            {change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
      {sublabel && <div className="text-xs text-slate-500 mt-1">{sublabel}</div>}
    </div>
  );
}

function MiniBarChart({ data, color }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t transition-all hover:opacity-80"
          style={{ height: `${(v / max) * 100}%`, background: color, minHeight: '4px', opacity: 0.3 + (v / max) * 0.7 }}
        />
      ))}
    </div>
  );
}

function RutaSelector({ rutas, rutaActiva, onSelect }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => onSelect('all')}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap text-sm font-semibold transition-all ${
          rutaActiva === 'all'
            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
            : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
        }`}
      >
        <Route size={15} />
        Todas las rutas
      </button>
      {rutas.map(r => (
        <button
          key={r.id}
          onClick={() => onSelect(r.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap text-sm font-semibold transition-all ${
            rutaActiva === r.id
              ? 'text-white shadow-lg'
              : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
          }`}
          style={rutaActiva === r.id ? { background: r.color, boxShadow: `0 10px 25px -5px ${r.color}40` } : {}}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: rutaActiva === r.id ? 'white' : r.color }} />
          {r.nombre}
        </button>
      ))}
    </div>
  );
}

function ClienteRow({ cliente, prestamo, ruta, onPagar, onDetalle }) {
  const cuotasPagas = prestamo.cuotasDetalle.filter(c => c.pagada).length;
  const totalCuotas = prestamo.cuotasDetalle.length;
  const progreso = (cuotasPagas / totalCuotas) * 100;
  const proximaCuota = prestamo.cuotasDetalle.find(c => !c.pagada);
  const atraso = proximaCuota ? diasDeAtraso(proximaCuota) : 0;
  const enMora = atraso > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: ruta?.color || '#64748b' }}>
          {cliente.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-slate-900 truncate">{cliente.nombre}</h4>
            {enMora && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                <AlertTriangle size={10} /> Mora {atraso}d
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
            <span className="flex items-center gap-1"><MapPin size={11} />{cliente.direccion}</span>
            <span className="flex items-center gap-1"><Phone size={11} />{cliente.tel}</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progreso}%`, background: enMora ? '#ef4444' : ruta?.color || '#10b981' }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-600">{cuotasPagas}/{totalCuotas}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Próxima cuota: <span className="font-semibold text-slate-700">{proximaCuota ? formatMoney(proximaCuota.monto) : '—'}</span></span>
            <span className="text-slate-500">Vence: <span className="font-semibold text-slate-700">{proximaCuota ? formatFecha(proximaCuota.vencimiento) : '—'}</span></span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onPagar(prestamo.id)}
            disabled={!proximaCuota}
            className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Cobrar
          </button>
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

function ModalDetalle({ prestamo, cliente, ruta, onClose, onPagarCuota }) {
  if (!prestamo) return null;
  const totalDeuda = prestamo.cuotasDetalle.reduce((s, c) => s + (c.pagada ? 0 : c.monto), 0);
  const totalPagado = prestamo.cuotasDetalle.reduce((s, c) => s + (c.pagada ? c.monto : 0), 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold" style={{ background: ruta?.color }}>
              {cliente.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">{cliente.nombre}</h3>
              <p className="text-xs text-slate-500">DNI {cliente.dni} · {ruta?.nombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 p-6 bg-slate-50">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Capital</div>
            <div className="text-lg font-bold text-slate-900">{formatMoney(prestamo.monto)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Cobrado</div>
            <div className="text-lg font-bold text-emerald-700">{formatMoney(totalPagado)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 mb-1">Pendiente</div>
            <div className="text-lg font-bold text-rose-700">{formatMoney(totalDeuda)}</div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Cronograma de cuotas</div>
          <div className="space-y-2">
            {prestamo.cuotasDetalle.map((c) => {
              const atraso = diasDeAtraso(c);
              return (
                <div
                  key={c.nro}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    c.pagada
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : atraso > 0
                      ? 'bg-rose-50/50 border-rose-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    c.pagada ? 'bg-emerald-500 text-white' : atraso > 0 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {c.pagada ? <CheckCircle2 size={14} /> : c.nro}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-900">Cuota {c.nro}</div>
                    <div className="text-xs text-slate-500">
                      {c.pagada ? `Pagada el ${formatFecha(c.fechaPago)}` : `Vence ${formatFecha(c.vencimiento)}`}
                      {atraso > 0 && !c.pagada && <span className="text-rose-600 font-semibold ml-2">· {atraso} días de mora</span>}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-slate-900">{formatMoney(c.monto)}</div>
                  {!c.pagada && (
                    <button
                      onClick={() => onPagarCuota(prestamo.id, c.nro)}
                      className="px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                    >
                      Cobrar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalNuevoPrestamo({ clientes, rutas, onClose, onCrear }) {
  const [clienteId, setClienteId] = useState(clientes[0]?.id || '');
  const [monto, setMonto] = useState(100000);
  const [interes, setInteres] = useState(30);
  const [cuotas, setCuotas] = useState(10);

  const totalConInteres = monto * (1 + interes / 100);
  const valorCuota = Math.round(totalConInteres / cuotas);
  const ganancia = totalConInteres - monto;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Nuevo préstamo</h3>
            <p className="text-xs text-slate-500">Calculá las cuotas automáticamente</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Cliente</label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-slate-900"
            >
              {clientes.map(c => {
                const ruta = rutas.find(r => r.id === c.rutaId);
                return <option key={c.id} value={c.id}>{c.nombre} · {ruta?.nombre}</option>;
              })}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Capital</label>
              <input
                type="number"
                value={monto}
                onChange={(e) => setMonto(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Interés %</label>
              <input
                type="number"
                value={interes}
                onChange={(e) => setInteres(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">Cantidad de cuotas semanales</label>
            <input
              type="range"
              min="2"
              max="20"
              value={cuotas}
              onChange={(e) => setCuotas(Number(e.target.value))}
              className="w-full accent-slate-900"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>2</span>
              <span className="font-bold text-slate-900 text-base">{cuotas} cuotas</span>
              <span>20</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl p-4 text-white">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Cuota</div>
                <div className="text-2xl font-bold">{formatMoney(valorCuota)}</div>
                <div className="text-[10px] text-slate-400">por semana</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Total a cobrar</div>
                <div className="text-2xl font-bold">{formatMoney(totalConInteres)}</div>
                <div className="text-[10px] text-emerald-400">+{formatMoney(ganancia)} ganancia</div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200">
            Cancelar
          </button>
          <button
            onClick={() => onCrear({ clienteId, monto, interes, cuotas })}
            className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800"
          >
            Crear préstamo
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ APP PRINCIPAL ============
export default function App() {
  const [clientes] = useState(CLIENTES_INICIALES);
  const [rutas] = useState(RUTAS_INICIALES);
  const [prestamos, setPrestamos] = useState(PRESTAMOS_INICIALES);
  const [rutaActiva, setRutaActiva] = useState('all');
  const [busqueda, setBusqueda] = useState('');
  const [modalDetalle, setModalDetalle] = useState(null);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [vista, setVista] = useState('dashboard'); // dashboard | clientes

  // Métricas calculadas
  const metricas = useMemo(() => {
    const prestamosFiltrados = rutaActiva === 'all'
      ? prestamos
      : prestamos.filter(p => {
          const cli = clientes.find(c => c.id === p.clienteId);
          return cli?.rutaId === rutaActiva;
        });

    const todaslasCuotas = prestamosFiltrados.flatMap(p => p.cuotasDetalle);
    const cuotasPagadas = todaslasCuotas.filter(c => c.pagada);
    const cuotasPendientes = todaslasCuotas.filter(c => !c.pagada);

    const cobradoTotal = cuotasPagadas.reduce((s, c) => s + c.monto, 0);
    const porCobrar = cuotasPendientes.reduce((s, c) => s + c.monto, 0);
    const colocado = prestamosFiltrados.reduce((s, p) => s + p.monto, 0);
    const enMora = cuotasPendientes.filter(c => diasDeAtraso(c) > 0);
    const montoMora = enMora.reduce((s, c) => s + c.monto, 0);
    const tasaMora = todaslasCuotas.length > 0 ? (enMora.length / todaslasCuotas.length) * 100 : 0;

    // Cuotas que vencen hoy
    const hoyStr = fmtFecha(hoy);
    const cuotasHoy = cuotasPendientes.filter(c => c.vencimiento === hoyStr);
    const aCobrarHoy = cuotasHoy.reduce((s, c) => s + c.monto, 0);

    // Datos de evolución (últimos 7 días simulados)
    const evolucion = [42000, 58000, 71000, 65000, 89000, 76000, 95000];

    return { cobradoTotal, porCobrar, colocado, montoMora, tasaMora, aCobrarHoy, cuotasHoy: cuotasHoy.length, evolucion, enMora: enMora.length };
  }, [prestamos, clientes, rutaActiva]);

  const clientesFiltrados = useMemo(() => {
    return clientes
      .filter(c => rutaActiva === 'all' || c.rutaId === rutaActiva)
      .filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()))
      .map(c => {
        const prestamo = prestamos.find(p => p.clienteId === c.id);
        return { cliente: c, prestamo };
      })
      .filter(x => x.prestamo);
  }, [clientes, prestamos, rutaActiva, busqueda]);

  const pagarCuota = (prestamoId, nroCuota) => {
    setPrestamos(prev => prev.map(p => {
      if (p.id !== prestamoId) return p;
      return {
        ...p,
        cuotasDetalle: p.cuotasDetalle.map(c =>
          c.nro === nroCuota ? { ...c, pagada: true, fechaPago: fmtFecha(hoy) } : c
        ),
      };
    }));
  };

  const cobrarSiguiente = (prestamoId) => {
    const p = prestamos.find(pr => pr.id === prestamoId);
    const proxima = p.cuotasDetalle.find(c => !c.pagada);
    if (proxima) pagarCuota(prestamoId, proxima.nro);
  };

  const crearPrestamo = ({ clienteId, monto, interes, cuotas }) => {
    const nuevo = {
      id: 'p' + Date.now(),
      clienteId, monto, interes, cuotas,
      fechaInicio: fmtFecha(hoy),
      estado: 'activo',
      cuotasDetalle: generarCuotas(monto, interes, cuotas, fmtFecha(hoy)),
    };
    setPrestamos(prev => [nuevo, ...prev]);
    setModalNuevo(false);
  };

  const detallePrestamo = modalDetalle ? prestamos.find(p => p.id === modalDetalle) : null;
  const detalleCliente = detallePrestamo ? clientes.find(c => c.id === detallePrestamo.clienteId) : null;
  const detalleRuta = detalleCliente ? rutas.find(r => r.id === detalleCliente.rutaId) : null;

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 backdrop-blur-xl bg-white/90">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
                <Banknote size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-base leading-none">RutaCobro</div>
                <div className="text-[10px] text-slate-500 font-medium">Gestión de cartera</div>
              </div>
            </div>
            <nav className="flex items-center gap-1">
              <button
                onClick={() => setVista('dashboard')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  vista === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tablero
              </button>
              <button
                onClick={() => setVista('clientes')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  vista === 'clientes' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Clientes
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setModalNuevo(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 shadow-lg shadow-slate-900/10"
            >
              <Plus size={16} /> Nuevo préstamo
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
              D
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* SELECTOR DE RUTAS */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {vista === 'dashboard' ? 'Resumen de hoy' : 'Cartera de clientes'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {vista === 'dashboard'
                ? 'Sábado, 18 de abril de 2026'
                : `${clientesFiltrados.length} clientes activos`}
            </p>
          </div>
          <RutaSelector rutas={rutas} rutaActiva={rutaActiva} onSelect={setRutaActiva} />
        </div>

        {vista === 'dashboard' && (
          <>
            {/* MÉTRICAS PRINCIPALES */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Cobrado total"
                value={formatMoney(metricas.cobradoTotal)}
                change={12.5}
                icon={TrendingUp}
                accent="#10b981"
                sublabel="Acumulado en cartera"
              />
              <MetricCard
                label="Por cobrar hoy"
                value={formatMoney(metricas.aCobrarHoy)}
                icon={Calendar}
                accent="#3b82f6"
                sublabel={`${metricas.cuotasHoy} cuotas vencen hoy`}
              />
              <MetricCard
                label="Capital colocado"
                value={formatMoney(metricas.colocado)}
                change={8.2}
                icon={Wallet}
                accent="#8b5cf6"
                sublabel="En préstamos activos"
              />
              <MetricCard
                label="En mora"
                value={formatMoney(metricas.montoMora)}
                change={-3.1}
                icon={AlertCircle}
                accent="#ef4444"
                sublabel={`${metricas.enMora} cuotas atrasadas (${metricas.tasaMora.toFixed(1)}%)`}
              />
            </div>

            {/* GRÁFICO Y RUTAS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-slate-900">Cobranza semanal</h3>
                    <p className="text-xs text-slate-500">Últimos 7 días</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    <ArrowUpRight size={12} /> +18.4%
                  </div>
                </div>
                <div className="flex items-end gap-2 h-40">
                  {metricas.evolucion.map((v, i) => {
                    const max = Math.max(...metricas.evolucion);
                    const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
                    const esHoy = i === metricas.evolucion.length - 1;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex-1 flex items-end">
                          <div
                            className="w-full rounded-t-lg transition-all hover:opacity-90 relative group"
                            style={{
                              height: `${(v / max) * 100}%`,
                              background: esHoy ? 'linear-gradient(to top, #0f172a, #475569)' : 'linear-gradient(to top, #cbd5e1, #e2e8f0)',
                            }}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white px-2 py-1 rounded-md shadow-md">
                              {formatMoney(v)}
                            </div>
                          </div>
                        </div>
                        <div className={`text-[10px] font-semibold ${esHoy ? 'text-slate-900' : 'text-slate-400'}`}>{dias[i]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900">Rendimiento por ruta</h3>
                    <p className="text-xs text-slate-500">Cobrado hoy</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {rutas.map(r => {
                    const pres = prestamos.filter(p => {
                      const cli = clientes.find(c => c.id === p.clienteId);
                      return cli?.rutaId === r.id;
                    });
                    const cobrado = pres.flatMap(p => p.cuotasDetalle).filter(c => c.pagada).reduce((s, c) => s + c.monto, 0);
                    const max = Math.max(...rutas.map(rr => {
                      const ps = prestamos.filter(p => {
                        const cli = clientes.find(c => c.id === p.clienteId);
                        return cli?.rutaId === rr.id;
                      });
                      return ps.flatMap(p => p.cuotasDetalle).filter(c => c.pagada).reduce((s, c) => s + c.monto, 0);
                    }));
                    return (
                      <div key={r.id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                            <span className="text-sm font-semibold text-slate-700">{r.nombre}</span>
                          </div>
                          <span className="text-sm font-bold text-slate-900">{formatMoney(cobrado)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(cobrado / max) * 100}%`, background: r.color }} />
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">{r.cobrador}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CUOTAS DEL DÍA */}
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Cuotas que vencen hoy</h3>
                  <p className="text-xs text-slate-500">{metricas.cuotasHoy} cuotas pendientes de cobro</p>
                </div>
                <button className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1">
                  Ver todas <ChevronRight size={14} />
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {clientesFiltrados.slice(0, 5).map(({ cliente, prestamo }) => {
                  const ruta = rutas.find(r => r.id === cliente.rutaId);
                  const proxima = prestamo.cuotasDetalle.find(c => !c.pagada);
                  if (!proxima) return null;
                  const atraso = diasDeAtraso(proxima);
                  return (
                    <div key={prestamo.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs" style={{ background: ruta?.color }}>
                        {cliente.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-sm">{cliente.nombre}</span>
                          {atraso > 0 && (
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">{atraso}d mora</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">Cuota {proxima.nro} de {prestamo.cuotasDetalle.length} · {ruta?.nombre}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{formatMoney(proxima.monto)}</div>
                        <div className="text-[10px] text-slate-500">Vence {formatFecha(proxima.vencimiento)}</div>
                      </div>
                      <button
                        onClick={() => cobrarSiguiente(prestamo.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors"
                      >
                        Cobrar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {vista === 'clientes' && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente por nombre..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-slate-900"
                />
              </div>
              <button className="px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 flex items-center gap-2 hover:border-slate-300">
                <Filter size={15} /> Filtros
              </button>
              <button className="px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 flex items-center gap-2 hover:border-slate-300">
                <Download size={15} /> Exportar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {clientesFiltrados.map(({ cliente, prestamo }) => {
                const ruta = rutas.find(r => r.id === cliente.rutaId);
                return (
                  <ClienteRow
                    key={cliente.id}
                    cliente={cliente}
                    prestamo={prestamo}
                    ruta={ruta}
                    onPagar={cobrarSiguiente}
                    onDetalle={setModalDetalle}
                  />
                );
              })}
            </div>

            {clientesFiltrados.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Users size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No se encontraron clientes</p>
              </div>
            )}
          </>
        )}
      </main>

      {detallePrestamo && (
        <ModalDetalle
          prestamo={detallePrestamo}
          cliente={detalleCliente}
          ruta={detalleRuta}
          onClose={() => setModalDetalle(null)}
          onPagarCuota={pagarCuota}
        />
      )}
      {modalNuevo && (
        <ModalNuevoPrestamo
          clientes={clientes}
          rutas={rutas}
          onClose={() => setModalNuevo(false)}
          onCrear={crearPrestamo}
        />
      )}
    </div>
  );
}
