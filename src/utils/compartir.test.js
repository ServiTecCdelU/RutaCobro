import { describe, it, expect, vi, afterEach } from 'vitest';
import { compartirComprobante } from './compartir';

const makeFile = () => new File(['x'], 'comprobante.pdf', { type: 'application/pdf' });

describe('compartirComprobante', () => {
  const originalShare = navigator.share;
  const originalCanShare = navigator.canShare;

  afterEach(() => {
    navigator.share = originalShare;
    navigator.canShare = originalCanShare;
    vi.restoreAllMocks();
  });

  it('usa Web Share cuando se pueden compartir archivos', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    navigator.canShare = vi.fn().mockReturnValue(true);
    navigator.share = share;

    const file = makeFile();
    const res = await compartirComprobante({ file, mensaje: 'hola', telefono: '3442123456' });

    expect(res).toBe('compartido');
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: [file], text: 'hola' }));
  });

  it('devuelve "cancelado" si el usuario cierra el menú (AbortError)', async () => {
    navigator.canShare = vi.fn().mockReturnValue(true);
    navigator.share = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('cancel'), { name: 'AbortError' }));

    const res = await compartirComprobante({
      file: makeFile(),
      mensaje: 'h',
      telefono: '3442123456',
    });
    expect(res).toBe('cancelado');
  });

  it('cae al fallback de descarga + WhatsApp cuando no se puede compartir archivos', async () => {
    navigator.canShare = vi.fn().mockReturnValue(false);
    navigator.share = vi.fn();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    const res = await compartirComprobante({
      file: makeFile(),
      mensaje: 'hola',
      telefono: '3442123456',
    });

    expect(res).toBe('fallback');
    expect(navigator.share).not.toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalled();
    expect(openSpy.mock.calls[0][0]).toContain('wa.me/543442123456');
  });
});
