import { useCallback, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { formatMoney } from '@/utils/formatters';

export function useCobrar() {
  const { prestamos, clientes, cobrarCuota, revertirCuota } = useApp();
  const toast = useToast();
  const [cobrando, setCobrando] = useState(false);

  const cobrarProxima = useCallback(
    async (prestamoId) => {
      if (cobrando) return;
      const p = prestamos.find((pr) => pr.id === prestamoId);
      const proxima = (p?.cuotasDetalle ?? []).find((c) => !c.pagada);
      if (!proxima) return;
      setCobrando(true);
      try {
        const res = await cobrarCuota(prestamoId, proxima.nro);
        const cliente = clientes.find((c) => c.id === p.clienteId);
        toast.success(res.finalizado ? '¡Préstamo finalizado!' : 'Cuota cobrada', {
          description: `${cliente?.nombre ?? ''} · Cuota ${res.cuotaNro}/${res.cuotasTotales} · ${formatMoney(res.monto)}`,
          action: {
            label: 'Deshacer',
            onClick: async () => {
              try {
                await revertirCuota(prestamoId, res.cuotaNro);
                toast.info('Cobro revertido');
              } catch (err) {
                toast.error('No se pudo revertir', { description: err.message });
              }
            },
          },
        });
        return res;
      } catch (err) {
        toast.error('No se pudo cobrar', { description: err.message });
      } finally {
        setCobrando(false);
      }
    },
    [cobrando, prestamos, clientes, cobrarCuota, revertirCuota, toast],
  );

  const cobrarCuotaNro = useCallback(
    async (prestamoId, nro, nombreCliente) => {
      if (cobrando) return;
      setCobrando(true);
      try {
        const res = await cobrarCuota(prestamoId, nro);
        toast.success(res.finalizado ? '¡Préstamo finalizado!' : 'Cuota cobrada', {
          description: `${nombreCliente ?? ''} · Cuota ${res.cuotaNro}/${res.cuotasTotales} · ${formatMoney(res.monto)}`,
          action: {
            label: 'Deshacer',
            onClick: async () => {
              try {
                await revertirCuota(prestamoId, res.cuotaNro);
                toast.info('Cobro revertido');
              } catch (err) {
                toast.error('No se pudo revertir', { description: err.message });
              }
            },
          },
        });
        return res;
      } catch (err) {
        toast.error('No se pudo cobrar', { description: err.message });
      } finally {
        setCobrando(false);
      }
    },
    [cobrando, cobrarCuota, revertirCuota, toast],
  );

  return { cobrarProxima, cobrarCuotaNro, cobrando };
}
