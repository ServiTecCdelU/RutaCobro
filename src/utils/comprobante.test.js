import { describe, it, expect } from 'vitest';
import {
  datosComprobante,
  mensajeComprobante,
  nombreArchivoComprobante,
  construirComprobantePago,
} from './comprobante';

const prestamoBase = {
  monto: 100000,
  interes: 40,
  cuotas: 3,
  fechaInicio: '2026-04-01',
  cuotasDetalle: [
    { nro: 1, monto: 100, vencimiento: '2026-04-08', pagada: true },
    { nro: 2, monto: 100, vencimiento: '2026-04-15', pagada: true },
    { nro: 3, monto: 100, vencimiento: '2026-04-22', pagada: false },
  ],
};

describe('datosComprobante', () => {
  it('suma el total a devolver con todas las cuotas', () => {
    const { totalDevolver } = datosComprobante(prestamoBase);
    expect(totalDevolver).toBe(300);
  });

  it('calcula el saldo solo con cuotas no pagadas', () => {
    const { saldoPendiente } = datosComprobante(prestamoBase);
    expect(saldoPendiente).toBe(100);
  });

  it('descuenta pagos parciales del saldo', () => {
    const prestamo = {
      cuotasDetalle: [
        { nro: 1, monto: 100, pagada: true },
        { nro: 2, monto: 100, pagada: false, pagado: 40 },
      ],
    };
    expect(datosComprobante(prestamo).saldoPendiente).toBe(60);
  });

  it('devuelve la primera cuota pendiente como próxima', () => {
    expect(datosComprobante(prestamoBase).proxima.nro).toBe(3);
  });

  it('próxima es null si está todo pagado', () => {
    const prestamo = { cuotasDetalle: [{ nro: 1, monto: 100, pagada: true }] };
    expect(datosComprobante(prestamo).proxima).toBeNull();
  });
});

describe('mensajeComprobante', () => {
  it('incluye nombre, cuota y monto', () => {
    const msg = mensajeComprobante({
      cliente: { nombre: 'Juan Pérez' },
      resultado: { cuotaNro: 2, cuotasTotales: 5, monto: 1000, finalizado: false },
    });
    expect(msg).toContain('Juan');
    expect(msg).toContain('2/5');
    expect(msg).toContain('$1.000');
  });

  it('avisa cuando el préstamo quedó finalizado', () => {
    const msg = mensajeComprobante({
      cliente: { nombre: 'Ana' },
      resultado: { cuotaNro: 5, cuotasTotales: 5, monto: 1000, finalizado: true },
    });
    expect(msg.toLowerCase()).toContain('finalizado');
  });
});

describe('nombreArchivoComprobante', () => {
  it('genera un slug sin tildes ni espacios', () => {
    const nombre = nombreArchivoComprobante({
      cliente: { nombre: 'María Fernanda Gómez' },
      resultado: { cuotaNro: 4 },
    });
    expect(nombre).toBe('comprobante-maria-fernanda-gomez-cuota-4.pdf');
  });
});

describe('construirComprobantePago', () => {
  it('devuelve un File PDF con el nombre y el mensaje', async () => {
    const { file, mensaje, nombreArchivo } = await construirComprobantePago({
      cliente: { nombre: 'Juan Pérez', dni: '30.111.222', tel: '3442123456', direccion: 'Calle 1' },
      prestamo: prestamoBase,
      ruta: { nombre: 'Centro', color: '#4f46e5' },
      resultado: {
        movId: 'abc12345xyz',
        cuotaNro: 3,
        cuotasTotales: 3,
        cuotasPagadas: 3,
        monto: 100,
        finalizado: true,
      },
      fechaPago: '2026-06-08',
    });
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe('application/pdf');
    expect(file.size).toBeGreaterThan(0);
    expect(nombreArchivo).toBe('comprobante-juan-perez-cuota-3.pdf');
    expect(mensaje).toContain('Juan');
  });
});
