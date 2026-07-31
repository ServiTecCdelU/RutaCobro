import { WifiOff } from 'lucide-react';
import { useOnline } from '@/hooks/useOnline';

/**
 * Aviso permanente mientras el dispositivo está sin red.
 *
 * Es deliberadamente intrusivo: consultar la cartera sigue funcionando (caché
 * local de Firestore), pero **cobrar no**, y esa diferencia tiene que ser obvia
 * antes de que el cobrador esté parado frente al cliente.
 */
export default function BannerSinConexion() {
  const online = useOnline();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-[13px] font-semibold text-amber-950 shadow-sm"
    >
      <WifiOff size={16} strokeWidth={2.4} className="shrink-0" />
      <span>Sin conexión · podés consultar, pero no registrar cobros</span>
    </div>
  );
}
