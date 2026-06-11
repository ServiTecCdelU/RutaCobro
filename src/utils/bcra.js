const BASE_URL = 'https://api.bcra.gob.ar/centraldedeudores/v1.0';
const PESOS_CUIT = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
const PREFIJOS_CUIL = ['20', '27', '23', '24'];

const NIVELES = {
  sinDatos: { nivel: 'sinDatos', label: 'Sin datos en BCRA', color: '#64748b' },
  ok: { nivel: 'ok', label: 'Situación normal', color: '#10b981' },
  precaucion: { nivel: 'precaucion', label: 'Riesgo bajo', color: '#f59e0b' },
  riesgo: { nivel: 'riesgo', label: 'Riesgo alto', color: '#f43f5e' },
};

const LABELS_SITUACION = {
  1: 'Situación normal',
  2: 'Riesgo bajo (atraso hasta 90 días)',
  3: 'Riesgo medio (atraso hasta 180 días)',
  4: 'Riesgo alto (atraso hasta 1 año)',
  5: 'Irrecuperable',
};

export const normalizarIdentificacion = (valor) => String(valor ?? '').replace(/\D/g, '');

const digitoVerificador = (diezDigitos) => {
  const suma = diezDigitos.split('').reduce((acc, d, i) => acc + Number(d) * PESOS_CUIT[i], 0);
  const resto = suma % 11;
  if (resto === 0) return 0;
  if (resto === 1) return null;
  return 11 - resto;
};

export const esCuitValido = (cuit) => {
  const limpio = normalizarIdentificacion(cuit);
  if (limpio.length !== 11) return false;
  return digitoVerificador(limpio.slice(0, 10)) === Number(limpio[10]);
};

/**
 * CUILs posibles para un DNI (prefijos 20/27/23/24 con dígito verificador válido).
 * @param {string|number} dni 7 u 8 dígitos
 * @returns {string[]}
 */
export const dniACuilCandidatos = (dni) => {
  const limpio = normalizarIdentificacion(dni);
  if (limpio.length < 7 || limpio.length > 8) return [];
  const dni8 = limpio.padStart(8, '0');
  const candidatos = [];
  for (const prefijo of PREFIJOS_CUIL) {
    const dv = digitoVerificador(prefijo + dni8);
    if (dv !== null) candidatos.push(prefijo + dni8 + dv);
  }
  return candidatos;
};

/**
 * Resume la respuesta de /Deudas: peor situación, deuda total y detalle por entidad.
 * Los montos del BCRA vienen en miles de pesos; deudaTotal se expresa en pesos.
 */
export const resumirDeudas = (respuesta) => {
  const periodo = respuesta?.results?.periodos?.[0];
  if (!periodo?.entidades?.length) return null;

  const entidades = [...periodo.entidades].sort((a, b) => (b.situacion ?? 0) - (a.situacion ?? 0));
  const deudaTotal = Math.round(entidades.reduce((acc, e) => acc + (e.monto ?? 0), 0) * 1000);

  return {
    denominacion: respuesta.results.denominacion ?? '',
    periodo: periodo.periodo,
    peorSituacion: entidades[0].situacion ?? null,
    deudaTotal,
    entidades: entidades.map((e) => ({
      entidad: e.entidad,
      situacion: e.situacion,
      monto: Math.round((e.monto ?? 0) * 1000),
      diasAtrasoPago: e.diasAtrasoPago ?? 0,
    })),
    tieneJudicial: entidades.some((e) => e.procesoJud),
    tieneRefinanciaciones: entidades.some((e) => e.refinanciaciones),
    enRevision: entidades.some((e) => e.enRevision),
  };
};

/** Resume la respuesta de /ChequesRechazados: cantidad y monto total. */
export const resumirCheques = (respuesta) => {
  const causales = respuesta?.results?.causales;
  if (!causales?.length) return null;
  let cantidad = 0;
  let montoTotal = 0;
  for (const causal of causales) {
    for (const ent of causal.entidades ?? []) {
      for (const cheque of ent.detalle ?? []) {
        cantidad++;
        montoTotal += cheque.monto ?? 0;
      }
    }
  }
  return cantidad > 0 ? { cantidad, montoTotal } : null;
};

/**
 * Nivel de riesgo para UI según la peor situación BCRA (1-5).
 * @returns {{ nivel: string, label: string, color: string }}
 */
export const nivelRiesgoBcra = (peorSituacion) => {
  if (peorSituacion == null) return NIVELES.sinDatos;
  const base =
    peorSituacion <= 1 ? NIVELES.ok : peorSituacion === 2 ? NIVELES.precaucion : NIVELES.riesgo;
  return { ...base, label: LABELS_SITUACION[peorSituacion] ?? base.label };
};

const fetchJson = async (url) => {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`BCRA respondió ${res.status}`);
  return res.json();
};

/**
 * Consulta la Central de Deudores del BCRA por CUIT/CUIL o DNI.
 * Con DNI prueba los CUILs candidatos hasta encontrar registros.
 * El 404 del BCRA significa "sin registros" (no es error): sinDatos = true.
 * @param {string|number} identificacion DNI (7-8 dígitos) o CUIT/CUIL (11)
 * @returns {Promise<{ cuit: string|null, sinDatos: boolean, deudas: object|null, cheques: object|null }>}
 */
export const consultarBcra = async (identificacion) => {
  const limpio = normalizarIdentificacion(identificacion);
  const candidatos = limpio.length === 11 ? [limpio] : dniACuilCandidatos(limpio);
  if (candidatos.length === 0) {
    throw new Error('DNI o CUIT inválido: ingresá 7-8 dígitos (DNI) u 11 (CUIT/CUIL)');
  }

  for (const cuit of candidatos) {
    const deudasJson = await fetchJson(`${BASE_URL}/Deudas/${cuit}`);
    if (!deudasJson) continue;
    const chequesJson = await fetchJson(`${BASE_URL}/Deudas/ChequesRechazados/${cuit}`);
    return {
      cuit,
      sinDatos: false,
      deudas: resumirDeudas(deudasJson),
      cheques: resumirCheques(chequesJson),
    };
  }

  return { cuit: null, sinDatos: true, deudas: null, cheques: null };
};
