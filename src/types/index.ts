export type UserRole = 'admin' | 'operador' | 'consulta';

export interface UserProfile {
  id: string;
  role: UserRole;
  full_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface Citizen {
  id: string;
  document_number: string;
  full_name: string;
  phone?: string;
  email?: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  citizen_id: string;
  base_amount: number;
  issue_date: string;
  status: string;
  infraction_code?: string;
  description?: string;
  source_system?: string;
  source_entity?: string;
  source_record_id?: string;
  record_hash?: string;
  last_etl_at?: string;
}

export interface ConsolidatedTicket {
  ticket_id: string;
  ticket_number: string;
  citizen_id: string;
  document_number: string;
  citizen_name: string;
  citizen_phone?: string;
  citizen_email?: string;
  base_amount: number;
  issue_date: string;
  base_status: string;
  infraction_code?: string;
  description?: string;
  total_intereses: number;
  total_pagado: number;
  saldo: number;
  cantidad_pagos: number;
  cantidad_intereses: number;
  ultimo_pago_fecha?: string;
  ultimo_cargo_fecha?: string;
  computed_status: 'PAGADA' | 'AMORTIZADA' | 'PENDIENTE';
  ticket_source_system?: string;
  ticket_source_entity?: string;
  last_etl_at?: string;
}

export interface PaymentRecord {
  id: string;
  ticket_id: string;
  source_record_key: string;
  paid_at: string;
  amount: number;
  reference?: string;
  source_system?: string;
  source_entity?: string;
  record_hash?: string;
  last_etl_at?: string;
}

export interface InterestChargeRecord {
  id: string;
  ticket_id: string;
  source_record_key: string;
  charged_at: string;
  amount: number;
  observation?: string;
  source_system?: string;
  source_entity?: string;
  record_hash?: string;
  last_etl_at?: string;
}

export type AreaSource = 'RECAUDACION' | 'COBRANZA' | 'TRANSITO_CAMPOS' | 'BANCOS_EXTERNOS';

export interface ImportBatch {
  id: string;
  area: AreaSource;
  original_filename: string;
  sha256?: string;
  uploader_id?: string;
  uploaded_at: string;
  status: 'EN_PROCESO' | 'COMPLETADO' | 'COMPLETADO_CON_ERRORES' | 'COMPLETADO_CON_ADVERTENCIAS' | 'FALLIDO';
  rows_total: number;
  rows_valid: number;
  rows_rejected: number;
}

export interface ImportError {
  id: string;
  batch_id: string;
  row_number: number;
  field_name?: string;
  error_code: string;
  message: string;
  created_at: string;
}

export interface ETLRun {
  id: string;
  executed_by?: string;
  started_at: string;
  finished_at?: string;
  status: 'INICIADO' | 'EN_PROCESO' | 'COMPLETADO' | 'COMPLETADO_CON_ADVERTENCIAS' | 'FALLIDO';
  total_extracted: number;
  total_inserted: number;
  total_updated: number;
  total_unchanged: number;
  total_rejected: number;
  details?: Record<string, any>;
}

export interface ETLError {
  id: string;
  etl_run_id: string;
  source_system: string;
  source_entity: string;
  record_identifier: string;
  error_code: string;
  message: string;
  rejected_payload?: any;
  created_at: string;
}

export interface ParsedRowPreview {
  row_number: number;
  source_key: string;
  ticket_number: string;
  date_str: string;
  amount: number | null;
  reference_or_obs: string;
  raw_data: Record<string, any>;
  client_validation_errors: string[];
}
