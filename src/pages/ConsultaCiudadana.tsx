import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  User, 
  CreditCard, 
  TrendingUp, 
  FileText, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  Phone,
  Mail,
  Receipt,
  Layers,
  Database,
  Calendar
} from 'lucide-react';
import { ConsolidatedTicket } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { StatusBadge } from '../components/StatusBadge';

// Dataset ampliado y robusto con múltiples perfiles de ciudadanos
const MOCK_CONSOLIDATED: ConsolidatedTicket[] = [
  // 1. Juan Carlos Pérez Quispe (Demostración de 4 fuentes en PAP-2024-00101)
  {
    ticket_id: 't1000000-0000-0000-0000-000000000001',
    ticket_number: 'PAP-2024-00101',
    citizen_id: 'c1000000-0000-0000-0000-000000000001',
    document_number: '45892104',
    citizen_name: 'Juan Carlos Pérez Quispe',
    citizen_phone: '987-112-233',
    citizen_email: 'juan.perez.mock@siiac.gob.pe',
    base_amount: 350.00,
    issue_date: '2024-01-15',
    base_status: 'PENDIENTE',
    infraction_code: 'M-01',
    description: 'Estacionar en zona rígida o prohibida señalizada',
    total_intereses: 50.00,
    total_pagado: 250.00,
    saldo: 150.00,
    cantidad_pagos: 2,
    cantidad_intereses: 2,
    ultimo_pago_fecha: '2024-02-25',
    ultimo_cargo_fecha: '2024-03-30',
    computed_status: 'AMORTIZADA',
    ticket_source_system: 'BD_PAPELETAS_LEGADO',
    ticket_source_entity: 'sgp_papeletas (PHP)',
    last_etl_at: '2024-08-15 10:30'
  },
  {
    ticket_id: 't1000000-0000-0000-0000-000000000002',
    ticket_number: 'PAP-2024-00102',
    citizen_id: 'c1000000-0000-0000-0000-000000000001',
    document_number: '45892104',
    citizen_name: 'Juan Carlos Pérez Quispe',
    citizen_phone: '987-112-233',
    citizen_email: 'juan.perez.mock@siiac.gob.pe',
    base_amount: 210.00, // Reclasificado por inspectores (original 180.00)
    issue_date: '2024-02-10',
    base_status: 'PENDIENTE',
    infraction_code: 'G-40',
    description: 'Giro indebido a la izquierda en intersección semaforizada',
    total_intereses: 18.00,
    total_pagado: 0.00,
    saldo: 228.00,
    cantidad_pagos: 0,
    cantidad_intereses: 1,
    ultimo_cargo_fecha: '2024-03-31',
    computed_status: 'PENDIENTE',
    ticket_source_system: 'EXCEL_INSPECTORES',
    ticket_source_entity: 'papeletas_campo_inspectores.xlsx',
    last_etl_at: '2024-08-15 10:30'
  },
  {
    ticket_id: 't1000000-0000-0000-0000-000000000099',
    ticket_number: 'RSA-2024-00305',
    citizen_id: 'c1000000-0000-0000-0000-000000000001',
    document_number: '45892104',
    citizen_name: 'Juan Carlos Pérez Quispe',
    citizen_phone: '987-112-233',
    citizen_email: 'juan.perez.mock@siiac.gob.pe',
    base_amount: 2575.00,
    issue_date: '2024-04-05',
    base_status: 'PENDIENTE',
    infraction_code: 'FISC-01',
    description: '[Giro: Restaurante Cevichería El Marino, Ubic: Av. Arequipa 1420] Operar establecimiento comercial sin Licencia Municipal de Funcionamiento vigente — Medida: Clausura Temporal del Establecimiento',
    total_intereses: 0.00,
    total_pagado: 0.00,
    saldo: 2575.00,
    cantidad_pagos: 0,
    cantidad_intereses: 0,
    computed_status: 'PENDIENTE',
    ticket_source_system: 'BD_FISCALIZACION_LEGADO',
    ticket_source_entity: 'sgf_sanciones (PostgreSQL/Java)',
    last_etl_at: '2024-08-15 10:30'
  },

  // 2. María Elena Rodríguez Mendoza (Caso de Cancelación Total)
  {
    ticket_id: 't1000000-0000-0000-0000-000000000003',
    ticket_number: 'PAP-2024-00201',
    citizen_id: 'c1000000-0000-0000-0000-000000000002',
    document_number: '71203948',
    citizen_name: 'María Elena Rodríguez Mendoza',
    citizen_phone: '998-223-344',
    citizen_email: 'maria.rodriguez.mock@siiac.gob.pe',
    base_amount: 450.00,
    issue_date: '2024-03-05',
    base_status: 'PENDIENTE',
    infraction_code: 'M-02',
    description: 'Conducir sin placa visible o con placas adulteradas',
    total_intereses: 0.00,
    total_pagado: 450.00,
    saldo: 0.00,
    cantidad_pagos: 1,
    cantidad_intereses: 0,
    ultimo_pago_fecha: '2024-03-20',
    computed_status: 'PAGADA',
    ticket_source_system: 'BD_PAPELETAS_LEGADO',
    ticket_source_entity: 'sgp_papeletas (PHP)',
    last_etl_at: '2024-08-15 10:30'
  },
  {
    ticket_id: 't1000000-0000-0000-0000-000000000004',
    ticket_number: 'PAP-2024-00202',
    citizen_id: 'c1000000-0000-0000-0000-000000000002',
    document_number: '71203948',
    citizen_name: 'María Elena Rodríguez Mendoza',
    citizen_phone: '998-223-344',
    citizen_email: 'maria.rodriguez.mock@siiac.gob.pe',
    base_amount: 620.00,
    issue_date: '2024-04-12',
    base_status: 'PENDIENTE',
    infraction_code: 'M-17',
    description: 'Cruzar intersección con semáforo en luz roja',
    total_intereses: 62.00,
    total_pagado: 300.00,
    saldo: 382.00,
    cantidad_pagos: 1,
    cantidad_intereses: 1,
    ultimo_pago_fecha: '2024-05-02',
    ultimo_cargo_fecha: '2024-05-30',
    computed_status: 'AMORTIZADA',
    ticket_source_system: 'BD_PAPELETAS_LEGADO',
    ticket_source_entity: 'sgp_papeletas (PHP)',
    last_etl_at: '2024-08-15 10:30'
  },

  // 3. Carlos Alberto Sánchez Torres (Falta Muy Grave con Fraccionamiento)
  {
    ticket_id: 't1000000-0000-0000-0000-000000000005',
    ticket_number: 'PAP-2024-00301',
    citizen_id: 'c1000000-0000-0000-0000-000000000003',
    document_number: '10459283',
    citizen_name: 'Carlos Alberto Sánchez Torres',
    citizen_phone: '976-334-455',
    citizen_email: 'carlos.sanchez.mock@siiac.gob.pe',
    base_amount: 1200.00,
    issue_date: '2024-01-20',
    base_status: 'PENDIENTE',
    infraction_code: 'M-04',
    description: 'Conducir bajo efectos de alcohol superando límite legal',
    total_intereses: 120.00,
    total_pagado: 1200.00,
    saldo: 120.00,
    cantidad_pagos: 2,
    cantidad_intereses: 1,
    ultimo_pago_fecha: '2024-03-10',
    ultimo_cargo_fecha: '2024-03-15',
    computed_status: 'AMORTIZADA',
    ticket_source_system: 'BD_PAPELETAS_LEGADO',
    ticket_source_entity: 'sgp_papeletas (PHP)',
    last_etl_at: '2024-08-15 10:30'
  },

  // 4. Jorge Luis Mamani Condori (Conductor de Transporte con 3 Papeletas)
  {
    ticket_id: 't1000000-0000-0000-0000-000000000006',
    ticket_number: 'PAP-2024-00701',
    citizen_id: 'c1000000-0000-0000-0000-000000000004',
    document_number: '48192031',
    citizen_name: 'Jorge Luis Mamani Condori',
    citizen_phone: '981-223-344',
    citizen_email: 'jorge.mamani.mock@siiac.gob.pe',
    base_amount: 1100.00,
    issue_date: '2024-04-10',
    base_status: 'PENDIENTE',
    infraction_code: 'M-01',
    description: 'Prestar servicio de transporte público sin autorización',
    total_intereses: 85.00,
    total_pagado: 900.00,
    saldo: 285.00,
    cantidad_pagos: 2,
    cantidad_intereses: 1,
    ultimo_pago_fecha: '2024-05-15',
    ultimo_cargo_fecha: '2024-06-01',
    computed_status: 'AMORTIZADA',
    ticket_source_system: 'BD_PAPELETAS_LEGADO',
    ticket_source_entity: 'sgp_papeletas (PHP)',
    last_etl_at: '2024-08-15 10:30'
  },
  {
    ticket_id: 't1000000-0000-0000-0000-000000000007',
    ticket_number: 'PAP-2024-00702',
    citizen_id: 'c1000000-0000-0000-0000-000000000004',
    document_number: '48192031',
    citizen_name: 'Jorge Luis Mamani Condori',
    citizen_phone: '981-223-344',
    citizen_email: 'jorge.mamani.mock@siiac.gob.pe',
    base_amount: 450.00,
    issue_date: '2024-05-22',
    base_status: 'PENDIENTE',
    infraction_code: 'G-28',
    description: 'Bajar o subir pasajeros en lugares no autorizados',
    total_intereses: 0.00,
    total_pagado: 0.00,
    saldo: 450.00,
    cantidad_pagos: 0,
    cantidad_intereses: 0,
    computed_status: 'PENDIENTE',
    ticket_source_system: 'EXCEL_INSPECTORES',
    ticket_source_entity: 'papeletas_campo_inspectores.xlsx',
    last_etl_at: '2024-08-15 10:30'
  },
  {
    ticket_id: 't1000000-0000-0000-0000-000000000008',
    ticket_number: 'PAP-2024-00703',
    citizen_id: 'c1000000-0000-0000-0000-000000000004',
    document_number: '48192031',
    citizen_name: 'Jorge Luis Mamani Condori',
    citizen_phone: '981-223-344',
    citizen_email: 'jorge.mamani.mock@siiac.gob.pe',
    base_amount: 620.00,
    issue_date: '2024-07-05',
    base_status: 'PENDIENTE',
    infraction_code: 'M-17',
    description: 'No respetar luz roja del semáforo en intersección crítica',
    total_intereses: 0.00,
    total_pagado: 0.00,
    saldo: 620.00,
    cantidad_pagos: 0,
    cantidad_intereses: 0,
    computed_status: 'PENDIENTE',
    ticket_source_system: 'EXCEL_INSPECTORES',
    ticket_source_entity: 'papeletas_campo_inspectores.xlsx',
    last_etl_at: '2024-08-15 10:30'
  },

  // 5. Patricia Giuliana Flores Vargas (Caso Totalmente Cancelado)
  {
    ticket_id: 't1000000-0000-0000-0000-000000000009',
    ticket_number: 'PAP-2024-00801',
    citizen_id: 'c1000000-0000-0000-0000-000000000005',
    document_number: '70291845',
    citizen_name: 'Patricia Giuliana Flores Vargas',
    citizen_phone: '972-334-455',
    citizen_email: 'patricia.flores.mock@siiac.gob.pe',
    base_amount: 495.00,
    issue_date: '2024-03-12',
    base_status: 'PENDIENTE',
    infraction_code: 'L-04',
    description: 'Estacionar en espacio reservado para personas con discapacidad',
    total_intereses: 0.00,
    total_pagado: 495.00,
    saldo: 0.00,
    cantidad_pagos: 1,
    cantidad_intereses: 0,
    ultimo_pago_fecha: '2024-03-25',
    computed_status: 'PAGADA',
    ticket_source_system: 'BD_PAPELETAS_LEGADO',
    ticket_source_entity: 'sgp_papeletas (PHP)',
    last_etl_at: '2024-08-15 10:30'
  },

  // 6. Manuel Enrique Morales Chumpitaz (Sin SOAT)
  {
    ticket_id: 't1000000-0000-0000-0000-000000000010',
    ticket_number: 'PAP-2024-01101',
    citizen_id: 'c1000000-0000-0000-0000-000000000006',
    document_number: '09384712',
    citizen_name: 'Manuel Enrique Morales Chumpitaz',
    citizen_phone: '945-667-788',
    citizen_email: 'manuel.morales.mock@siiac.gob.pe',
    base_amount: 1850.00,
    issue_date: '2024-01-28',
    base_status: 'PENDIENTE',
    infraction_code: 'M-02',
    description: 'Conducir vehículo sin contar con SOAT vigente',
    total_intereses: 185.00,
    total_pagado: 1500.00,
    saldo: 535.00,
    cantidad_pagos: 2,
    cantidad_intereses: 1,
    ultimo_pago_fecha: '2024-03-15',
    ultimo_cargo_fecha: '2024-03-01',
    computed_status: 'AMORTIZADA',
    ticket_source_system: 'BD_PAPELETAS_LEGADO',
    ticket_source_entity: 'sgp_papeletas (PHP)',
    last_etl_at: '2024-08-15 10:30'
  },

  // 7. Carmen Rosa Salazar Villanueva (Cancelada en Ventanilla)
  {
    ticket_id: 't1000000-0000-0000-0000-000000000011',
    ticket_number: 'PAP-2024-01201',
    citizen_id: 'c1000000-0000-0000-0000-000000000007',
    document_number: '72839401',
    citizen_name: 'Carmen Rosa Salazar Villanueva',
    citizen_phone: '936-778-899',
    citizen_email: 'carmen.salazar.mock@siiac.gob.pe',
    base_amount: 550.00,
    issue_date: '2024-04-14',
    base_status: 'PENDIENTE',
    infraction_code: 'M-19',
    description: 'No ceder el paso a peatones en cruce peatonal señalizado',
    total_intereses: 0.00,
    total_pagado: 550.00,
    saldo: 0.00,
    cantidad_pagos: 1,
    cantidad_intereses: 0,
    ultimo_pago_fecha: '2024-05-02',
    computed_status: 'PAGADA',
    ticket_source_system: 'BD_PAPELETAS_LEGADO',
    ticket_source_entity: 'sgp_papeletas (PHP)',
    last_etl_at: '2024-08-15 10:30'
  }
];

export const ConsultaCiudadana: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('45892104');
  const [results, setResults] = useState<ConsolidatedTicket[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [ticketDetails, setTicketDetails] = useState<{
    payments: any[];
    interests: any[];
  } | null>(null);

  const performSearch = async (termToSearch: string) => {
    const query = termToSearch.trim();
    if (!query) return;

    setIsLoading(true);
    setHasSearched(true);
    setExpandedTicketId(null);
    setTicketDetails(null);

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('consolidated_tickets_view')
          .select('*')
          .or(`document_number.ilike.%${query}%,ticket_number.ilike.%${query}%`);

        if (error) throw error;
        setResults(data || []);
      } else {
        await new Promise(r => setTimeout(r, 200));
        const customTickets: ConsolidatedTicket[] = JSON.parse(localStorage.getItem('siiac_custom_tickets') || '[]');
        const allDataset = [...customTickets, ...MOCK_CONSOLIDATED];
        const filtered = allDataset.filter(
          item =>
            item.document_number.includes(query) ||
            item.ticket_number.toUpperCase().includes(query.toUpperCase()) ||
            item.citizen_name.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered);
      }
    } catch (err) {
      console.error('Error en consulta ciudadana:', err);
      const customTickets: ConsolidatedTicket[] = JSON.parse(localStorage.getItem('siiac_custom_tickets') || '[]');
      const allDataset = [...customTickets, ...MOCK_CONSOLIDATED];
      const filtered = allDataset.filter(
        item =>
          item.document_number.includes(query) ||
          item.ticket_number.toUpperCase().includes(query.toUpperCase())
      );
      setResults(filtered);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    performSearch(searchTerm);
  };

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setSearchTerm(q);
      performSearch(q);
    }
  }, [searchParams]);

  const handleToggleDetails = async (ticket: ConsolidatedTicket) => {
    if (expandedTicketId === ticket.ticket_id) {
      setExpandedTicketId(null);
      setTicketDetails(null);
      return;
    }

    setExpandedTicketId(ticket.ticket_id);

    if (isSupabaseConfigured) {
      try {
        const [payRes, intRes] = await Promise.all([
          supabase.from('payments').select('*').eq('ticket_id', ticket.ticket_id),
          supabase.from('interest_charges').select('*').eq('ticket_id', ticket.ticket_id)
        ]);
        setTicketDetails({
          payments: payRes.data || [],
          interests: intRes.data || []
        });
      } catch (err) {
        console.error('Error al cargar desglose:', err);
      }
    } else {
      // Mock con trazabilidad exacta de las transacciones
      const customPayments = JSON.parse(localStorage.getItem('siiac_custom_payments') || '[]');
      const matchingCustomPayments = customPayments
        .filter((p: any) => p.ticket_number === ticket.ticket_number)
        .map((p: any) => ({
          id: p.id,
          source_record_key: p.receipt_number,
          paid_at: p.paid_at,
          amount: Number(p.amount),
          reference: `${p.reference} [${p.payment_method}] - Cajero: ${p.cajero || 'Gabriel Cabana'}`,
          source_system: 'BD_RECAUDACION_LEGADO',
          source_entity: 'caja_pagos (C# Operativo)'
        }));

      if (ticket.ticket_number === 'PAP-2024-00101') {
        setTicketDetails({
          payments: [
            { id: 'p1', source_record_key: 'REC-CAJA-101', paid_at: '2024-02-01', amount: 200.00, reference: 'Ventanilla 01 - Sede Central', source_system: 'BD_RECAUDACION_LEGADO', source_entity: 'caja_pagos (C#)' },
            { id: 'p2', source_record_key: 'EXT-BN-501', paid_at: '2024-02-25', amount: 50.00, reference: 'Abono agente BCP N° 4589 - San Isidro', source_system: 'EXCEL_BANCOS_COBRANZA', source_entity: 'recaudacion_bancos_externos.xlsx' },
            ...matchingCustomPayments
          ],
          interests: [
            { id: 'i1', source_record_key: 'COB-MORA-01', charged_at: '2024-02-28', amount: 35.00, observation: 'Interés moratorio 30 días mora coactiva', source_system: 'EXCEL_BANCOS_COBRANZA', source_entity: 'recaudacion_bancos_externos.xlsx' },
            { id: 'i2', source_record_key: 'COB-MORA-02', charged_at: '2024-03-30', amount: 15.00, observation: 'Mora acumulada 60 días notificación', source_system: 'EXCEL_BANCOS_COBRANZA', source_entity: 'recaudacion_bancos_externos.xlsx' }
          ]
        });
      } else if (ticket.ticket_number === 'PAP-2024-00201') {
        setTicketDetails({
          payments: [
            { id: 'p3', source_record_key: 'REC-CAJA-102', paid_at: '2024-03-20', amount: 450.00, reference: 'Cancelación total en Ventanilla 02 - Sede Norte', source_system: 'BD_RECAUDACION_LEGADO', source_entity: 'caja_pagos (C#)' }
          ],
          interests: []
        });
      } else if (ticket.ticket_number === 'PAP-2024-00701') {
        setTicketDetails({
          payments: [
            { id: 'p4', source_record_key: 'REC-CAJA-104', paid_at: '2024-04-25', amount: 400.00, reference: 'Abono en Ventanilla 03 - Sede Sur', source_system: 'BD_RECAUDACION_LEGADO', source_entity: 'caja_pagos (C#)' },
            { id: 'p5', source_record_key: 'EXT-BN-507', paid_at: '2024-05-15', amount: 500.00, reference: 'Abono agente BCP', source_system: 'EXCEL_BANCOS_COBRANZA', source_entity: 'recaudacion_bancos_externos.xlsx' }
          ],
          interests: [
            { id: 'i4', source_record_key: 'COB-MORA-06', charged_at: '2024-06-01', amount: 85.00, observation: 'Interés moratorio por deuda impaga coactiva', source_system: 'EXCEL_BANCOS_COBRANZA', source_entity: 'recaudacion_bancos_externos.xlsx' }
          ]
        });
      } else {
        setTicketDetails({
          payments: matchingCustomPayments,
          interests: [
            { id: 'i5', source_record_key: 'COB-4002', charged_at: '2024-03-31', amount: 18.00, observation: 'Interés por mora ordinaria', source_system: 'EXCEL_BANCOS_COBRANZA', source_entity: 'recaudacion_bancos_externos.xlsx' }
          ]
        });
      }
    }
  };

  const firstCitizen = results[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          Consulta y Atención al Ciudadano
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Búsqueda unificada en tiempo real con trazabilidad de origen (BD Tránsito, BD Caja, Excel Campo y Excel Bancos).
        </p>
      </div>

      {/* Barra de Búsqueda */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ingrese DNI (ej: 45892104, 71203948, 48192031) o Papeleta (ej: PAP-2024-00101)..."
              className="w-full pl-11 pr-4 py-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm transition flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Consultar Estado</span>
              </>
            )}
          </button>
        </form>

        {/* Sugerencias Rápidas de Prueba */}
        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Casos reales de demostración:</span>
          <button
            type="button"
            onClick={() => { setSearchTerm('45892104'); }}
            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 text-emerald-800 font-mono font-medium border border-slate-200"
          >
            DNI: 45892104 (Pérez • 4 fuentes)
          </button>
          <button
            type="button"
            onClick={() => { setSearchTerm('71203948'); }}
            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 text-emerald-800 font-mono font-medium border border-slate-200"
          >
            DNI: 71203948 (Rodríguez • Pagada 100%)
          </button>
          <button
            type="button"
            onClick={() => { setSearchTerm('48192031'); }}
            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 text-emerald-800 font-mono font-medium border border-slate-200"
          >
            DNI: 48192031 (Mamani • 3 papeletas)
          </button>
          <button
            type="button"
            onClick={() => { setSearchTerm('09384712'); }}
            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 text-emerald-800 font-mono font-medium border border-slate-200"
          >
            DNI: 09384712 (Morales • Sin SOAT)
          </button>
        </div>
      </div>

      {/* Resultados */}
      {hasSearched && (
        <div className="space-y-6">
          {results.length > 0 ? (
            <>
              {/* Tarjeta del Ciudadano */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl">
                    <User className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Datos del Ciudadano Infractor
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                      {firstCitizen.citizen_name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-1">
                      <span className="font-mono font-semibold">DNI: {firstCitizen.document_number}</span>
                      {firstCitizen.citizen_phone && (
                        <span className="flex items-center">
                          <Phone className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {firstCitizen.citizen_phone}
                        </span>
                      )}
                      {firstCitizen.citizen_email && (
                        <span className="flex items-center">
                          <Mail className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {firstCitizen.citizen_email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right border-t md:border-t-0 pt-3 md:pt-0">
                  <span className="text-xs text-slate-500 uppercase font-bold">Total Infracciones</span>
                  <p className="text-2xl font-black text-slate-800">{results.length} papeleta(s)</p>
                </div>
              </div>

              {/* Tabla de Papeletas Consolidadas */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>Infracciones Consolidadas y Liquidación de Saldo</span>
                  </h3>
                  <span className="text-xs text-slate-500">
                    Fórmula: Saldo = Base + Intereses - Pagos (Sin Producto Cartesiano)
                  </span>
                </div>

                <div className="divide-y divide-slate-200">
                  {results.map((ticket) => {
                    const isExpanded = expandedTicketId === ticket.ticket_id;
                    return (
                      <div key={ticket.ticket_id} className="p-5 hover:bg-slate-50/60 transition">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Datos de la papeleta y Trazabilidad */}
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-base font-black text-blue-700">
                                {ticket.ticket_number}
                              </span>
                              <StatusBadge status={ticket.computed_status} />

                              {/* Distintivo de Área Municipal */}
                              {ticket.ticket_number.startsWith('RSA') || ticket.ticket_source_system?.includes('FISCALIZACION') ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                  🏢 Fiscalización y Control Urbano
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                  🚗 Tránsito y Transporte
                                </span>
                              )}
                              
                              {/* Pill de Trazabilidad de Origen */}
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                <Database className="w-3 h-3 mr-1 text-slate-500" />
                                {ticket.ticket_source_system || 'BD_PAPELETAS_LEGADO'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 font-medium">
                              {ticket.description || 'Infracción al Reglamento Nacional de Tránsito'}
                            </p>

                            <div className="flex items-center space-x-4 text-[11px] text-slate-400">
                              <span>Emisión: <strong className="text-slate-600">{ticket.issue_date}</strong></span>
                              <span>•</span>
                              <span>Entidad de Origen: <code className="text-slate-600">{ticket.ticket_source_entity || 'sgp_papeletas'}</code></span>
                            </div>
                          </div>

                          {/* Cuadrícula de Montos Integrados */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center text-xs">
                            <div>
                              <span className="text-slate-500 block uppercase text-[10px] font-bold">Monto Base</span>
                              <span className="font-bold text-slate-800 text-sm">
                                S/ {Number(ticket.base_amount).toFixed(2)}
                              </span>
                            </div>

                            <div>
                              <span className="text-amber-700 block uppercase text-[10px] font-bold">
                                + Intereses ({ticket.cantidad_intereses})
                              </span>
                              <span className="font-bold text-amber-700 text-sm">
                                S/ {Number(ticket.total_intereses).toFixed(2)}
                              </span>
                            </div>

                            <div>
                              <span className="text-emerald-700 block uppercase text-[10px] font-bold">
                                - Pagos ({ticket.cantidad_pagos})
                              </span>
                              <span className="font-bold text-emerald-700 text-sm">
                                S/ {Number(ticket.total_pagado).toFixed(2)}
                              </span>
                            </div>

                            <div className="border-l border-slate-300 pl-2">
                              <span className="text-slate-900 block uppercase text-[10px] font-bold">
                                = Saldo Exigible
                              </span>
                              <span className={`font-black text-base ${
                                Number(ticket.saldo) <= 0 ? 'text-emerald-600' : 'text-rose-700'
                              }`}>
                                S/ {Number(ticket.saldo).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Botón Desplegar Trazabilidad Detallada */}
                          <div>
                            <button
                              onClick={() => handleToggleDetails(ticket)}
                              className="w-full lg:w-auto inline-flex items-center justify-center px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition space-x-1"
                            >
                              <span>{isExpanded ? 'Ocultar Trazabilidad' : 'Ver Fuentes y Transacciones'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Desglose desplegable con procedencia de cada registro */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Desglose Pagos */}
                            <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2 flex items-center space-x-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Abonos y Pagos Registrados</span>
                              </h4>
                              {ticketDetails && ticketDetails.payments.length > 0 ? (
                                <ul className="space-y-2 text-xs">
                                  {ticketDetails.payments.map((p, idx) => (
                                    <li key={idx} className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono font-bold text-slate-800">{p.source_record_key}</span>
                                        <span className="font-black text-emerald-700">S/ {Number(p.amount).toFixed(2)}</span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 mt-0.5">{p.reference || 'Sin referencia'}</p>
                                      <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                        <span className="text-emerald-800 font-semibold">{p.source_system} ({p.source_entity})</span>
                                        <span>Fecha: {p.paid_at}</span>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-slate-500 italic">No registra pagos abonados.</p>
                              )}
                            </div>

                            {/* Desglose Intereses */}
                            <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-2 flex items-center space-x-1.5">
                                <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                                <span>Cargos, Intereses y Costas Procesales</span>
                              </h4>
                              {ticketDetails && ticketDetails.interests.length > 0 ? (
                                <ul className="space-y-2 text-xs">
                                  {ticketDetails.interests.map((c, idx) => (
                                    <li key={idx} className="bg-white p-2.5 rounded-lg border border-amber-100 shadow-2xs">
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono font-bold text-slate-800">{c.source_record_key}</span>
                                        <span className="font-black text-amber-700">S/ {Number(c.amount).toFixed(2)}</span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 mt-0.5">{c.observation || 'Sin observación'}</p>
                                      <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                        <span className="text-amber-800 font-semibold">{c.source_system} ({c.source_entity})</span>
                                        <span>Fecha: {c.charged_at}</span>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-slate-500 italic">No registra recargos ni gastos de cobranza.</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center max-w-md mx-auto">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No se encontraron registros</h3>
              <p className="text-xs text-slate-500 mt-1">
                No hay papeletas asociadas al criterio de búsqueda "<strong>{searchTerm}</strong>".
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
