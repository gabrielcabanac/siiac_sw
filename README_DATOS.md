# Catálogo de Datos y Fuentes de Integración — SIIAC

Este documento detalla la estructura y contenido de las cuatro fuentes de datos que integran la Prueba de Concepto.

---

## 1. Fuente 1: BD Sistema de Tránsito (`legacy_papeletas`)
*Simulación lógica de base de datos relacional del sistema legado en PHP.*

- **Tabla:** `legacy_papeletas.sgp_papeletas`
- **Registros Semilla:**
  - `PAP-2024-00101` | DNI: 45892104 (Pérez) | S/ 350.00 | M-01 | PENDIENTE
  - `PAP-2024-00102` | DNI: 45892104 (Pérez) | S/ 180.00 | G-40 | PENDIENTE
  - `PAP-2024-00201` | DNI: 71203948 (Rodríguez) | S/ 450.00 | M-02 | PENDIENTE
  - `PAP-2024-00202` | DNI: 71203948 (Rodríguez) | S/ 620.00 | M-17 | PENDIENTE
  - `PAP-2024-00301` | DNI: 10459283 (Sánchez) | S/ 1200.00 | M-04 | PENDIENTE

---

## 2. Fuente 2: Excel Inspectores de Campo (`papeletas_campo_inspectores.xlsx`)
*Archivo Excel con infracciones manuales levantadas en vía pública que no habían sido digitadas en la BD de Tránsito.*

- **Columnas:** `ID_ACTA`, `NRO_PAPELETA`, `DNI_INFRACTOR`, `NOMBRE_INFRACTOR`, `MONTO_MULTA`, `FECHA_INFRACCION`, `CODIGO_FALTA`, `LUGAR_INTERVENCION`
- **Casos Válidos (Nuevas Infracciones):**
  - `PAP-2024-00401` (Huamán Ramos, DNI: 08392019, S/ 280.00)
  - `PAP-2024-00402` (Huamán Ramos, DNI: 08392019, S/ 510.00)
  - `PAP-2024-00501` (Castro Morales, DNI: 42198034, S/ 950.00)
  - `PAP-2024-00601` (Gómez Chávez, DNI: 73928174, S/ 820.00)
- **Caso de Actualización Controlada:**
  - `PAP-2024-00102` con Monto S/ 210.00 (reclasifica el monto base original de S/ 180.00 mediante detección de hash).
- **Casos de Rechazo Diseñados:**
  - `PAP-ERR-NEGATIVO`: Monto -75.00 (`INVALID_AMOUNT`).
  - Fila 8: Número de papeleta vacío (`MISSING_TICKET`).
  - `PAP-2024-99999`: Fecha corrupta `FECHA_CORRUPTA` (`INVALID_DATE`).

---

## 3. Fuente 3: BD Sistema de Recaudación / Caja (`legacy_recaudacion`)
*Simulación lógica de base de datos relacional del sistema legado en C# de ventanillas.*

- **Tabla:** `legacy_recaudacion.caja_pagos`
- **Registros Semilla:**
  - `REC-CAJA-101`: S/ 200.00 abonados a `PAP-2024-00101` (Cajero 01)
  - `REC-CAJA-102`: S/ 450.00 abonados a `PAP-2024-00201` (Cancela totalmente la papeleta)
  - `REC-CAJA-103`: S/ 500.00 abonados a `PAP-2024-00301` (Cajero 01)

---

## 4. Fuente 4: Excel Bancos Externos y Coactiva (`recaudacion_bancos_externos.xlsx`)
*Archivo Excel con extractos de pagos bancarios (BCP/BBVA) e intereses liquidados por el área coactiva.*

- **Columnas:** `OPERACION_ID`, `TIPO_TRANSACCION`, `NRO_PAPELETA`, `FECHA_VALOR`, `IMPORTE`, `CANAL_BANCO_OBS`
- **Casos Válidos:**
  - `EXT-BN-501`: Pago S/ 50.00 a `PAP-2024-00101` (Agente BCP)
  - `COB-MORA-01`: Interés S/ 35.00 a `PAP-2024-00101` (Mora coactiva mes 1)
  - `COB-MORA-02`: Interés S/ 15.00 a `PAP-2024-00101` (Mora coactiva mes 2)
  - `EXT-BN-502`: Pago S/ 300.00 a `PAP-2024-00202` (Transferencia)
  - `COB-MORA-03`: Interés S/ 62.00 a `PAP-2024-00202` (Gastos de notificación)
  - `EXT-BN-503`: Pago S/ 700.00 a `PAP-2024-00301` (Portal BBVA)
  - `COB-MORA-04`: Interés S/ 120.00 a `PAP-2024-00301` (Liquidación coactiva)
- **Casos de Rechazo Diseñados:**
  - `EXT-ERR-01`: Pago dirigido a papeleta inexistente `PAP-INEXISTENTE-999` (`TICKET_NOT_FOUND`).
  - `EXT-ERR-02`: Importe negativo S/ -20.00 (`INVALID_AMOUNT`).
  - Fila 11: Clave `OPERACION_ID` vacía (`MISSING_FIELDS`).

---

## 5. El Caso de Demostración Integral: Papeleta `PAP-2024-00101`

Esta papeleta demuestra la convergencia de las cuatro fuentes en un único estado de cuenta:
1. **Monto Base:** S/ 350.00 *(extraído de la BD de Tránsito)*
2. **Pago 1:** S/ 200.00 *(extraído de la BD de Caja Ventanilla)*
3. **Pago 2:** S/ 50.00 *(extraído del Excel de Bancos Externos)*
4. **Interés 1:** S/ 35.00 *(extraído del Excel de Coactiva)*
5. **Interés 2:** S/ 15.00 *(extraído del Excel de Coactiva)*

$$\text{Saldo} = 350.00 + (35.00 + 15.00) - (200.00 + 50.00) = \mathbf{S/\ 150.00}$$
*(Estado Consolidado: `AMORTIZADA`)*
