import { describe, it, expect } from 'vitest';
import {
  mensajeEstadoCuenta,
  nombreArchivoEstadoCuenta,
  construirEstadoCuenta,
} from './estadoCuenta';

const prestamo = {
  monto: 100000,
  interes: 40,
  cuotas: 3,
  frecuenciaDias: 7,
  fechaInicio: '2026-04-01',
  estado: 'activo',
  cuotasDetalle: [
    { nro: 1, monto: 100, vencimiento: '2026-04-08', pagada: true, fechaPago: '2026-04-08' },
    { nro: 2, monto: 100, vencimiento: '2026-04-15', pagada: false, pagado: 40 },
    { nro: 3, monto: 100, vencimiento: '2026-04-22', pagada: false },
  ],
};

describe('mensajeEstadoCuenta', () => {
  it('resume pagado, total y saldo, e incluye la próxima cuota', () => {
    const msg = mensajeEstadoCuenta({ cliente: { nombre: 'Ana López' }, prestamo });
    expect(msg).toContain('Ana');
    expect(msg).toContain('$300'); // total a devolver
    expect(msg.toLowerCase()).toContain('próxima cuota');
  });

  it('avisa cuando está finalizado', () => {
    const fin = {
      ...prestamo,
      cuotasDetalle: [{ nro: 1, monto: 100, vencimiento: '2026-04-08', pagada: true }],
    };
    const msg = mensajeEstadoCuenta({ cliente: { nombre: 'Ana' }, prestamo: fin });
    expect(msg.toLowerCase()).toContain('finalizado');
  });
});

describe('nombreArchivoEstadoCuenta', () => {
  it('genera un slug sin tildes', () => {
    expect(nombreArchivoEstadoCuenta({ cliente: { nombre: 'María Gómez' } })).toBe(
      'estado-cuenta-maria-gomez.pdf',
    );
  });
});

describe('construirEstadoCuenta', () => {
  it('devuelve un File PDF', async () => {
    const { file, mensaje, nombreArchivo } = await construirEstadoCuenta({
      cliente: { nombre: 'Ana López', dni: '30.111.222', tel: '3442123456', direccion: 'Calle 1' },
      prestamo,
      ruta: { nombre: 'Centro', color: '#4f46e5' },
    });
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe('application/pdf');
    expect(file.size).toBeGreaterThan(0);
    expect(nombreArchivo).toBe('estado-cuenta-ana-lopez.pdf');
    expect(mensaje).toContain('Ana');
  });
});
