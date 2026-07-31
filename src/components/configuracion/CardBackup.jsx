import { useState } from 'react';
import { DatabaseBackup, Download } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { exportarNegocio } from '@/firebase/services';
import { descargarJson, nombreArchivoExport } from '@/utils/exportar';

/**
 * Backup manual del negocio completo. Es la red de seguridad mínima hasta que
 * exista el export programado a Storage (tarea 3.6 del plan).
 */
export default function CardBackup() {
  const toast = useToast();
  const [exportando, setExportando] = useState(false);
  const [ultimo, setUltimo] = useState(null);

  const handleExportar = async () => {
    setExportando(true);
    try {
      const backup = await exportarNegocio();
      descargarJson(backup, nombreArchivoExport());
      setUltimo(backup);
      toast.success('Backup descargado', {
        description: `${backup.totalDocumentos} documentos exportados`,
      });
    } catch (err) {
      toast.error('No se pudo generar el backup', { description: err.message });
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700 p-5 shadow-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
          <DatabaseBackup size={18} />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 dark:text-slate-100">Backup de datos</h2>
          <p className="text-xs text-slate-500">Descargá una copia completa del negocio</p>
        </div>
      </div>

      <p className="text-[13px] text-slate-600 dark:text-slate-400 mb-4">
        Genera un archivo JSON con clientes, préstamos, movimientos, gastos, notas y auditoría. Es
        tu copia: guardala fuera del celular. Se recomienda hacerlo al menos una vez por semana.
      </p>

      <button
        onClick={handleExportar}
        disabled={exportando}
        className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        <Download size={16} /> {exportando ? 'Generando…' : 'Descargar backup'}
      </button>

      {ultimo && (
        <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          {Object.entries(ultimo.conteos).map(([coleccion, cantidad]) => (
            <div
              key={coleccion}
              className="rounded-lg bg-slate-50 dark:bg-slate-900/50 px-3 py-2 border border-slate-200/60 dark:border-slate-700"
            >
              <dt className="text-slate-500 capitalize">{coleccion}</dt>
              <dd className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {cantidad}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
