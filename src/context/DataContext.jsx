import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  subscribeRutas,
  subscribeClientes,
  subscribePrestamos,
  subscribeNegocioConfig,
  subscribeGastos,
} from '@/firebase/services';
import { setMoneda } from '@/utils/formatters';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { userDoc, rol, esAdmin, esCliente, esCobrador, rutaIdAsignada, clienteIdAsignado } =
    useAuth();

  const [rutas, setRutas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [negocioConfig, setNegocioConfig] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [dataError, setDataError] = useState(null);

  useEffect(() => {
    if (!userDoc || !rol) {
      setRutas([]);
      setClientes([]);
      setPrestamos([]);
      setGastos([]);
      setSyncing(false);
      setDataError(null);
      return;
    }

    setSyncing(true);
    setDataError(null);
    let cancelled = false;

    const ready = { rutas: false, clientes: false, prestamos: false };
    const done = () => {
      if (!cancelled && ready.rutas && ready.clientes && ready.prestamos) setSyncing(false);
    };

    const handleError = (label) => (err) => {
      if (cancelled) return;
      console.error('[data]', label, err.code, err.message);
      setSyncing(false);
      // Solo mostrar error si NO es permission-denied transitorio
      if (err.code === 'unavailable') {
        setDataError('Sin conexión. Reconectando…');
      } else if (err.code !== 'permission-denied') {
        setDataError(`Error de sincronización: ${err.message}`);
      }
      // permission-denied: no mostrar banner, el AuthContext ya maneja acceso
    };

    // No es solo UX: las reglas de Firestore rechazan la consulta completa si un
    // cobrador o un cliente la piden sin acotar por `rutaId` / `clienteId`.
    const filtroAcceso = {};
    if (esCobrador && rutaIdAsignada) filtroAcceso.rutaId = rutaIdAsignada;
    if (esCliente && clienteIdAsignado) filtroAcceso.clienteId = clienteIdAsignado;

    const unsubs = [
      subscribeNegocioConfig(
        (cfg) => {
          if (!cancelled) {
            setNegocioConfig(cfg);
            if (cfg?.moneda) setMoneda(cfg.moneda);
          }
        },
        (err) => {
          console.error('[data] config', err.code);
        },
      ),
      subscribeRutas((d) => {
        if (!cancelled) {
          setRutas(d);
          ready.rutas = true;
          done();
        }
      }, handleError('rutas')),
      subscribeClientes(
        (d) => {
          if (!cancelled) {
            setClientes(d);
            ready.clientes = true;
            done();
          }
        },
        handleError('clientes'),
        filtroAcceso,
      ),
      subscribePrestamos(
        (d) => {
          if (!cancelled) {
            setPrestamos(d);
            ready.prestamos = true;
            done();
          }
        },
        handleError('prestamos'),
        filtroAcceso,
      ),
      subscribeGastos(
        (d) => {
          if (!cancelled) setGastos(d);
        },
        (err) => {
          if (err.code !== 'permission-denied') console.error('[data] gastos', err.code);
        },
        esCobrador && rutaIdAsignada ? { rutaId: rutaIdAsignada } : {},
      ),
    ];

    const timeout = setTimeout(() => {
      if (!cancelled) setSyncing(false);
    }, 10_000);

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
      clearTimeout(timeout);
    };
  }, [userDoc, rol, esCobrador, esCliente, rutaIdAsignada, clienteIdAsignado]);

  const rutasVisibles = useMemo(() => {
    if (esAdmin || !rutaIdAsignada) return rutas;
    return rutas.filter((r) => r.id === rutaIdAsignada);
  }, [rutas, rutaIdAsignada, esAdmin]);

  // El borrado es lógico: los archivados siguen en Firestore (recuperables desde
  // la papelera) pero no participan de ninguna vista ni de las métricas.
  const vigente = (d) => d.archivado !== true;

  const clientesVisibles = useMemo(() => {
    const activos = clientes.filter(vigente);
    if (esCliente && clienteIdAsignado) return activos.filter((c) => c.id === clienteIdAsignado);
    if (esAdmin || !rutaIdAsignada) return activos;
    return activos.filter((c) => c.rutaId === rutaIdAsignada);
  }, [clientes, rutaIdAsignada, esAdmin, esCliente, clienteIdAsignado]);

  const prestamosVisibles = useMemo(() => {
    const activos = prestamos.filter(vigente);
    if (esCliente && clienteIdAsignado)
      return activos.filter((p) => p.clienteId === clienteIdAsignado);
    if (esAdmin || !rutaIdAsignada) return activos;
    const idsPermitidos = new Set(clientesVisibles.map((c) => c.id));
    return activos.filter((p) => idsPermitidos.has(p.clienteId));
  }, [prestamos, clientesVisibles, rutaIdAsignada, esAdmin, esCliente, clienteIdAsignado]);

  const archivados = useMemo(
    () => ({
      clientes: clientes.filter((c) => c.archivado === true),
      prestamos: prestamos.filter((p) => p.archivado === true),
    }),
    [clientes, prestamos],
  );

  const value = useMemo(
    () => ({
      rutas: rutasVisibles,
      clientes: clientesVisibles,
      prestamos: prestamosVisibles,
      gastos,
      archivados,
      prestamosAll: prestamos,
      rutasAll: rutas,
      tenantConfig: negocioConfig,
      syncing,
      dataError,
    }),
    [
      rutasVisibles,
      clientesVisibles,
      prestamosVisibles,
      gastos,
      archivados,
      prestamos,
      rutas,
      negocioConfig,
      syncing,
      dataError,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};
