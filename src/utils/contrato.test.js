import { describe, it, expect } from 'vitest';
import { montoEnLetras, nombreArchivoContrato } from './contrato';

describe('montoEnLetras', () => {
  it('convierte unidades, decenas y especiales', () => {
    expect(montoEnLetras(0)).toBe('cero');
    expect(montoEnLetras(5)).toBe('cinco');
    expect(montoEnLetras(16)).toBe('dieciséis');
    expect(montoEnLetras(21)).toBe('veintiuno');
    expect(montoEnLetras(35)).toBe('treinta y cinco');
  });

  it('convierte centenas', () => {
    expect(montoEnLetras(100)).toBe('cien');
    expect(montoEnLetras(101)).toBe('ciento uno');
    expect(montoEnLetras(555)).toBe('quinientos cincuenta y cinco');
    expect(montoEnLetras(700)).toBe('setecientos');
  });

  it('convierte miles con apócope', () => {
    expect(montoEnLetras(1000)).toBe('mil');
    expect(montoEnLetras(1500)).toBe('mil quinientos');
    expect(montoEnLetras(21000)).toBe('veintiún mil');
    expect(montoEnLetras(31000)).toBe('treinta y un mil');
    expect(montoEnLetras(100000)).toBe('cien mil');
    expect(montoEnLetras(140500)).toBe('ciento cuarenta mil quinientos');
  });

  it('convierte millones', () => {
    expect(montoEnLetras(1000000)).toBe('un millón');
    expect(montoEnLetras(2500000)).toBe('dos millones quinientos mil');
    expect(montoEnLetras(1000001)).toBe('un millón uno');
  });

  it('trunca decimales y maneja negativos/inválidos', () => {
    expect(montoEnLetras(99.9)).toBe('noventa y nueve');
    expect(montoEnLetras(-5)).toBe('cinco');
    expect(montoEnLetras(NaN)).toBe('cero');
  });
});

describe('nombreArchivoContrato', () => {
  it('genera slug del nombre del cliente', () => {
    expect(nombreArchivoContrato({ cliente: { nombre: 'Juan Pérez' } })).toBe(
      'contrato-juan-perez.pdf',
    );
    expect(nombreArchivoContrato({ cliente: null })).toBe('contrato-cliente.pdf');
  });
});
