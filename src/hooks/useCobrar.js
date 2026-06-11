import { useCallback, useEffect, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { formatMoney } from '@/utils/formatters';
import { construirComprobantePago } from '@/utils/comprobante';
import { compartirComprobante } from '@/utils/compartir';
import { calcularPunitorio } from '@/utils/punitorios';
import { hoy } from '@/utils/calculos';

const DURACION_TOAST_COBRO = 8000;

export function useCobrar() {
  const { prestamos, clientes, rutas, cobrarCuota, revertirCuota, negocioConfig } = useApp();
  const toast = useToast();
  const [cobrando, setCobrando] = useState(false);

  // Refs con el estado más reciente, para leerlo al tocar "Enviar comprobante"
  // (el onSnapshot ya reflejó el pago para entonces).
  const refs = useRef({ prestamos, clientes, rutas });
  useEffect(() => {
    refs.current = { prestamos, clientes, rutas };
  }, [prestamos, clientes, rutas]);

  const enviarComprobante = useCallback(
    async (prestamoId, resultado) => {
      try {
        const { prestamos: ps, clientes: cs, rutas: rs } = refs.current;
        const prestamo = ps.find((p) => p.id === prestamoId);
        const cliente = prestamo ? cs.find((c) => c.id === prestamo.clienteId) : null;
        const ruta = cliente ? rs.find((r) => r.id === cliente.rutaId) : null;
        if (!prestamo || !cliente) {
          toast.error('No se pudo armar el comprobante');
          return;
        }
        const { file, mensaje, nombreArchivo } = await construirComprobantePago({
          cliente,
          prestamo,
          ruta,
          resultado,
        });
        await compartirComprobante({ file, mensaje, telefono: cliente.tel, nombreArchivo });
      } catch (err) {
        toast.error('No se pudo enviar el comprobante', { description: err.message });
      }
    },
    [toast],
  );

  const toastCobro = useCallback(
    (prestamoId, res, nombreCliente) => {
      toast.success(res.finalizado ? '¡Préstamo finalizado!' : 'Cuota cobrada', {
        description: `${nombreCliente ?? ''} · Cuota ${res.cuotaNro}/${res.cuotasTotales} · ${formatMoney(res.monto)}${
          res.punitorio > 0 ? ` + ${formatMoney(res.punitorio)} punitorio` : ''
        }`,
        duration: DURACION_TOAST_COBRO,
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
        actions: [
          {
            label: 'Enviar comprobante',
            icon: Share2,
            keepOpen: true,
            onClick: () => enviarComprobante(prestamoId, res),
          },
        ],
      });
    },
    [toast, revertirCuota, enviarComprobante],
  );

  const punitorioDe = useCallback(
    (prestamoId, nro) => {
      const p = prestamos.find((pr) => pr.id === prestamoId);
      const cuota = (p?.cuotasDetalle ?? []).find((c) => c.nro === nro);
      if (!cuota) return null;
      const punitorio = calcularPunitorio(cuota, negocioConfig?.punitorio, hoy());
      return punitorio.monto > 0 ? punitorio : null;
    },
    [prestamos, negocioConfig],
  );

  const cobrarProxima = useCallback(
    async (prestamoId) => {
      if (cobrando) return;
      const p = prestamos.find((pr) => pr.id === prestamoId);
      const proxima = (p?.cuotasDetalle ?? []).find((c) => !c.pagada);
      if (!proxima) return;
      setCobrando(true);
      try {
        const res = await cobrarCuota(prestamoId, proxima.nro, {
          punitorio: punitorioDe(prestamoId, proxima.nro),
        });
        const cliente = clientes.find((c) => c.id === p.clienteId);
        toastCobro(prestamoId, res, cliente?.nombre);
        return res;
      } catch (err) {
        toast.error('No se pudo cobrar', { description: err.message });
      } finally {
        setCobrando(false);
      }
    },
    [cobrando, prestamos, clientes, cobrarCuota, toast, toastCobro, punitorioDe],
  );

  const cobrarCuotaNro = useCallback(
    async (prestamoId, nro, nombreCliente) => {
      if (cobrando) return;
      setCobrando(true);
      try {
        const res = await cobrarCuota(prestamoId, nro, {
          punitorio: punitorioDe(prestamoId, nro),
        });
        toastCobro(prestamoId, res, nombreCliente);
        return res;
      } catch (err) {
        toast.error('No se pudo cobrar', { description: err.message });
      } finally {
        setCobrando(false);
      }
    },
    [cobrando, cobrarCuota, toast, toastCobro, punitorioDe],
  );

  return { cobrarProxima, cobrarCuotaNro, cobrando };
}
