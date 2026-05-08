import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from '@/components/ui/Toast';

export default function PwaUpdater() {
  const toast = useToast();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(err) {
      console.error('[pwa] SW register error', err);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    toast.info('Lista para usar offline');
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady, toast]);

  useEffect(() => {
    if (!needRefresh) return;
    toast.info('Nueva versión disponible', {
      description: 'Tocá para actualizar.',
      action: {
        label: 'Actualizar',
        onClick: () => {
          setNeedRefresh(false);
          updateServiceWorker(true);
        },
      },
    });
  }, [needRefresh, setNeedRefresh, updateServiceWorker, toast]);

  return null;
}
