import { describe, it, expect } from 'vitest';
import {
  construirItemsCobranza,
  categoriaVencimiento,
  mensajeRecordatorio,
  linkMapa,
} from './cobranza';

const clientes = [
  { id: 'c1', nombre: 'Ana López', rutaId: 'r1', direccion: 'Calle 1' },
  { id: 'c2', nombre: 'Beto Díaz', rutaId: 'r1' },
];
const rutas = [{ id: 'r1', nombre: 'Centro', color: '#fff' }];

const prestamo = (id, clienteId, estado, cuotas) => ({
  id,
  clienteId,
  estado,
  cuotasDetalle: cuotas,
});

describe('categoriaVencimiento', () => {
  it('clasifica vencida, hoy y futura', () => {
    expect(categoriaVencimiento('2026-06-07', '2026-06-08')).toBe('vencida');
    expect(categoriaVencimiento('2026-06-08', '2026-06-08')).toBe('hoy');
    expect(categoriaVencimiento('2026-06-09', '2026-06-08')).toBe('futura');
  });
});

describe('construirItemsCobranza', () => {
  const hoyStr = '2026-06-08';
  const prestamos = [
    prestamo('p1', 'c1', 'activo', [
      { nro: 1, monto: 100, vencimiento: '2026-06-01', pagada: true },
      { nro: 2, monto: 100, vencimiento: '2026-06-08', pagada: false },
    ]),
    prestamo('p2', 'c2', 'mora', [
      { nro: 1, monto: 200, vencimiento: '2026-06-05', pagada: false },
    ]),
    prestamo('p3', 'c1', 'finalizado', [
      { nro: 1, monto: 50, vencimiento: '2026-06-01', pagada: true },
    ]),
  ];

  it('ignora préstamos finalizados y sin cuota pendiente', () => {
    const items = construirItemsCobranza(prestamos, clientes, rutas, hoyStr);
    expect(items.map((i) => i.prestamo.id)).toEqual(['p2', 'p1']);
  });

  it('ordena por vencimiento ascendente (más urgente primero)', () => {
    const items = construirItemsCobranza(prestamos, clientes, rutas, hoyStr);
    expect(items[0].prestamo.id).toBe('p2');
    expect(items[0].categoria).toBe('vencida');
    expect(items[1].categoria).toBe('hoy');
  });

  it('enriquece con cliente, ruta y monto pendiente', () => {
    const items = construirItemsCobranza(prestamos, clientes, rutas, hoyStr);
    const p2 = items.find((i) => i.prestamo.id === 'p2');
    expect(p2.cliente.nombre).toBe('Beto Díaz');
    expect(p2.ruta.nombre).toBe('Centro');
    expect(p2.pendiente).toBe(200);
  });

  it('descuenta pagos parciales del monto pendiente', () => {
    const ps = [
      prestamo('p', 'c1', 'activo', [
        { nro: 1, monto: 100, vencimiento: '2026-06-08', pagada: false, pagado: 30 },
      ]),
    ];
    const items = construirItemsCobranza(ps, clientes, rutas, hoyStr);
    expect(items[0].pendiente).toBe(70);
  });
});

describe('mensajeRecordatorio', () => {
  it('incluye primer nombre, cuota y monto', () => {
    const msg = mensajeRecordatorio(
      { nombre: 'Ana López' },
      { nro: 3, monto: 1500, vencimiento: '2026-06-10' },
    );
    expect(msg).toContain('Ana');
    expect(msg).toContain('3');
    expect(msg).toContain('$1.500');
  });
});

describe('linkMapa', () => {
  it('devuelve null sin dirección', () => {
    expect(linkMapa('')).toBeNull();
    expect(linkMapa('   ')).toBeNull();
    expect(linkMapa(undefined)).toBeNull();
  });

  it('codifica la dirección en la URL de Google Maps', () => {
    const url = linkMapa('Av. San Martín 1234');
    expect(url).toContain('google.com/maps');
    expect(url).toContain(encodeURIComponent('Av. San Martín 1234'));
  });
});
