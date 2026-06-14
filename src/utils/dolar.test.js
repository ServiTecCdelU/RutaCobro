import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseDolares, pesosAUsd, formatUsd, brechaPct, consultarDolares } from './dolar';

const respuesta = [
  {
    casa: 'oficial',
    nombre: 'Oficial',
    moneda: 'USD',
    compra: 1010,
    venta: 1050,
    fechaActualizacion: '2026-06-14T10:00:00.000Z',
  },
  {
    casa: 'blue',
    nombre: 'Blue',
    moneda: 'USD',
    compra: 1200,
    venta: 1260,
    fechaActualizacion: '2026-06-14T10:05:00.000Z',
  },
];

describe('parseDolares', () => {
  it('arma un mapa por casa con compra/venta numéricos', () => {
    const map = parseDolares(respuesta);
    expect(map.oficial.venta).toBe(1050);
    expect(map.blue.compra).toBe(1200);
    expect(map.blue.nombre).toBe('Blue');
  });

  it('devuelve objeto vacío si la entrada no es un array', () => {
    expect(parseDolares(null)).toEqual({});
    expect(parseDolares(undefined)).toEqual({});
    expect(parseDolares({})).toEqual({});
  });

  it('ignora entradas sin casa', () => {
    const map = parseDolares([{ venta: 100 }, { casa: 'cripto', venta: 1300 }]);
    expect(Object.keys(map)).toEqual(['cripto']);
  });
});

describe('pesosAUsd', () => {
  it('convierte pesos a dólares redondeando', () => {
    expect(pesosAUsd(126000, 1260)).toBe(100);
    expect(pesosAUsd(100000, 1050)).toBe(95); // 95.23 → 95
  });

  it('devuelve null con cotización inválida o cero', () => {
    expect(pesosAUsd(1000, 0)).toBeNull();
    expect(pesosAUsd(1000, null)).toBeNull();
    expect(pesosAUsd(1000, undefined)).toBeNull();
  });

  it('devuelve null con pesos no numéricos', () => {
    expect(pesosAUsd('abc', 1000)).toBeNull();
  });
});

describe('brechaPct', () => {
  it('calcula la brecha porcentual entre blue y oficial', () => {
    expect(brechaPct(1260, 1050)).toBe(20); // (1260-1050)/1050 = 20%
  });

  it('devuelve null si falta algún valor', () => {
    expect(brechaPct(null, 1050)).toBeNull();
    expect(brechaPct(1260, 0)).toBeNull();
  });
});

describe('formatUsd', () => {
  it('formatea con prefijo US$ sin decimales', () => {
    expect(formatUsd(1234)).toBe('US$1,234');
    expect(formatUsd(0)).toBe('US$0');
  });

  it('tolera valores no numéricos', () => {
    expect(formatUsd(NaN)).toBe('US$0');
    expect(formatUsd(undefined)).toBe('US$0');
  });
});

describe('consultarDolares', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hace fetch y devuelve el mapa parseado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(respuesta) }),
    );
    const map = await consultarDolares();
    expect(map.blue.venta).toBe(1260);
  });

  it('lanza error si la respuesta no es ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(consultarDolares()).rejects.toThrow('503');
  });
});
