import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  normalizarIdentificacion,
  esCuitValido,
  dniACuilCandidatos,
  resumirDeudas,
  resumirCheques,
  nivelRiesgoBcra,
  consultarBcra,
} from './bcra';

const respuestaDeudas = {
  status: 200,
  results: {
    identificacion: 20123456786,
    denominacion: 'PEREZ JUAN',
    periodos: [
      {
        periodo: '202605',
        entidades: [
          {
            entidad: 'BANCO DE LA NACION ARGENTINA',
            situacion: 1,
            monto: 150.0,
            diasAtrasoPago: 0,
            refinanciaciones: false,
            procesoJud: false,
            enRevision: false,
          },
          {
            entidad: 'FINTECH SA',
            situacion: 4,
            monto: 80.5,
            diasAtrasoPago: 120,
            refinanciaciones: true,
            procesoJud: true,
            enRevision: false,
          },
        ],
      },
    ],
  },
};

const respuestaCheques = {
  status: 200,
  results: {
    identificacion: 20123456786,
    denominacion: 'PEREZ JUAN',
    causales: [
      {
        causal: 'SIN FONDOS',
        entidades: [
          {
            entidad: 11,
            detalle: [
              { nroCheque: 1, monto: 5000, fechaRechazo: '2026-01-10' },
              { nroCheque: 2, monto: 3000, fechaRechazo: '2026-02-15' },
            ],
          },
        ],
      },
    ],
  },
};

describe('normalizarIdentificacion', () => {
  it('quita puntos, guiones y espacios', () => {
    expect(normalizarIdentificacion('20-12.345.678-6')).toBe('20123456786');
    expect(normalizarIdentificacion(' 12.345.678 ')).toBe('12345678');
  });

  it('devuelve cadena vacía para valores nulos o sin dígitos', () => {
    expect(normalizarIdentificacion(null)).toBe('');
    expect(normalizarIdentificacion('abc')).toBe('');
  });
});

describe('esCuitValido', () => {
  it('valida CUITs reales con dígito verificador correcto', () => {
    expect(esCuitValido('30546689979')).toBe(true);
    expect(esCuitValido('20123456786')).toBe(true);
  });

  it('rechaza dígito verificador incorrecto o largo inválido', () => {
    expect(esCuitValido('30546689971')).toBe(false);
    expect(esCuitValido('12345678')).toBe(false);
  });
});

describe('dniACuilCandidatos', () => {
  it('genera los CUILs posibles con dígito verificador válido', () => {
    expect(dniACuilCandidatos('12345678')).toEqual([
      '20123456786',
      '27123456780',
      '23123456785',
      '24123456781',
    ]);
  });

  it('acepta DNI de 7 dígitos completando con cero', () => {
    const candidatos = dniACuilCandidatos('1234567');
    expect(candidatos.length).toBeGreaterThan(0);
    expect(candidatos.every((c) => c.length === 11 && esCuitValido(c))).toBe(true);
  });

  it('devuelve vacío para DNI inválido', () => {
    expect(dniACuilCandidatos('')).toEqual([]);
    expect(dniACuilCandidatos('123')).toEqual([]);
    expect(dniACuilCandidatos('123456789012')).toEqual([]);
  });
});

describe('resumirDeudas', () => {
  it('calcula peor situación, deuda total en pesos y flags', () => {
    const r = resumirDeudas(respuestaDeudas);
    expect(r.denominacion).toBe('PEREZ JUAN');
    expect(r.periodo).toBe('202605');
    expect(r.peorSituacion).toBe(4);
    expect(r.deudaTotal).toBe(230500); // (150 + 80.5) miles → pesos
    expect(r.tieneJudicial).toBe(true);
    expect(r.tieneRefinanciaciones).toBe(true);
    expect(r.entidades).toHaveLength(2);
  });

  it('ordena entidades de peor a mejor situación', () => {
    const r = resumirDeudas(respuestaDeudas);
    expect(r.entidades[0].entidad).toBe('FINTECH SA');
    expect(r.entidades[0].situacion).toBe(4);
  });

  it('devuelve null si no hay periodos', () => {
    expect(resumirDeudas({ status: 200, results: { periodos: [] } })).toBeNull();
    expect(resumirDeudas(null)).toBeNull();
  });
});

describe('resumirCheques', () => {
  it('cuenta cheques rechazados y suma montos', () => {
    const r = resumirCheques(respuestaCheques);
    expect(r.cantidad).toBe(2);
    expect(r.montoTotal).toBe(8000);
  });

  it('devuelve null sin datos', () => {
    expect(resumirCheques(null)).toBeNull();
    expect(resumirCheques({ status: 200, results: { causales: [] } })).toBeNull();
  });
});

describe('nivelRiesgoBcra', () => {
  it('mapea situación a nivel, label y color', () => {
    expect(nivelRiesgoBcra(1).nivel).toBe('ok');
    expect(nivelRiesgoBcra(2).nivel).toBe('precaucion');
    expect(nivelRiesgoBcra(3).nivel).toBe('riesgo');
    expect(nivelRiesgoBcra(4).nivel).toBe('riesgo');
    expect(nivelRiesgoBcra(5).nivel).toBe('riesgo');
    expect(nivelRiesgoBcra(null).nivel).toBe('sinDatos');
  });

  it('cada nivel tiene label y color', () => {
    for (const sit of [null, 1, 2, 3, 4, 5]) {
      const n = nivelRiesgoBcra(sit);
      expect(n.label).toBeTruthy();
      expect(n.color).toMatch(/^#/);
    }
  });
});

describe('consultarBcra', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockFetch = (porUrl) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        for (const [fragmento, respuesta] of porUrl) {
          if (url.includes(fragmento)) {
            return {
              ok: respuesta.status === 200,
              status: respuesta.status,
              json: async () => respuesta,
            };
          }
        }
        return { ok: false, status: 404, json: async () => ({ status: 404 }) };
      }),
    );

  it('consulta directo con CUIT de 11 dígitos', async () => {
    mockFetch([
      ['Deudas/20123456786', respuestaDeudas],
      ['ChequesRechazados/20123456786', respuestaCheques],
    ]);
    const r = await consultarBcra('20-12345678-6');
    expect(r.cuit).toBe('20123456786');
    expect(r.sinDatos).toBe(false);
    expect(r.deudas.peorSituacion).toBe(4);
    expect(r.cheques.cantidad).toBe(2);
  });

  it('con DNI prueba candidatos hasta encontrar registro', async () => {
    mockFetch([
      [
        'Deudas/27123456780',
        {
          ...respuestaDeudas,
          results: { ...respuestaDeudas.results, identificacion: 27123456780 },
        },
      ],
      ['ChequesRechazados/27123456780', { status: 404 }],
    ]);
    const r = await consultarBcra('12.345.678');
    expect(r.cuit).toBe('27123456780');
    expect(r.deudas).not.toBeNull();
    expect(r.cheques).toBeNull();
  });

  it('devuelve sinDatos cuando ningún candidato registra deudas', async () => {
    mockFetch([]);
    const r = await consultarBcra('12345678');
    expect(r.sinDatos).toBe(true);
    expect(r.cuit).toBeNull();
    expect(r.deudas).toBeNull();
  });

  it('rechaza identificación inválida', async () => {
    await expect(consultarBcra('123')).rejects.toThrow(/inválid/i);
  });

  it('propaga errores de red', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    await expect(consultarBcra('20123456786')).rejects.toThrow();
  });
});
