import React, { useEffect, useState } from 'react';
import { 
  History, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  Eye, 
  Hash, 
  FileSpreadsheet,
  X,
  RefreshCw
} from 'lucide-react';
import { ImportBatch, ImportError } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { StatusBadge } from '../components/StatusBadge';

const MOCK_BATCHES: ImportBatch[] = [
  {
    id: 'b1000000-0000-0000-0000-000000000001',
    area: 'RECAUDACION',
    original_filename: 'recaudacion_ejemplo.xlsx',
    sha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    uploaded_at: '2024-08-15T10:30:00Z',
    status: 'COMPLETADO_CON_ERRORES',
    rows_total: 14,
    rows_valid: 10,
    rows_rejected: 4
  },
  {
    id: 'b1000000-0000-0000-0000-000000000002',
    area: 'COBRANZA',
    original_filename: 'cobranza_ejemplo.xlsx',
    sha256: '9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
    uploaded_at: '2024-08-15T11:15:00Z',
    status: 'COMPLETADO_CON_ERRORES',
    rows_total: 14,
    rows_valid: 10,
    rows_rejected: 4
  }
];

export const HistorialLotes: React.FC = () => {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<ImportBatch | null>(null);
  const [batchErrors, setBatchErrors] = useState<ImportError[]>([]);
  const [loadingErrors, setLoadingErrors] = useState(false);

  const fetchBatches = async () => {
    setLoading(true);
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('import_batches')
          .select('*')
          .order('uploaded_at', { ascending: false });

        if (error) throw error;
        setBatches(data || []);
      } catch (err) {
        console.error('Error al cargar historial de lotes:', err);
        setBatches(MOCK_BATCHES);
      } finally {
        setLoading(false);
      }
    } else {
      // Local batches
      const localBatches = JSON.parse(localStorage.getItem('siiac_local_batches') || '[]');
      setBatches(localBatches.length > 0 ? localBatches : MOCK_BATCHES);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleInspectErrors = async (batch: ImportBatch) => {
    setSelectedBatch(batch);
    setLoadingErrors(true);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('import_errors')
          .select('*')
          .eq('batch_id', batch.id)
          .order('row_number', { ascending: true });

        if (error) throw error;
        setBatchErrors(data || []);
      } catch (err) {
        console.error('Error al cargar errores:', err);
      } finally {
        setLoadingErrors(false);
      }
    } else {
      // Local mock errors
      const localBatches = JSON.parse(localStorage.getItem('siiac_local_batches') || '[]');
      const found = localBatches.find((b: any) => b.id === batch.id);
      if (found && found.errors) {
        setBatchErrors(found.errors);
      } else {
        // Errores de muestra del archivo de prueba
        setBatchErrors([
          { id: 'e1', batch_id: batch.id, row_number: 12, field_name: 'ticket_number', error_code: 'TICKET_NOT_FOUND', message: 'La papeleta PAP-9999-99999 no existe en el sistema base.', created_at: batch.uploaded_at },
          { id: 'e2', batch_id: batch.id, row_number: 13, field_name: 'amount', error_code: 'INVALID_AMOUNT', message: 'El importe debe ser un número positivo mayor a 0.00.', created_at: batch.uploaded_at },
          { id: 'e3', batch_id: batch.id, row_number: 14, field_name: 'date', error_code: 'INVALID_FORMAT_DATE', message: 'Formato de fecha inválido o corrupto.', created_at: batch.uploaded_at },
          { id: 'e4', batch_id: batch.id, row_number: 15, field_name: 'source_key', error_code: 'DUPLICATE_KEY', message: 'Identificador origen duplicado en el mismo lote.', created_at: batch.uploaded_at }
        ]);
      }
      setLoadingErrors(false);
    }
  };

  const handleExportErrorsCSV = () => {
    if (!selectedBatch || batchErrors.length === 0) return;

    const headers = ['Fila', 'Campo', 'Codigo_Error', 'Mensaje_Rechazo'];
    const rows = batchErrors.map(e => [
      e.row_number,
      `"${e.field_name || ''}"`,
      `"${e.error_code}"`,
      `"${e.message.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `errores_${selectedBatch.area}_${selectedBatch.original_filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Historial y Auditoría de Cargas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro inmutable de archivos Excel importados, tasas de éxito y trazabilidad de rechazos.
          </p>
        </div>
        <button
          onClick={fetchBatches}
          className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-2 text-slate-500" />
          Actualizar Historial
        </button>
      </div>

      {/* Tabla de Lotes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 text-left">Área</th>
                <th className="px-4 py-3 text-left">Archivo / Hash SHA-256</th>
                <th className="px-4 py-3 text-left">Fecha y Hora</th>
                <th className="px-4 py-3 text-center">Total</th>
                <th className="px-4 py-3 text-center">Válidas</th>
                <th className="px-4 py-3 text-center">Rechazadas</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    Cargando historial de lotes...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No se han registrado importaciones todavía.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded font-bold text-[11px] ${
                        batch.area === 'RECAUDACION' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {batch.area}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-semibold text-slate-800 truncate">{batch.original_filename}</div>
                      {batch.sha256 && (
                        <div className="text-[10px] text-slate-400 font-mono flex items-center mt-0.5">
                          <Hash className="w-3 h-3 mr-0.5 text-slate-400" />
                          <span className="truncate">{batch.sha256.substring(0, 20)}...</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(batch.uploaded_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">{batch.rows_total}</td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-600">{batch.rows_valid}</td>
                    <td className="px-4 py-3 text-center font-bold text-rose-600">{batch.rows_rejected}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={batch.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {batch.rows_rejected > 0 ? (
                        <button
                          onClick={() => handleInspectErrors(batch)}
                          className="inline-flex items-center text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded transition"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Ver Errores ({batch.rows_rejected})
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Sin errores</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle de Errores */}
      {selectedBatch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header del Modal */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-xs font-bold uppercase text-slate-500">Auditoría de Inconsistencias</span>
                <h3 className="text-base font-extrabold text-slate-800 mt-0.5">
                  Errores del Lote: {selectedBatch.original_filename}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span>Área: <strong>{selectedBatch.area}</strong></span>
                <span>Filas Rechazadas: <strong className="text-rose-600">{selectedBatch.rows_rejected}</strong></span>
                <span>ID Lote: <code className="font-mono text-[11px]">{selectedBatch.id.substring(0, 18)}...</code></span>
              </div>

              {loadingErrors ? (
                <div className="py-8 text-center text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                  Cargando motivos de rechazo...
                </div>
              ) : batchErrors.length > 0 ? (
                <div className="overflow-x-auto border border-rose-200 rounded-lg">
                  <table className="min-w-full divide-y divide-rose-200 text-xs">
                    <thead className="bg-rose-50 text-rose-900 font-semibold">
                      <tr>
                        <th className="px-3 py-2 text-left">Fila</th>
                        <th className="px-3 py-2 text-left">Campo</th>
                        <th className="px-3 py-2 text-left">Código de Error</th>
                        <th className="px-3 py-2 text-left">Motivo del Rechazo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100 bg-white">
                      {batchErrors.map((err, idx) => (
                        <tr key={idx} className="hover:bg-rose-50/50">
                          <td className="px-3 py-2 font-mono font-bold text-slate-700">{err.row_number}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{err.field_name || 'general'}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono font-bold text-[11px]">
                              {err.error_code}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-slate-500 py-6 text-sm">
                  No hay detalles de error registrados para este lote.
                </p>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={handleExportErrorsCSV}
                disabled={batchErrors.length === 0}
                className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Exportar Errores a CSV
              </button>

              <button
                onClick={() => setSelectedBatch(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

