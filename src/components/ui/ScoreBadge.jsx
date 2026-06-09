import { useMemo } from 'react';
import { scoreCliente } from '@/utils/scoreCliente';

/**
 * Pill con el score/categoría de riesgo del cliente.
 * Pasá `prestamos` (los del cliente) o un `score` ya calculado.
 */
export default function ScoreBadge({ prestamos, score, className = '' }) {
  const data = useMemo(() => score ?? scoreCliente(prestamos ?? []), [score, prestamos]);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${className}`}
      style={{ background: data.color + '1a', color: data.color }}
      title="Score de riesgo según historial de pagos"
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: data.color }} />
      {data.label}
      {data.score != null ? ` · ${data.score}` : ''}
    </span>
  );
}
