import * as XLSX from 'xlsx';
import { AreaSource, ParsedRowPreview } from '../types';

export interface ParseResult {
  fileName: string;
  sha256: string;
  sheetName: string;
  headersFound: string[];
  rows: ParsedRowPreview[];
  summary: {
    total: number;
    validClientCount: number;
    warningClientCount: number;
  };
}

export async function calculateSHA256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Parser flexible para cualquier archivo Excel de la PoC
export function parseExcelFile(
  fileData: ArrayBuffer,
  fileName: string,
  area: AreaSource
): ParseResult {
  const workbook = XLSX.read(fileData, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('El archivo Excel no contiene ninguna hoja de cálculo.');
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    raw: false,
    defval: ''
  });

  if (rawRows.length === 0) {
    throw new Error('La hoja seleccionada está vacía.');
  }

  const firstRow = rawRows[0];
  const headersFound = Object.keys(firstRow);

  const parsedRows: ParsedRowPreview[] = [];
  let validClientCount = 0;
  let warningClientCount = 0;

  // Diccionario tolerante de variantes de nombres de columnas
  const findValue = (row: Record<string, any>, possibleKeys: string[]) => {
    for (const [k, v] of Object.entries(row)) {
      if (possibleKeys.includes(normalizeKey(k))) {
        return v;
      }
    }
    return '';
  };

  const keyMap = {
    source_key: ['idacta', 'id_acta', 'operacionid', 'operacion_id', 'idpago', 'id_pago', 'codigocargo', 'cod_recibo'],
    ticket_number: ['nropapeleta', 'nro_papeleta', 'papeleta', 'ticket_number', 'nroinfraccion'],
    date_str: ['fechainfraccion', 'fecha_infraccion', 'fechavalor', 'fecha_valor', 'fechapago', 'fecha_pago', 'fechacalculo'],
    amount: ['montomulta', 'monto_multa', 'importe', 'importepagado', 'importe_pagado', 'interessoles', 'monto'],
    reference: ['lugarintervencion', 'lugar_intervencion', 'canalbancoobs', 'canal_banco_obs', 'referencia', 'observacion'],
    doc_ciudadano: ['dniinfractor', 'dni_infractor', 'numdoc', 'doc_ciudadano', 'dni'],
    nombre_ciudadano: ['nombreinfractor', 'nombre_infractor', 'nombresapellidos', 'ciudadano'],
    tipo_transaccion: ['tipotransaccion', 'tipo_transaccion', 'tipo']
  };

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const clientValidationErrors: string[] = [];

    const rawSourceKey = String(findValue(row, keyMap.source_key) || '').trim();
    const rawTicketNumber = String(findValue(row, keyMap.ticket_number) || '').trim().toUpperCase();
    const rawDate = String(findValue(row, keyMap.date_str) || '').trim();
    const rawAmountStr = String(findValue(row, keyMap.amount) || '').trim();
    const rawReference = String(findValue(row, keyMap.reference) || '').trim();

    if (!rawTicketNumber) {
      clientValidationErrors.push('Falta número de papeleta.');
    }

    const parsedAmount = parseFloat(rawAmountStr.replace(/,/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      clientValidationErrors.push('Importe inválido o no positivo.');
    }

    let formattedDate = rawDate;
    if (rawDate.includes('CORRUPTA') || rawDate.includes('INVALIDA')) {
      clientValidationErrors.push('Formato de fecha corrupto o inválido.');
    } else {
      const parsedDate = new Date(rawDate);
      if (isNaN(parsedDate.getTime())) {
        clientValidationErrors.push('Formato de fecha inválido.');
      } else {
        formattedDate = parsedDate.toISOString().split('T')[0];
      }
    }

    if (clientValidationErrors.length === 0) {
      validClientCount++;
    } else {
      warningClientCount++;
    }

    parsedRows.push({
      row_number: rowNumber,
      source_key: rawSourceKey || `KEY-${rowNumber}`,
      ticket_number: rawTicketNumber,
      date_str: formattedDate,
      amount: isNaN(parsedAmount) ? null : parsedAmount,
      reference_or_obs: rawReference,
      raw_data: row,
      client_validation_errors: clientValidationErrors
    });
  });

  return {
    fileName,
    sha256: '',
    sheetName,
    headersFound,
    rows: parsedRows,
    summary: {
      total: parsedRows.length,
      validClientCount,
      warningClientCount
    }
  };
}
