import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileSpreadsheet, 
  Upload, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Download, 
  RefreshCw,
  Hash,
  Eye,
  Info,
  ArrowRight
} from 'lucide-react';
import { AreaSource, ParsedRowPreview } from '../types';
import { calculateSHA256, parseExcelFile, ParseResult } from '../lib/excelParser';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const ImportarExcel: React.FC = () => {
  const { role } = useAuth();
  const [selectedArea, setSelectedArea] = useState<AreaSource>('RECAUDACION');
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitResult, setSubmitResult] = useState<{
    batch_id: string;
    status: string;
    rows_total: number;
    rows_valid: number;
    rows_rejected: number;
    server_errors?: any[];
    first_valid_query?: string;
  } | null>(null);

  const canUpload = role === 'admin' || role === 'operador';

  if (!canUpload) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto mt-12 shadow-sm">
        <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800">Acceso Denegado</h2>
        <p className="text-sm text-slate-600 mt-2">
          Su rol actual (<strong>{role}</strong>) solo tiene permisos de consulta. Para cargar archivos Excel debe ingresar con rol <strong>Operador</strong> o <strong>Admin</strong>.
        </p>
      </div>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validación de extensión
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setErrorMessage('Formato no válido. Debe ser un archivo Excel (.xlsx o .xls).');
      return;
    }

    // Validación de tamaño (Máximo 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMessage('El archivo excede el tamaño máximo permitido de 5 MB.');
      return;
    }

    setFile(selectedFile);
    setErrorMessage('');
    setSubmitResult(null);
    setIsParsing(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const sha256 = await calculateSHA256(buffer);
      const parsed = parseExcelFile(buffer, selectedFile.name, selectedArea);
      parsed.sha256 = sha256;
      setParseResult(parsed);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar el archivo Excel.');
      setParseResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleAreaChange = (newArea: AreaSource) => {
    setSelectedArea(newArea);
    setFile(null);
    setParseResult(null);
    setSubmitResult(null);
    setErrorMessage('');
  };

  const handleConfirmImport = async () => {
    if (!parseResult || !file || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Si Supabase está configurado, invocar la función RPC del servidor
      if (isSupabaseConfigured) {
        const payload = parseResult.rows.map(r => ({
          row_number: r.row_number,
          source_key: r.source_key,
          ticket_number: r.ticket_number,
          date_str: r.date_str,
          amount: r.amount,
          reference_or_obs: r.reference_or_obs
        }));

        const { data, error } = await supabase.rpc('process_import_batch', {
          p_area: selectedArea,
          p_filename: file.name,
          p_sha256: parseResult.sha256,
          p_records: payload
        });

        if (error) {
          throw error;
        }

        // Obtener errores registrados en la BD para este lote
        let serverErrors: any[] = [];
        if (data?.batch_id) {
          const { data: errData } = await supabase
            .from('import_errors')
            .select('*')
            .eq('batch_id', data.batch_id)
            .order('row_number', { ascending: true });
          serverErrors = errData || [];
        }

        setSubmitResult({
          batch_id: data.batch_id,
          status: data.status,
          rows_total: data.rows_total,
          rows_valid: data.rows_valid,
          rows_rejected: data.rows_rejected,
          server_errors: serverErrors
        });
      } else {
        // MODO DEMO LOCAL SIMULADO: Revalida con las mismas reglas del servidor
        // Simula la llamada RPC de Supabase para cuando el alumno o profesor evalúa sin crear cuenta Supabase aún
        await new Promise(r => setTimeout(r, 700));

        const mockExistingTickets = [
          'PAP-2024-00101', 'PAP-2024-00102', 'PAP-2024-00201', 'PAP-2024-00202',
          'PAP-2024-00301', 'PAP-2024-00401', 'PAP-2024-00402', 'PAP-2024-00501',
          'PAP-2024-00502', 'PAP-2024-00601'
        ];

        // Verificar histórico en memoria local para probar idempotencia
        const storageKey = `siiac_imported_${selectedArea}`;
        const previousKeys = JSON.parse(localStorage.getItem(storageKey) || '[]');

        const errors: any[] = [];
        let valid = 0;
        let rejected = 0;
        const currentBatchKeys: string[] = [];

        parseResult.rows.forEach(row => {
          if (!row.source_key) {
            errors.push({
              row_number: row.row_number,
              field_name: 'source_key',
              error_code: 'MISSING_KEY',
              message: 'El identificador de transacción origen es obligatorio.'
            });
            rejected++;
            return;
          }

          if (currentBatchKeys.includes(row.source_key) || previousKeys.includes(row.source_key)) {
            errors.push({
              row_number: row.row_number,
              field_name: 'source_key',
              error_code: selectedArea === 'RECAUDACION' ? 'DUPLICATE_PAYMENT' : 'DUPLICATE_INTEREST',
              message: `El registro con ID ${row.source_key} ya fue registrado previamente para esta papeleta (Idempotencia).`
            });
            rejected++;
            return;
          }

          if (!row.ticket_number) {
            errors.push({
              row_number: row.row_number,
              field_name: 'ticket_number',
              error_code: 'MISSING_TICKET',
              message: 'El número de papeleta es obligatorio.'
            });
            rejected++;
            return;
          }

          if (!mockExistingTickets.includes(row.ticket_number)) {
            errors.push({
              row_number: row.row_number,
              field_name: 'ticket_number',
              error_code: 'TICKET_NOT_FOUND',
              message: `La papeleta ${row.ticket_number} no existe en el sistema base de papeletas.`
            });
            rejected++;
            return;
          }

          if (!row.amount || row.amount <= 0) {
            errors.push({
              row_number: row.row_number,
              field_name: 'amount',
              error_code: 'INVALID_AMOUNT',
              message: 'El importe debe ser un número positivo mayor a 0.00.'
            });
            rejected++;
            return;
          }

          if (!row.date_str || row.date_str.includes('CORRUPTA') || isNaN(new Date(row.date_str).getTime())) {
            errors.push({
              row_number: row.row_number,
              field_name: 'date',
              error_code: 'INVALID_FORMAT_DATE',
              message: 'Formato de fecha inválido o corrupto.'
            });
            rejected++;
            return;
          }

          currentBatchKeys.push(row.source_key);
          valid++;
        });

        // Guardar claves procesadas para validar doble carga posterior
        localStorage.setItem(storageKey, JSON.stringify([...previousKeys, ...currentBatchKeys]));

        // Obtener filas válidas y extraer el primer ticket/DNI para la consulta inmediata
        const validParsedRows = parseResult.rows.filter(r => !errors.some(e => e.row_number === r.row_number));
        let firstValidQuery = 'PAP-2024-00101';
        if (validParsedRows.length > 0) {
          const firstRow = validParsedRows[0];
          firstValidQuery = firstRow.ticket_number || firstRow.raw_data?.DNI_INFRACTOR || firstRow.raw_data?.DNI || '45892104';
        }

        // Si son infracciones de inspectores o tránsito, agregarlas al almacenamiento de tickets consultables
        if (selectedArea === 'TRANSITO_CAMPOS' || file.name.includes('papeleta') || file.name.includes('campo') || parseResult.rows.some(r => r.raw_data?.DNI_INFRACTOR)) {
          const newTickets = validParsedRows.map((r, i) => ({
            ticket_id: `imp-${Date.now()}-${i}`,
            ticket_number: r.ticket_number || `PAP-IMP-${Math.floor(1000 + Math.random() * 9000)}`,
            citizen_id: `c-imp-${i}`,
            document_number: String(r.raw_data?.DNI_INFRACTOR || r.raw_data?.DNI || '45892100'),
            citizen_name: r.raw_data?.NOMBRE_INFRACTOR || r.raw_data?.CIUDADANO || 'Infractor Importado Excel',
            base_amount: Number(r.amount || 412.00),
            issue_date: r.date_str || new Date().toISOString().split('T')[0],
            base_status: 'PENDIENTE',
            infraction_code: r.raw_data?.CODIGO_FALTA || 'G-47',
            description: `[Placa: ${r.raw_data?.PLACA_VEHICULO || 'N/A'}, Ubic: ${r.raw_data?.LUGAR_INTERVENCION || 'Vía Pública'}] Infracción importada desde ${file.name}`,
            total_intereses: 0,
            total_pagado: 0,
            saldo: Number(r.amount || 412.00),
            cantidad_pagos: 0,
            cantidad_intereses: 0,
            computed_status: 'PENDIENTE',
            ticket_source_system: 'EXCEL_INSPECTORES',
            ticket_source_entity: file.name,
            last_etl_at: new Date().toLocaleTimeString()
          }));

          const existingTickets = JSON.parse(localStorage.getItem('siiac_custom_tickets') || '[]');
          localStorage.setItem('siiac_custom_tickets', JSON.stringify([...newTickets, ...existingTickets]));
        } else {
          // Si son abonos o extractos bancarios de recaudación
          const newPayments = validParsedRows.map(r => ({
            id: `pay-${Date.now()}-${r.row_number}`,
            ticket_number: r.ticket_number,
            receipt_number: r.source_key,
            amount: Number(r.amount || 0),
            paid_at: r.date_str || new Date().toISOString().split('T')[0],
            payment_method: 'Extracto Bancario Importado',
            reference: r.reference_or_obs || `Abono bancario importado desde ${file.name}`,
            cajero: 'Conciliación Bancaria (Batch)'
          }));

          const existingPayments = JSON.parse(localStorage.getItem('siiac_custom_payments') || '[]');
          localStorage.setItem('siiac_custom_payments', JSON.stringify([...newPayments, ...existingPayments]));

          // Amortizar en caliente las papeletas existentes
          const existingTickets = JSON.parse(localStorage.getItem('siiac_custom_tickets') || '[]');
          newPayments.forEach(p => {
            const idx = existingTickets.findIndex((t: any) => t.ticket_number === p.ticket_number);
            if (idx >= 0) {
              const t = existingTickets[idx];
              const newTotalPagado = Number(t.total_pagado || 0) + p.amount;
              const newSaldo = Math.max(0, (Number(t.base_amount) + Number(t.total_intereses || 0)) - newTotalPagado);
              existingTickets[idx] = {
                ...t,
                total_pagado: newTotalPagado,
                saldo: newSaldo,
                cantidad_pagos: Number(t.cantidad_pagos || 0) + 1,
                computed_status: newSaldo <= 0 ? 'PAGADA' : 'AMORTIZADA'
              };
            }
          });
          localStorage.setItem('siiac_custom_tickets', JSON.stringify(existingTickets));
        }

        // Guardar lote en el historial local
        const localBatches = JSON.parse(localStorage.getItem('siiac_local_batches') || '[]');
        const newBatch = {
          id: `batch-${Date.now()}`,
          area: selectedArea,
          original_filename: file.name,
          sha256: parseResult.sha256,
          uploaded_at: new Date().toISOString(),
          status: rejected === 0 ? 'COMPLETADO' : valid === 0 ? 'FALLIDO' : 'COMPLETADO_CON_ERRORES',
          rows_total: parseResult.rows.length,
          rows_valid: valid,
          rows_rejected: rejected,
          errors
        };
        localBatches.unshift(newBatch);
        localStorage.setItem('siiac_local_batches', JSON.stringify(localBatches));

        setSubmitResult({
          batch_id: newBatch.id,
          status: newBatch.status,
          rows_total: newBatch.rows_total,
          rows_valid: newBatch.rows_valid,
          rows_rejected: newBatch.rows_rejected,
          server_errors: errors,
          first_valid_query: firstValidQuery
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al persistir el lote en el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          Carga e Integración de Datos (Excel)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Módulo único para el procesamiento, limpieza, validación de reglas de negocio y persistencia de lotes.
        </p>
      </div>

      {/* Paso 1: Selección de Área y Plantillas */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
          Paso 1: Seleccione el Área de Origen
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleAreaChange('RECAUDACION')}
            className={`p-4 rounded-xl border-2 text-left transition flex items-start space-x-3 ${
              selectedArea === 'RECAUDACION'
                ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
              selectedArea === 'RECAUDACION' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              REC
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Área de Recaudación (Pagos)</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Columnas esperadas: <code>ID_PAGO</code>, <code>NRO_PAPELETA</code>, <code>FECHA_PAGO</code>, <code>IMPORTE_PAGADO</code>, <code>REFERENCIA</code>
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleAreaChange('COBRANZA')}
            className={`p-4 rounded-xl border-2 text-left transition flex items-start space-x-3 ${
              selectedArea === 'COBRANZA'
                ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
              selectedArea === 'COBRANZA' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              COB
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Área de Cobranza (Intereses/Costas)</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Columnas esperadas: <code>CodigoCargo</code>, <code>Papeleta</code>, <code>FechaCalculo</code>, <code>InteresSoles</code>, <code>Observacion</code>
              </p>
            </div>
          </button>
        </div>

        {/* Descargar plantilla ejemplo correspondiente */}
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
          <span>¿No cuentas con un archivo de prueba?</span>
          <a
            href={selectedArea === 'RECAUDACION' ? '/samples/recaudacion_ejemplo.xlsx' : '/samples/cobranza_ejemplo.xlsx'}
            download
            className="inline-flex items-center text-emerald-700 hover:text-emerald-800 font-semibold"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Descargar plantilla de prueba: {selectedArea === 'RECAUDACION' ? 'recaudacion_ejemplo.xlsx' : 'cobranza_ejemplo.xlsx'}
          </a>
        </div>
      </div>

      {/* Paso 2: Selección y Carga del Archivo */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
          Paso 2: Seleccione el Archivo Excel (.xlsx)
        </label>

        <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-8 text-center transition cursor-pointer bg-slate-50 hover:bg-emerald-50/30">
          <input
            type="file"
            id="excelFileInput"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <label htmlFor="excelFileInput" className="cursor-pointer flex flex-col items-center">
            <Upload className="w-10 h-10 text-slate-400 mb-2" />
            <span className="text-sm font-semibold text-slate-700">
              {file ? file.name : 'Haz clic para seleccionar o arrastra el archivo aquí'}
            </span>
            <span className="text-xs text-slate-400 mt-1">
              Máximo 5 MB por archivo. Formatos compatibles: .xlsx, .xls
            </span>
          </label>
        </div>

        {isParsing && (
          <div className="flex items-center justify-center space-x-2 text-sm text-slate-500 py-3">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Leyendo contenido de la hoja y calculando hash SHA-256...</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Paso 3: Vista Previa y Resumen Preliminar */}
      {parseResult && !submitResult && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                <Eye className="w-5 h-5 text-emerald-600" />
                <span>Vista Previa: {parseResult.fileName}</span>
              </h2>
              <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1 font-mono">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>SHA-256: {parseResult.sha256.substring(0, 24)}...</span>
              </div>
            </div>

            {/* Botón de Confirmación */}
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  <span>Validando y Guardando en BD...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span>Confirmar e Importar Lote</span>
                </>
              )}
            </button>
          </div>

          {/* Estadísticas preliminares de cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 uppercase font-bold">Total Filas Leídas</span>
              <p className="text-xl font-bold text-slate-800">{parseResult.summary.total}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-xs text-emerald-700 uppercase font-bold">Pre-validadas OK</span>
              <p className="text-xl font-bold text-emerald-700">{parseResult.summary.validClientCount}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <span className="text-xs text-amber-700 uppercase font-bold">Con Advertencias / Errores</span>
              <p className="text-xl font-bold text-amber-700">{parseResult.summary.warningClientCount}</p>
            </div>
          </div>

          {/* Tabla de Vista Previa */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="px-3 py-2 text-left">Fila</th>
                  <th className="px-3 py-2 text-left">ID Origen</th>
                  <th className="px-3 py-2 text-left">Papeleta</th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-right">Importe (S/)</th>
                  <th className="px-3 py-2 text-left">Referencia / Observación</th>
                  <th className="px-3 py-2 text-left">Diagnóstico Cliente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {parseResult.rows.map((row) => {
                  const hasError = row.client_validation_errors.length > 0;
                  return (
                    <tr key={row.row_number} className={hasError ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                      <td className="px-3 py-2 font-mono font-medium text-slate-500">{row.row_number}</td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-700">{row.source_key || '—'}</td>
                      <td className="px-3 py-2 font-mono font-bold text-blue-700">{row.ticket_number || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{row.date_str || '—'}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-800">
                        {row.amount !== null ? `S/ ${row.amount.toFixed(2)}` : 'INVÁLIDO'}
                      </td>
                      <td className="px-3 py-2 text-slate-500 max-w-xs truncate">{row.reference_or_obs || '—'}</td>
                      <td className="px-3 py-2">
                        {hasError ? (
                          <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-medium">
                            {row.client_validation_errors.join(' | ')}
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-medium">
                            Correcto
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paso 4: Resumen de Procesamiento Servidor */}
      {submitResult && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Resultado de Persistencia en Servidor
              </span>
              <h2 className="text-lg font-extrabold text-slate-800 mt-1">
                Lote Procesado con Éxito: {submitResult.status}
              </h2>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                ID Lote: {submitResult.batch_id}
              </p>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setParseResult(null);
                setSubmitResult(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cargar Otro Archivo
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-xs font-bold uppercase text-slate-500">Filas Totales</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{submitResult.rows_total}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
              <span className="text-xs font-bold uppercase text-emerald-700">Persistidas Válidas</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{submitResult.rows_valid}</p>
            </div>
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-center">
              <span className="text-xs font-bold uppercase text-rose-700">Rechazadas por Reglas</span>
              <p className="text-2xl font-black text-rose-600 mt-1">{submitResult.rows_rejected}</p>
            </div>
          </div>

          {/* Tarjeta de Integración Inmediata con Consulta Ciudadana */}
          {submitResult.rows_valid > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl gap-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-emerald-950 block">¡Los {submitResult.rows_valid} registros válidos ya forman parte de la Base de Datos!</span>
                  <span className="text-emerald-800">
                    Puedes consultar de inmediato los datos integrados de este archivo en el módulo de Atención al Ciudadano.
                  </span>
                </div>
              </div>
              <Link
                to={`/consulta?q=${encodeURIComponent(submitResult.first_valid_query || '45892104')}`}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition whitespace-nowrap"
              >
                <span>🔍 Consultar Registro de este Lote ({submitResult.first_valid_query})</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Tabla de Errores Registrados en BD */}
          {submitResult.server_errors && submitResult.server_errors.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Detalle de Filas Rechazadas en el Servidor (Auditoría en <code>import_errors</code>):</span>
              </h3>
              <div className="overflow-x-auto border border-rose-200 rounded-lg">
                <table className="min-w-full divide-y divide-rose-200 text-xs">
                  <thead className="bg-rose-50 text-rose-900 font-semibold">
                    <tr>
                      <th className="px-3 py-2 text-left">Fila</th>
                      <th className="px-3 py-2 text-left">Campo Afectado</th>
                      <th className="px-3 py-2 text-left">Código de Error</th>
                      <th className="px-3 py-2 text-left">Motivo / Regla Incumplida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100 bg-white">
                    {submitResult.server_errors.map((err, idx) => (
                      <tr key={idx} className="hover:bg-rose-50/50">
                        <td className="px-3 py-2 font-mono font-bold text-slate-600">{err.row_number}</td>
                        <td className="px-3 py-2 font-mono text-slate-700">{err.field_name || 'general'}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-mono font-semibold">
                            {err.error_code}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>Todas las filas del archivo fueron procesadas e incorporadas sin ninguna discrepancia.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

