import { describe, it, expect, afterEach } from 'vitest';
import {
  formatMoney,
  formatFecha,
  formatFechaLarga,
  telefonoAWhatsApp,
  linkWhatsApp,
  setMoneda,
  getMoneda,
} from './formatters';

describe('formatMoney', () => {
  afterEach(() => {
    setMoneda('ARS'); // restaurar default para no contaminar otros tests
  });

  it('formatea números positivos', () => {
    const result = formatMoney(1500);
    expect(result).toContain('1');
    expect(result.startsWith('$')).toBe(true);
  });

  it('devuelve $0 para valores no numéricos', () => {
    expect(formatMoney(null)).toBe('$0');
    expect(formatMoney(undefined)).toBe('$0');
    expect(formatMoney('abc')).toBe('$0');
    expect(formatMoney(Infinity)).toBe('$0');
  });

  it('maneja 0', () => {
    expect(formatMoney(0)).toBe('$0');
  });

  it('respeta la moneda activa (USD → prefijo US$)', () => {
    setMoneda('USD');
    expect(getMoneda()).toBe('USD');
    expect(formatMoney(1500).startsWith('US$')).toBe(true);
    expect(formatMoney(null)).toBe('US$0');
  });

  it('usa el símbolo del sol peruano (PEN → S/)', () => {
    setMoneda('PEN');
    expect(formatMoney(0)).toBe('S/0');
  });

  it('ignora códigos de moneda desconocidos (mantiene el actual)', () => {
    setMoneda('ZZZ');
    expect(getMoneda()).toBe('ARS');
    expect(formatMoney(0)).toBe('$0');
  });
});

describe('formatFecha', () => {
  it('devuelve — para valores falsy', () => {
    expect(formatFecha(null)).toBe('—');
    expect(formatFecha(undefined)).toBe('—');
    expect(formatFecha('')).toBe('—');
  });

  it('formatea una fecha válida', () => {
    const result = formatFecha('2025-03-15');
    expect(result).toBeTruthy();
    expect(result).not.toBe('—');
  });
});

describe('formatFechaLarga', () => {
  it('devuelve — para valores falsy', () => {
    expect(formatFechaLarga(null)).toBe('—');
  });

  it('formatea una fecha larga', () => {
    const result = formatFechaLarga('2025-03-15');
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(5);
  });
});

describe('telefonoAWhatsApp', () => {
  it('devuelve null para tel vacío', () => {
    expect(telefonoAWhatsApp('')).toBeNull();
    expect(telefonoAWhatsApp(null)).toBeNull();
  });

  it('agrega 54 si no empieza con 54', () => {
    expect(telefonoAWhatsApp('3442123456')).toBe('543442123456');
  });

  it('no duplica 54', () => {
    expect(telefonoAWhatsApp('543442123456')).toBe('543442123456');
  });

  it('limpia caracteres no numéricos', () => {
    expect(telefonoAWhatsApp('34-42-123456')).toBe('543442123456');
  });
});

describe('linkWhatsApp', () => {
  it('devuelve null sin teléfono', () => {
    expect(linkWhatsApp(null, 'hola')).toBeNull();
    expect(linkWhatsApp('', 'hola')).toBeNull();
  });

  it('genera link correcto', () => {
    const link = linkWhatsApp('3442123456', 'Hola');
    expect(link).toContain('wa.me/543442123456');
    expect(link).toContain('text=Hola');
  });

  it('genera link sin mensaje', () => {
    const link = linkWhatsApp('3442123456');
    expect(link).toContain('wa.me/543442123456');
    expect(link).not.toContain('text=');
  });
});
