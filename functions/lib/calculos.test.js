import { describe, it, expect } from 'vitest';
import { hoy, diasDeAtraso } from './calculos.js';

describe('hoy', () => {
  it('devuelve la fecha en formato YYYY-MM-DD', () => {
    expect(hoy()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('diasDeAtraso', () => {
  it('es 0 si la cuota está pagada', () => {
    expect(diasDeAtraso({ vencimiento: '2000-01-01', pagada: true }, '2026-06-14')).toBe(0);
  });

  it('es 0 si vence hoy o en el futuro', () => {
    expect(diasDeAtraso({ vencimiento: '2026-06-14', pagada: false }, '2026-06-14')).toBe(0);
    expect(diasDeAtraso({ vencimiento: '2026-06-20', pagada: false }, '2026-06-14')).toBe(0);
  });

  it('cuenta los días vencidos', () => {
    expect(diasDeAtraso({ vencimiento: '2026-06-10', pagada: false }, '2026-06-14')).toBe(4);
  });
});
