import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnline } from './useOnline';

const setOnLine = (valor) => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(valor);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useOnline', () => {
  it('arranca reflejando el estado del navegador', () => {
    setOnLine(false);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(false);
  });

  it('pasa a offline cuando se dispara el evento', () => {
    setOnLine(true);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(true);

    act(() => {
      setOnLine(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);
  });

  it('vuelve a online al reconectar', () => {
    setOnLine(false);
    const { result } = renderHook(() => useOnline());

    act(() => {
      setOnLine(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });

  it('quita los listeners al desmontar', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOnline());
    unmount();
    const eventos = remove.mock.calls.map(([e]) => e);
    expect(eventos).toContain('online');
    expect(eventos).toContain('offline');
  });
});
