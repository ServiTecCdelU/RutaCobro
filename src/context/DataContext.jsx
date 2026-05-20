import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  subscribeRutas,
  subscribeClientes,
  subscribePrestamos,
  subscribeNegocioConfig,
} from '@/firebase/services';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { userDoc, esAdmin, esCliente, rutaIdAsignada, clienteIdAsignado } = useAuth();

  const [rutas, setRutas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [negocioConfig, setNegocioConfig] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [dataError, setDataError] = useState(null);

  useEffect(() => {
    if (!userDoc) {
      setRutas([]);
      setClientes([]);
      setPrestamos([]);
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

    const handleError = (err) => {
      if (cancelled) return;
      setSyncing(false);
      if (err.code === 'permission-denied') {
        setDataError('No tenés permisos para acceder a estos datos. Contactá al administrador.');
      } else if (err.code === 'unavailable') {
        setDataError('Sin conexión. Reconectando…');
      } else {
        setDataError(`Error de sincronización: ${err.message}`);
      }
    };

    const unsubs = [
      subscribeNegocioConfig(
        (cfg) => {
          if (!cancelled) setNegocioConfig(cfg);
        },
        (err) => {
          if (err.code !== 'permission-denied') handleError(err);
        },
      ),
      subscribeRutas((d) => {
        if (!cancelled) {
          setRutas(d);
          ready.rutas = true;
          done();
        }
      }, handleError),
      subscribeClientes((d) => {
        if (!cancelled) {
          setClientes(d);
          ready.clientes = true;
          done();
        }
      }, handleError),
      subscribePrestamos((d) => {
        if (!cancelled) {
          setPrestamos(d);
          ready.prestamos = true;
          done();
        }
      }, handleError),
    ];

    const timeout = setTimeout(() => {
      if (!cancelled) setSyncing(false);
    }, 10_000);

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
      clearTimeout(timeout);
    };
  }, [userDoc]);

  const rutasVisibles = useMemo(() => {
    if (esAdmin || !rutaIdAsignada) return rutas;
    return rutas.filter((r) => r.id === rutaIdAsignada);
  }, [rutas, rutaIdAsignada, esAdmin]);

  const clientesVisibles = useMemo(() => {
    if (esCliente && clienteIdAsignado) return clientes.filter((c) => c.id === clienteIdAsignado);
    if (esAdmin || !rutaIdAsignada) return clientes;
    return clientes.filter((c) => c.rutaId === rutaIdAsignada);
  }, [clientes, rutaIdAsignada, esAdmin, esCliente, clienteIdAsignado]);

  const prestamosVisibles = useMemo(() => {
    if (esCliente && clienteIdAsignado)
      return prestamos.filter((p) => p.clienteId === clienteIdAsignado);
    if (esAdmin || !rutaIdAsignada) return prestamos;
    const idsPermitidos = new Set(clientesVisibles.map((c) => c.id));
    return prestamos.filter((p) => idsPermitidos.has(p.clienteId));
  }, [prestamos, clientesVisibles, rutaIdAsignada, esAdmin, esCliente, clienteIdAsignado]);

  const value = useMemo(
    () => ({
      rutas: rutasVisibles,
      clientes: clientesVisibles,
      prestamos: prestamosVisibles,
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
