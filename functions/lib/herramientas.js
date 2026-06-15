import { diasDeAtraso, hoy } from './calculos.js';

const LIMITE_DEFAULT = 20;

const leer = async (db, col) => {
  const snap = await db.collection(col).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

const pagadoDe = (c) => (c.pagada ? (c.pagado ?? c.monto) : (c.pagado ?? 0));

// ── Definiciones (lo que ve Claude) ───────────────────────────────────────────
export const definicionesTools = [
  {
    name: 'obtener_metricas',
    description:
      'Métricas de la cartera: cobrado, por cobrar, capital en calle, monto en mora y cuotas en mora, ganancia proyectada. Opcional filtrar por rutaId.',
    input_schema: {
      type: 'object',
      properties: { rutaId: { type: 'string', description: 'ID de ruta para filtrar (opcional)' } },
    },
  },
  {
    name: 'listar_clientes_en_mora',
    description:
      'Clientes con cuotas vencidas impagas, ordenados por días de atraso desc. Devuelve nombre, ruta, días de atraso, monto pendiente.',
    input_schema: {
      type: 'object',
      properties: {
        rutaId: { type: 'string', description: 'Filtrar por ruta (opcional)' },
        limite: { type: 'integer', description: 'Máximo de clientes (default 20)' },
      },
    },
  },
  {
    name: 'buscar_cliente',
    description:
      'Busca un cliente por nombre o DNI y devuelve sus datos (incluye DNI y teléfono), préstamos y estado de cuotas.',
    input_schema: {
      type: 'object',
      properties: { texto: { type: 'string', description: 'Nombre o DNI a buscar' } },
      required: ['texto'],
    },
  },
  {
    name: 'clientes_para_renovar',
    description:
      'Clientes con préstamo finalizado o con ≥80% de cuotas pagadas, candidatos a renovar. Opcional por rutaId.',
    input_schema: {
      type: 'object',
      properties: { rutaId: { type: 'string', description: 'Filtrar por ruta (opcional)' } },
    },
  },
  {
    name: 'listar_rutas',
    description: 'Lista las rutas con su nombre y cobrador.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'proxima_cobranza',
    description:
      'Cuotas pendientes que vencen en los próximos N días (default 7), con cliente, monto y fecha.',
    input_schema: {
      type: 'object',
      properties: { dias: { type: 'integer', description: 'Horizonte en días (default 7)' } },
    },
  },
];

// ── Ejecutores ────────────────────────────────────────────────────────────────
async function obtenerMetricas(db, { rutaId }, hoyStr) {
  const [clientes, prestamos] = await Promise.all([leer(db, 'clientes'), leer(db, 'prestamos')]);
  const clientePorId = new Map(clientes.map((c) => [c.id, c]));
  const filtrados = rutaId
    ? prestamos.filter((p) => clientePorId.get(p.clienteId)?.rutaId === rutaId)
    : prestamos;

  let cobrado = 0,
    porCobrar = 0,
    enCalle = 0,
    montoMora = 0,
    cuotasMora = 0,
    ganancia = 0;
  for (const p of filtrados) {
    const capital = p.monto ?? 0;
    if (p.estado === 'activo' || p.estado === 'mora') enCalle += capital;
    const cuotas = p.cuotasDetalle ?? [];
    const total = cuotas.reduce((s, c) => s + c.monto, 0);
    ganancia += total - capital;
    for (const c of cuotas) {
      const pg = pagadoDe(c);
      cobrado += pg;
      const pend = c.monto - pg;
      if (pend > 0) {
        porCobrar += pend;
        if (diasDeAtraso(c, hoyStr) > 0) {
          cuotasMora += 1;
          montoMora += pend;
        }
      }
    }
  }
  return {
    cobrado,
    porCobrar,
    capitalEnCalle: enCalle,
    montoMora,
    cuotasEnMora: cuotasMora,
    gananciaProyectada: ganancia,
  };
}

async function listarClientesEnMora(db, { rutaId, limite = LIMITE_DEFAULT }, hoyStr) {
  const [clientes, prestamos, rutas] = await Promise.all([
    leer(db, 'clientes'),
    leer(db, 'prestamos'),
    leer(db, 'rutas'),
  ]);
  const clientePorId = new Map(clientes.map((c) => [c.id, c]));
  const rutaPorId = new Map(rutas.map((r) => [r.id, r]));
  const filas = [];
  for (const p of prestamos) {
    const cli = clientePorId.get(p.clienteId);
    if (!cli) continue;
    if (rutaId && cli.rutaId !== rutaId) continue;
    for (const c of p.cuotasDetalle ?? []) {
      const atraso = diasDeAtraso(c, hoyStr);
      if (atraso > 0) {
        filas.push({
          nombre: cli.nombre,
          ruta: rutaPorId.get(cli.rutaId)?.nombre ?? null,
          diasAtraso: atraso,
          montoPendiente: c.monto - pagadoDe(c),
          cuotaNro: c.nro,
        });
      }
    }
  }
  filas.sort((a, b) => b.diasAtraso - a.diasAtraso);
  return { clientes: filas.slice(0, limite), total: filas.length };
}

async function buscarCliente(db, { texto }) {
  const q = String(texto ?? '')
    .toLowerCase()
    .trim();
  const [clientes, prestamos] = await Promise.all([leer(db, 'clientes'), leer(db, 'prestamos')]);
  const cli = clientes.find(
    (c) => c.nombre?.toLowerCase().includes(q) || String(c.dni ?? '').includes(q),
  );
  if (!cli) return { encontrado: false };
  const sus = prestamos
    .filter((p) => p.clienteId === cli.id)
    .map((p) => {
      const cuotas = p.cuotasDetalle ?? [];
      return {
        estado: p.estado,
        monto: p.monto,
        cuotasPagadas: cuotas.filter((c) => c.pagada).length,
        cuotasTotales: cuotas.length,
        proxima: cuotas.find((c) => !c.pagada)?.vencimiento ?? null,
      };
    });
  return {
    encontrado: true,
    cliente: {
      nombre: cli.nombre,
      dni: cli.dni ?? null,
      tel: cli.tel ?? null,
      bcra: cli.bcra ?? null,
    },
    prestamos: sus,
  };
}

async function clientesParaRenovar(db, { rutaId }) {
  const [clientes, prestamos] = await Promise.all([leer(db, 'clientes'), leer(db, 'prestamos')]);
  const clientePorId = new Map(clientes.map((c) => [c.id, c]));
  const out = [];
  for (const p of prestamos) {
    const cli = clientePorId.get(p.clienteId);
    if (!cli) continue;
    if (rutaId && cli.rutaId !== rutaId) continue;
    const cuotas = p.cuotasDetalle ?? [];
    const pagadas = cuotas.filter((c) => c.pagada).length;
    const ratio = cuotas.length ? pagadas / cuotas.length : 0;
    if (p.estado === 'finalizado' || ratio >= 0.8) {
      out.push({ nombre: cli.nombre, estado: p.estado, avance: Math.round(ratio * 100) });
    }
  }
  return { clientes: out };
}

async function listarRutas(db) {
  const rutas = await leer(db, 'rutas');
  return {
    rutas: rutas.map((r) => ({ id: r.id, nombre: r.nombre, cobrador: r.cobrador ?? null })),
  };
}

async function proximaCobranza(db, { dias = 7 }, hoyStr) {
  const [clientes, prestamos] = await Promise.all([leer(db, 'clientes'), leer(db, 'prestamos')]);
  const clientePorId = new Map(clientes.map((c) => [c.id, c]));
  const limite = new Date(hoyStr + 'T00:00:00');
  limite.setDate(limite.getDate() + dias);
  const limiteStr = limite.toISOString().slice(0, 10);
  const filas = [];
  for (const p of prestamos) {
    const cli = clientePorId.get(p.clienteId);
    if (!cli) continue;
    for (const c of p.cuotasDetalle ?? []) {
      if (!c.pagada && c.vencimiento >= hoyStr && c.vencimiento <= limiteStr) {
        filas.push({
          nombre: cli.nombre,
          monto: c.monto - pagadoDe(c),
          vencimiento: c.vencimiento,
        });
      }
    }
  }
  filas.sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
  return { cuotas: filas, total: filas.length };
}

const EJECUTORES = {
  obtener_metricas: obtenerMetricas,
  listar_clientes_en_mora: listarClientesEnMora,
  buscar_cliente: buscarCliente,
  clientes_para_renovar: clientesParaRenovar,
  listar_rutas: listarRutas,
  proxima_cobranza: proximaCobranza,
};

export async function ejecutarTool(db, nombre, input, hoyStr = hoy()) {
  const fn = EJECUTORES[nombre];
  if (!fn) throw new Error(`Herramienta desconocida: ${nombre}`);
  return fn(db, input ?? {}, hoyStr);
}
