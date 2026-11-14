const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'public', 'samples');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// ====================================================================
// 1. FUENTE 2: Excel de Inspectores de Campo (Área 1: Tránsito)
// Infracciones en vía pública levantadas por fiscalizadores (25 filas)
// ====================================================================
const papeletasCampoData = [
  // Lote 1: Operativo Vía Expresa y Centro
  { ID_ACTA: 'ACTA-2024-001', NRO_PAPELETA: 'PAP-2024-00401', DNI_INFRACTOR: '08392019', NOMBRE_INFRACTOR: 'Rosa Victoria Huamán Ramos', MONTO_MULTA: 280.00, FECHA_INFRACCION: '2024-05-18', CODIGO_FALTA: 'G-10', PLACA_VEHICULO: 'AXT-402', INSPECTOR: 'INSP-104', LUGAR_INTERVENCION: 'Av. Arequipa cdra. 12' },
  { ID_ACTA: 'ACTA-2024-002', NRO_PAPELETA: 'PAP-2024-00402', DNI_INFRACTOR: '08392019', NOMBRE_INFRACTOR: 'Rosa Victoria Huamán Ramos', MONTO_MULTA: 510.00, FECHA_INFRACCION: '2024-06-01', CODIGO_FALTA: 'M-20', PLACA_VEHICULO: 'AXT-402', INSPECTOR: 'INSP-104', LUGAR_INTERVENCION: 'Óvalo Miraflores' },
  { ID_ACTA: 'ACTA-2024-003', NRO_PAPELETA: 'PAP-2024-00501', DNI_INFRACTOR: '42198034', NOMBRE_INFRACTOR: 'Luis Fernando Castro Morales', MONTO_MULTA: 950.00, FECHA_INFRACCION: '2024-02-28', CODIGO_FALTA: 'M-03', PLACA_VEHICULO: 'B8W-119', INSPECTOR: 'INSP-208', LUGAR_INTERVENCION: 'Vía Expresa km 4.5' },
  { ID_ACTA: 'ACTA-2024-004', NRO_PAPELETA: 'PAP-2024-00601', DNI_INFRACTOR: '73928174', NOMBRE_INFRACTOR: 'Ana Lucía Gómez Chávez', MONTO_MULTA: 820.00, FECHA_INFRACCION: '2024-08-01', CODIGO_FALTA: 'M-08', PLACA_VEHICULO: 'F4C-892', INSPECTOR: 'INSP-305', LUGAR_INTERVENCION: 'Av. Javier Prado Este 2100' },
  { ID_ACTA: 'ACTA-2024-005', NRO_PAPELETA: 'PAP-2024-00701', DNI_INFRACTOR: '48192031', NOMBRE_INFRACTOR: 'Jorge Luis Mamani Condori', MONTO_MULTA: 1100.00, FECHA_INFRACCION: '2024-04-10', CODIGO_FALTA: 'M-01', PLACA_VEHICULO: 'V9P-332', INSPECTOR: 'INSP-112', LUGAR_INTERVENCION: 'Av. Túpac Amaru cdra. 18' },
  { ID_ACTA: 'ACTA-2024-006', NRO_PAPELETA: 'PAP-2024-00702', DNI_INFRACTOR: '48192031', NOMBRE_INFRACTOR: 'Jorge Luis Mamani Condori', MONTO_MULTA: 450.00, FECHA_INFRACCION: '2024-05-22', CODIGO_FALTA: 'G-28', PLACA_VEHICULO: 'V9P-332', INSPECTOR: 'INSP-112', LUGAR_INTERVENCION: 'Av. Universitaria con Colonial' },
  { ID_ACTA: 'ACTA-2024-007', NRO_PAPELETA: 'PAP-2024-00703', DNI_INFRACTOR: '48192031', NOMBRE_INFRACTOR: 'Jorge Luis Mamani Condori', MONTO_MULTA: 620.00, FECHA_INFRACCION: '2024-07-05', CODIGO_FALTA: 'M-17', PLACA_VEHICULO: 'V9P-332', INSPECTOR: 'INSP-204', LUGAR_INTERVENCION: 'Plaza Dos de Mayo' },
  
  // Lote 2: Operativo Zona Comercial y Colegios
  { ID_ACTA: 'ACTA-2024-008', NRO_PAPELETA: 'PAP-2024-00801', DNI_INFRACTOR: '70291845', NOMBRE_INFRACTOR: 'Patricia Giuliana Flores Vargas', MONTO_MULTA: 495.00, FECHA_INFRACCION: '2024-03-12', CODIGO_FALTA: 'L-04', PLACA_VEHICULO: 'C7M-901', INSPECTOR: 'INSP-401', LUGAR_INTERVENCION: 'Av. Larco frente a Clínica' },
  { ID_ACTA: 'ACTA-2024-009', NRO_PAPELETA: 'PAP-2024-00901', DNI_INFRACTOR: '15829304', NOMBRE_INFRACTOR: 'Víctor Raúl Espinoza Benites', MONTO_MULTA: 620.00, FECHA_INFRACCION: '2024-06-18', CODIGO_FALTA: 'M-17', PLACA_VEHICULO: 'D2K-554', INSPECTOR: 'INSP-105', LUGAR_INTERVENCION: 'Av. Brasil con 28 de Julio' },
  { ID_ACTA: 'ACTA-2024-010', NRO_PAPELETA: 'PAP-2024-01001', DNI_INFRACTOR: '46719283', NOMBRE_INFRACTOR: 'Diana Carolina Ruiz Palacios', MONTO_MULTA: 380.00, FECHA_INFRACCION: '2024-07-20', CODIGO_FALTA: 'G-24', PLACA_VEHICULO: 'B3N-812', INSPECTOR: 'INSP-302', LUGAR_INTERVENCION: 'Av. Salaverry cdra. 14' },
  { ID_ACTA: 'ACTA-2024-011', NRO_PAPELETA: 'PAP-2024-01101', DNI_INFRACTOR: '09384712', NOMBRE_INFRACTOR: 'Manuel Enrique Morales Chumpitaz', MONTO_MULTA: 1850.00, FECHA_INFRACCION: '2024-01-28', CODIGO_FALTA: 'M-02', PLACA_VEHICULO: 'Z1T-990', INSPECTOR: 'INSP-101', LUGAR_INTERVENCION: 'Av. Elmer Faucett cruce Morales Duárez' },
  { ID_ACTA: 'ACTA-2024-012', NRO_PAPELETA: 'PAP-2024-01201', DNI_INFRACTOR: '72839401', NOMBRE_INFRACTOR: 'Carmen Rosa Salazar Villanueva', MONTO_MULTA: 550.00, FECHA_INFRACCION: '2024-04-14', CODIGO_FALTA: 'M-19', PLACA_VEHICULO: 'T8U-223', INSPECTOR: 'INSP-205', LUGAR_INTERVENCION: 'Av. Abancay cdra. 7' },
  { ID_ACTA: 'ACTA-2024-013', NRO_PAPELETA: 'PAP-2024-01301', DNI_INFRACTOR: '44920183', NOMBRE_INFRACTOR: 'Julio César Tello Alarcón', MONTO_MULTA: 780.00, FECHA_INFRACCION: '2024-08-05', CODIGO_FALTA: 'M-40', PLACA_VEHICULO: 'W4R-310', INSPECTOR: 'INSP-402', LUGAR_INTERVENCION: 'Av. La Marina con Universitaria' },
  { ID_ACTA: 'ACTA-2024-014', NRO_PAPELETA: 'PAP-2024-01401', DNI_INFRACTOR: '75849302', NOMBRE_INFRACTOR: 'Sofía Alejandra Valdivia Ríos', MONTO_MULTA: 320.00, FECHA_INFRACCION: '2024-02-18', CODIGO_FALTA: 'G-14', PLACA_VEHICULO: 'F7A-665', INSPECTOR: 'INSP-109', LUGAR_INTERVENCION: 'Av. Primavera cdra. 5' },
  { ID_ACTA: 'ACTA-2024-015', NRO_PAPELETA: 'PAP-2024-01501', DNI_INFRACTOR: '18392014', NOMBRE_INFRACTOR: 'Héctor Daniel Paredes Quintana', MONTO_MULTA: 410.00, FECHA_INFRACCION: '2024-05-30', CODIGO_FALTA: 'G-47', PLACA_VEHICULO: 'H2Q-741', INSPECTOR: 'INSP-211', LUGAR_INTERVENCION: 'Paseo de la República cdra. 32' },
  
  // Caso de Actualización Controlada (Reclasificación de monto existente en BD Legada)
  { ID_ACTA: 'ACTA-2024-016', NRO_PAPELETA: 'PAP-2024-00102', DNI_INFRACTOR: '45892104', NOMBRE_INFRACTOR: 'Juan Carlos Pérez Quispe', MONTO_MULTA: 210.00, FECHA_INFRACCION: '2024-02-10', CODIGO_FALTA: 'G-40', PLACA_VEHICULO: 'B8W-119', INSPECTOR: 'INSP-104', LUGAR_INTERVENCION: 'Reclasificación fiscalización campo con recargo' },
  
  // Filas intencionales para prueba de Calidad y Calificación de Errores:
  { ID_ACTA: 'ACTA-ERR-01', NRO_PAPELETA: 'PAP-ERR-NEGATIVO', DNI_INFRACTOR: '45892104', NOMBRE_INFRACTOR: 'Juan Pérez', MONTO_MULTA: -75.00, FECHA_INFRACCION: '2024-08-01', CODIGO_FALTA: 'L-01', PLACA_VEHICULO: 'ERR-001', INSPECTOR: 'INSP-999', LUGAR_INTERVENCION: 'ERROR: Monto negativo no permitido' },
  { ID_ACTA: 'ACTA-ERR-02', NRO_PAPELETA: '', DNI_INFRACTOR: '71203948', NOMBRE_INFRACTOR: 'María Rodríguez', MONTO_MULTA: 150.00, FECHA_INFRACCION: '2024-08-02', CODIGO_FALTA: 'M-01', PLACA_VEHICULO: 'ERR-002', INSPECTOR: 'INSP-999', LUGAR_INTERVENCION: 'ERROR: Falta Nro Papeleta' },
  { ID_ACTA: 'ACTA-ERR-03', NRO_PAPELETA: 'PAP-2024-99999', DNI_INFRACTOR: '10459283', NOMBRE_INFRACTOR: 'Carlos Sánchez', MONTO_MULTA: 200.00, FECHA_INFRACCION: 'FECHA_CORRUPTA', CODIGO_FALTA: 'G-10', PLACA_VEHICULO: 'ERR-003', INSPECTOR: 'INSP-999', LUGAR_INTERVENCION: 'ERROR: Fecha inválida' }
];

const wbCampo = XLSX.utils.book_new();
const wsCampo = XLSX.utils.json_to_sheet(papeletasCampoData);
XLSX.utils.book_append_sheet(wbCampo, wsCampo, 'Infracciones_Campo');
XLSX.writeFile(wbCampo, path.join(targetDir, 'papeletas_campo_inspectores.xlsx'));
console.log('Generado: papeletas_campo_inspectores.xlsx con', papeletasCampoData.length, 'filas');

// ====================================================================
// 2. FUENTE 4: Excel Bancos Externos y Coactiva (Área 2: Recaudación)
// Extractos bancarios BCP/BBVA/Interbank y liquidaciones coactivas (25 filas)
// ====================================================================
const bancosCobranzaData = [
  // Complemento clave para PAP-2024-00101 (Demostración de las 4 fuentes cruzadas)
  { OPERACION_ID: 'EXT-BN-501', TIPO_TRANSACCION: 'PAGO', NRO_PAPELETA: 'PAP-2024-00101', FECHA_VALOR: '2024-02-25', IMPORTE: 50.00, CANAL_BANCO_OBS: 'Abono agente BCP N° 4589 - San Isidro' },
  { OPERACION_ID: 'COB-MORA-01', TIPO_TRANSACCION: 'INTERES', NRO_PAPELETA: 'PAP-2024-00101', FECHA_VALOR: '2024-02-28', IMPORTE: 35.00, CANAL_BANCO_OBS: 'Interés moratorio 30 días mora coactiva' },
  { OPERACION_ID: 'COB-MORA-02', TIPO_TRANSACCION: 'INTERES', NRO_PAPELETA: 'PAP-2024-00101', FECHA_VALOR: '2024-03-30', IMPORTE: 15.00, CANAL_BANCO_OBS: 'Mora acumulada 60 días notificación' },
  
  // Abonos de las demás papeletas
  { OPERACION_ID: 'EXT-BN-502', TIPO_TRANSACCION: 'PAGO', NRO_PAPELETA: 'PAP-2024-00202', FECHA_VALOR: '2024-05-02', IMPORTE: 300.00, CANAL_BANCO_OBS: 'Transferencia BBVA cuenta corriente municipal' },
  { OPERACION_ID: 'COB-MORA-03', TIPO_TRANSACCION: 'INTERES', NRO_PAPELETA: 'PAP-2024-00202', FECHA_VALOR: '2024-05-30', IMPORTE: 62.00, CANAL_BANCO_OBS: 'Gastos de notificación coactiva resolución 12' },
  { OPERACION_ID: 'EXT-BN-503', TIPO_TRANSACCION: 'PAGO', NRO_PAPELETA: 'PAP-2024-00301', FECHA_VALOR: '2024-03-10', IMPORTE: 700.00, CANAL_BANCO_OBS: 'Pago remanente ventanilla Interbank' },
  { OPERACION_ID: 'COB-MORA-04', TIPO_TRANSACCION: 'INTERES', NRO_PAPELETA: 'PAP-2024-00301', FECHA_VALOR: '2024-03-15', IMPORTE: 120.00, CANAL_BANCO_OBS: 'Interés legal coactivo liquidación final' },
  
  // Pagos e intereses sobre nuevas infracciones
  { OPERACION_ID: 'EXT-BN-504', TIPO_TRANSACCION: 'PAGO', NRO_PAPELETA: 'PAP-2024-00401', FECHA_VALOR: '2024-06-05', IMPORTE: 280.00, CANAL_BANCO_OBS: 'Cancelación total agente Scotiabank' },
  { OPERACION_ID: 'EXT-BN-505', TIPO_TRANSACCION: 'PAGO', NRO_PAPELETA: 'PAP-2024-00501', FECHA_VALOR: '2024-03-18', IMPORTE: 450.00, CANAL_BANCO_OBS: 'Amortización cuota 1 Banco de la Nación' },
  { OPERACION_ID: 'COB-MORA-05', TIPO_TRANSACCION: 'INTERES', NRO_PAPELETA: 'PAP-2024-00501', FECHA_VALOR: '2024-04-10', IMPORTE: 95.00, CANAL_BANCO_OBS: 'Recargo administrativo fase coactiva' },
  { OPERACION_ID: 'EXT-BN-506', TIPO_TRANSACCION: 'PAGO', NRO_PAPELETA: 'PAP-2024-00601', FECHA_VALOR: '2024-08-15', IMPORTE: 820.00, CANAL_BANCO_OBS: 'Pago íntegro portal web PagosDigitales' },
  { OPERACION_ID: 'EXT-BN-507', TIPO_TRANSACCION: 'PAGO', NRO_PAPELETA: 'PAP-2024-00701', FECHA_VALOR: '2024-05-15', IMPORTE: 500.00, CANAL_BANCO_OBS: 'Abono agente BCP' },
  { OPERACION_ID: 'COB-MORA-06', TIPO_TRANSACCION: 'INTERES', NRO_PAPELETA: 'PAP-2024-00701', FECHA_VALOR: '2024-06-01', IMPORTE: 85.00, CANAL_BANCO_OBS: 'Interés moratorio por deuda impaga' },
  { OPERACION_ID: 'EXT-BN-508', TIPO_TRANSACCION: 'PAGO', NRO_PAPELETA: 'PAP-2024-00801', FECHA_VALOR: '2024-03-25', IMPORTE: 495.00, CANAL_BANCO_OBS: 'Cancelación total ventanilla BBVA' },
  { OPERACION_ID: 'COB-MORA-07', TIPO_TRANSACCION: 'INTERES', NRO_PAPELETA: 'PAP-2024-00901', FECHA_VALOR: '2024-07-15', IMPORTE: 45.00, CANAL_BANCO_OBS: 'Costas de emisión requerimiento' },
  { OPERACION_ID: 'EXT-BN-509', TIPO_TRANSACCION: 'PAGO', NRO_PAPELETA: 'PAP-2024-01001', FECHA_VALOR: '2024-08-01', IMPORTE: 380.00, CANAL_BANCO_OBS: 'Pago en línea con Yape Portal Municipal' },
  { OPERACION_ID: 'COB-MORA-08', TIPO_TRANSACCION: 'INTERES', NRO_PAPELETA: 'PAP-2024-01101', FECHA_VALOR: '2024-03-01', IMPORTE: 185.00, CANAL_BANCO_OBS: 'Interés mora retención vehicular' },
  { OPERACION_ID: 'EXT-BN-510', TIPO_TRANSACCION: 'PAGO', NRO_PAPELETA: 'PAP-2024-01101', FECHA_VALOR: '2024-03-15', IMPORTE: 1000.00, CANAL_BANCO_OBS: 'Abono extraordinario Banco de la Nación' },
  { OPERACION_ID: 'EXT-BN-511', TIPO_TRANSACCION: 'PAGO', NRO_PAPELETA: 'PAP-2024-01201', FECHA_VALOR: '2024-05-02', IMPORTE: 550.00, CANAL_BANCO_OBS: 'Cancelación total agente Interbank' },
  { OPERACION_ID: 'COB-MORA-09', TIPO_TRANSACCION: 'INTERES', NRO_PAPELETA: 'PAP-2024-01301', FECHA_VALOR: '2024-08-20', IMPORTE: 60.00, CANAL_BANCO_OBS: 'Gastos de cobranza judicial' },

  // Casos intencionales de RECHAZO / ERROR:
  { OPERACION_ID: 'EXT-ERR-01', TIPO_TRANSACCION: 'PAGO', NRO_PAPELETA: 'PAP-INEXISTENTE-999', FECHA_VALOR: '2024-08-10', IMPORTE: 100.00, CANAL_BANCO_OBS: 'ERROR: Papeleta inexistente en sistema' },
  { OPERACION_ID: 'EXT-ERR-02', TIPO_TRANSACCION: 'PAGO', NRO_PAPELETA: 'PAP-2024-00101', FECHA_VALOR: '2024-08-11', IMPORTE: -20.00, CANAL_BANCO_OBS: 'ERROR: Importe negativo no permitido' },
  { OPERACION_ID: '', TIPO_TRANSACCION: 'INTERES', NRO_PAPELETA: 'PAP-2024-00201', FECHA_VALOR: '2024-08-12', IMPORTE: 30.00, CANAL_BANCO_OBS: 'ERROR: Clave OPERACION_ID vacía' }
];

const wbBancos = XLSX.utils.book_new();
const wsBancos = XLSX.utils.json_to_sheet(bancosCobranzaData);
XLSX.utils.book_append_sheet(wbBancos, wsBancos, 'Transacciones_Externas');
XLSX.writeFile(wbBancos, path.join(targetDir, 'recaudacion_bancos_externos.xlsx'));
console.log('Generado: recaudacion_bancos_externos.xlsx con', bancosCobranzaData.length, 'filas');

// Compatibilidad
const recaudacionData = [
  { ID_PAGO: 'REC-8801', NRO_PAPELETA: 'PAP-2024-00101', FECHA_PAGO: '2024-02-01', IMPORTE_PAGADO: 200.00, REFERENCIA: 'Pago ventanilla central' },
  { ID_PAGO: 'REC-8802', NRO_PAPELETA: 'PAP-2024-00201', FECHA_PAGO: '2024-03-20', IMPORTE_PAGADO: 450.00, REFERENCIA: 'Cancelación total banco BCP' }
];
const wbRec = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbRec, XLSX.utils.json_to_sheet(recaudacionData), 'Pagos_Recaudacion');
XLSX.writeFile(wbRec, path.join(targetDir, 'recaudacion_ejemplo.xlsx'));
