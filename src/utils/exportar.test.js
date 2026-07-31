import { describe, it, expect } from 'vitest';
import { construirExport, nombreArchivoExport, COLECCIONES_EXPORTABLES } from './exportar';

const colecciones = {
  rutas: [{ id: 'r1', nombre: 'Norte' }],
  clientes: [
    { id: 'c1', nombre: 'Ana', rutaId: 'r1' },
    { id: 'c2', nombre: 'Beto', rutaId: 'r1' },
  ],
  prestamos: [{ id: 'p1', clienteId: 'c1', monto: 100000 }],
  movimientos: [],
};

describe('construirExport', () => {
  it('cuenta los documentos de cada colección', () => {
    const backup = construirExport({ colecciones, config: { capitalTotal: 500000 } });
    expect(backup.conteos).toEqual({ rutas: 1, clientes: 2, prestamos: 1, movimientos: 0 });
  });

  it('totaliza los documentos exportados', () => {
    const backup = construirExport({ colecciones });
    expect(backup.totalDocumentos).toBe(4);
  });

  it('incluye los datos completos, no solo el resumen', () => {
    const backup = construirExport({ colecciones });
    expect(backup.datos.clientes[0]).toEqual({ id: 'c1', nombre: 'Ana', rutaId: 'r1' });
  });

  it('guarda la config del negocio', () => {
    const backup = construirExport({ colecciones, config: { capitalTotal: 500000 } });
    expect(backup.negocio).toEqual({ capitalTotal: 500000 });
  });

  it('tolera un negocio sin config', () => {
    expect(construirExport({ colecciones }).negocio).toBeNull();
  });

  it('sella la fecha en ISO para que sea comparable entre backups', () => {
    const backup = construirExport({
      colecciones,
      generadoEn: new Date('2026-07-31T12:30:00.000Z'),
    });
    expect(backup.generadoEn).toBe('2026-07-31T12:30:00.000Z');
  });

  it('versiona el formato para poder migrar backups viejos', () => {
    expect(construirExport({ colecciones }).formato).toBe(1);
  });

  it('serializa a JSON sin perder información', () => {
    const backup = construirExport({ colecciones });
    expect(JSON.parse(JSON.stringify(backup)).datos.prestamos[0].monto).toBe(100000);
  });
});

describe('COLECCIONES_EXPORTABLES', () => {
  it('incluye todo lo que no se puede reconstruir a mano', () => {
    for (const c of ['clientes', 'prestamos', 'movimientos', 'gastos', 'notas', 'auditoria']) {
      expect(COLECCIONES_EXPORTABLES).toContain(c);
    }
  });
});

describe('nombreArchivoExport', () => {
  it('usa fecha y hora local para no pisar backups del mismo día', () => {
    expect(nombreArchivoExport(new Date(2026, 6, 31, 9, 5))).toBe(
      'rutacobro-backup-20260731-0905.json',
    );
  });
});
