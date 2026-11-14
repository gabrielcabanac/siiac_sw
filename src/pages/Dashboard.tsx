import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileSpreadsheet, 
  Search, 
  TrendingUp, 
  CreditCard, 
  AlertTriangle,
  CheckCircle2,
  Database,
  ArrowUpRight,
  Layers,
  Server
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { role } = useAuth();
  const [metrics, setMetrics] = useState({
    totalTickets: 28,
    totalBase: 18940.00,
    totalPagado: 9850.00,
    totalIntereses: 1485.00,
    saldoPendiente: 10575.00,
    totalBatches: 6,
    loading: true
  });

  useEffect(() => {
    const loadRealMetrics = async () => {
      if (!isSupabaseConfigured) {
        const customTickets = JSON.parse(localStorage.getItem('siiac_custom_tickets') || '[]');
        const customPayments = JSON.parse(localStorage.getItem('siiac_custom_payments') || '[]');
        const localBatches = JSON.parse(localStorage.getItem('siiac_local_batches') || '[]');
        const addedBase = customTickets.reduce((acc: number, t: any) => acc + Number(t.base_amount || 0), 0);
        const addedPaid = customPayments.reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
        
        setMetrics({
          totalTickets: 28 + customTickets.length,
          totalBase: 18940.00 + addedBase,
          totalPagado: 9850.00 + addedPaid,
          totalIntereses: 1485.00,
          saldoPendiente: Math.max(0, (18940.00 + addedBase + 1485.00) - (9850.00 + addedPaid)),
          totalBatches: 6 + localBatches.length,
          loading: false
        });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('consolidated_tickets_view')
          .select('base_amount, total_intereses, total_pagado, saldo');

        if (error) throw error;

        if (data && data.length > 0) {
          const totalTickets = data.length;
          const totalBase = data.reduce((acc, row) => acc + Number(row.base_amount || 0), 0);
          const totalIntereses = data.reduce((acc, row) => acc + Number(row.total_intereses || 0), 0);
          const totalPagado = data.reduce((acc, row) => acc + Number(row.total_pagado || 0), 0);
          const saldoPendiente = data.reduce((acc, row) => acc + Math.max(0, Number(row.saldo || 0)), 0);

          const { count: batchCount } = await supabase
            .from('import_batches')
            .select('*', { count: 'exact', head: true });

          setMetrics({
            totalTickets,
            totalBase,
            totalIntereses,
            totalPagado,
            saldoPendiente,
            totalBatches: batchCount || 0,
            loading: false
          });
        } else {
          setMetrics(prev => ({ ...prev, loading: false }));
        }
      } catch (err) {
        console.warn('Usando valores iniciales simulados para métricas:', err);
        setMetrics(prev => ({ ...prev, loading: false }));
      }
    };

    loadRealMetrics();
  }, []);

  const canOperate = role === 'admin' || role === 'operador';

  return (
    <div className="space-y-6">
      {/* Banner Superior */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
        <div className="max-w-3xl">
          <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800">
            Arquitectura de Integración Multi-BD + Staging + ETL
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-3 tracking-tight">
            Integración de Sistemas Operacionales y Archivos Excel
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Consolidación de las bases de datos de Tránsito (PHP) y Recaudación (C#) junto con hojas de cálculo de campo y extractos bancarios. Capa Staging con deduplicación por hash criptográfico y cero multiplicación cartesiana en consultas.
          </p>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Papeletas Integradas
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">{metrics.totalTickets}</p>
          <p className="text-xs text-slate-500 mt-1">Total Base: S/ {metrics.totalBase.toFixed(2)}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pagos Consolidados
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">S/ {metrics.totalPagado.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">BD Caja + Excel Bancos</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Intereses & Gastos
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">S/ {metrics.totalIntereses.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">Fuente: Excel Coactiva</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Saldo Exigible
            </span>
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-700 mt-2">S/ {metrics.saldoPendiente.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">Base + Intereses - Pagos</p>
        </div>
      </div>

      {/* Matriz de las 5 Fuentes y Acciones Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <h2 className="text-base font-bold text-slate-800 tracking-tight mb-4 flex items-center justify-between">
            <span>Matriz de Integración de Fuentes (3 Áreas • 5 Orígenes Heterogéneos)</span>
            <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
              Capa Staging Activa
            </span>
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-3">
                <Database className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-xs font-bold text-slate-800">1. BD Sistema Tránsito (legacy_papeletas)</h3>
                  <p className="text-[11px] text-slate-500">Área 1: Infracciones vehiculares y ciudadanos de base PHP legada.</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Conectado (Simulado)</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-3">
                <Server className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="text-xs font-bold text-slate-800">2. BD Fiscalización y Control Urbano (legacy_fiscalizacion)</h3>
                  <p className="text-[11px] text-slate-500">Área 3: Resoluciones de sanción comercial, obras y clausuras (Java).</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">Conectado (Simulado)</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-3">
                <Server className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-xs font-bold text-slate-800">3. BD Sistema Recaudación y Caja (legacy_recaudacion)</h3>
                  <p className="text-[11px] text-slate-500">Área 2: Recibos de caja ventanilla de sistema C# legado.</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Conectado (Simulado)</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-xs font-bold text-slate-800">4. Excel Inspectores de Campo (papeletas_campo.xlsx)</h3>
                  <p className="text-[11px] text-slate-500">Papeletas físicas de campo no registradas en BD central.</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Archivo Real</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-xs font-bold text-slate-800">5. Excel Bancos & Coactiva (bancos_externos.xlsx)</h3>
                  <p className="text-[11px] text-slate-500">Abonos bancarios BCP/BBVA y liquidación de mora.</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Archivo Real</span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 tracking-tight mb-4">
              Módulos del Sistema
            </h2>
            <div className="space-y-3">
              {canOperate ? (
                <>
                  <Link
                    to="/operaciones"
                    className="flex items-center justify-between p-3.5 rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-950 transition font-bold text-sm shadow-2xs"
                  >
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-purple-700" />
                      <span>Mesa de Partes / Digitación en Vivo</span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-purple-700" />
                  </Link>

                  <Link
                    to="/etl"
                    className="flex items-center justify-between p-3.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 transition font-bold text-sm shadow-2xs"
                  >
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-emerald-700" />
                      <span>Orquestador ETL (5 Fuentes)</span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-emerald-700" />
                  </Link>
                </>
              ) : (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 text-xs">
                  ETL restringido para rol Consulta
                </div>
              )}

              <Link
                to="/consulta"
                className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 transition font-medium text-sm"
              >
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-blue-700" />
                  <span>Atención al Ciudadano</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-blue-700" />
              </Link>

              <Link
                to="/historial"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition font-medium text-sm"
              >
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-slate-500" />
                  <span>Auditoría de Integraciones</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500" />
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
            <p><strong>Criterio Arquitectónico:</strong> Proceso transaccional e idempotente que detecta modificaciones de registros mediante hash y previene duplicidad.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
