import { describe, it, expect } from 'vitest';
import { definicionesTools, ejecutarTool } from './herramientas.js';

// Mock mínimo de Firestore Admin: db.collection(name).get() → { docs }
function dbMock(porColeccion) {
  return {
    collection: (name) => ({
      get: async () => ({
        docs: (porColeccion[name] ?? []).map((d) => ({ id: d.id, data: () => d })),
      }),
    }),
  };
}

describe('definicionesTools', () => {
  it('expone las 6 herramientas con name e input_schema', () => {
    const nombres = definicionesTools.map((t) => t.name);
    expect(nombres).toEqual(
      expect.arrayContaining([
        'obtener_metricas',
        'listar_clientes_en_mora',
        'buscar_cliente',
        'clientes_para_renovar',
        'listar_rutas',
        'proxima_cobranza',
      ]),
    );
    for (const t of definicionesTools) {
      expect(t.input_schema.type).toBe('object');
    }
  });
});

describe('ejecutarTool: listar_clientes_en_mora', () => {
  it('devuelve clientes con cuota vencida ordenados por atraso', async () => {
    const db = dbMock({
      clientes: [{ id: 'c1', nombre: 'Perez', rutaId: 'r1' }],
      prestamos: [
        {
          id: 'p1',
          clienteId: 'c1',
          estado: 'mora',
          cuotasDetalle: [
            { nro: 1, monto: 1000, vencimiento: '2026-06-01', pagada: false, pagado: 0 },
          ],
        },
      ],
      rutas: [{ id: 'r1', nombre: 'Norte' }],
    });
    const res = await ejecutarTool(db, 'listar_clientes_en_mora', {}, '2026-06-14');
    expect(res.clientes[0].nombre).toBe('Perez');
    expect(res.clientes[0].diasAtraso).toBe(13);
    expect(res.clientes[0].montoPendiente).toBe(1000);
  });
});

describe('ejecutarTool: tool desconocida', () => {
  it('lanza error', async () => {
    await expect(ejecutarTool(dbMock({}), 'no_existe', {})).rejects.toThrow();
  });
});
