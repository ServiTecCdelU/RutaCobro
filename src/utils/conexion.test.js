import { describe, it, expect, afterEach, vi } from 'vitest';
import { estaOffline, mensajeDeError, MENSAJE_SIN_CONEXION } from './conexion';

const setOnLine = (valor) => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(valor);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('estaOffline', () => {
  it('devuelve true cuando el navegador reporta sin red', () => {
    setOnLine(false);
    expect(estaOffline()).toBe(true);
  });

  it('devuelve false cuando el navegador reporta con red', () => {
    setOnLine(true);
    expect(estaOffline()).toBe(false);
  });
});

describe('mensajeDeError', () => {
  it('traduce el error de transacción sin red a un mensaje accionable', () => {
    setOnLine(true);
    expect(mensajeDeError({ code: 'unavailable', message: 'Failed to get document' })).toBe(
      MENSAJE_SIN_CONEXION,
    );
  });

  it('prioriza el mensaje de sin conexión si el dispositivo está offline', () => {
    setOnLine(false);
    expect(mensajeDeError({ code: 'internal', message: 'algo raro' })).toBe(MENSAJE_SIN_CONEXION);
  });

  it('explica el permiso denegado sin filtrar detalles internos', () => {
    setOnLine(true);
    expect(mensajeDeError({ code: 'permission-denied', message: 'PERMISSION_DENIED: ...' })).toBe(
      'No tenés permiso para esta operación.',
    );
  });

  it('avisa cuando la conexión está lenta', () => {
    setOnLine(true);
    expect(mensajeDeError({ code: 'deadline-exceeded' })).toBe(
      'La conexión está muy lenta. Reintentá.',
    );
  });

  it('cae al mensaje del error para el resto de los casos', () => {
    setOnLine(true);
    expect(mensajeDeError({ code: 'otro', message: 'La cuota ya estaba pagada' })).toBe(
      'La cuota ya estaba pagada',
    );
  });

  it('tolera un error nulo', () => {
    setOnLine(true);
    expect(mensajeDeError(null)).toBe('Error desconocido');
  });
});
