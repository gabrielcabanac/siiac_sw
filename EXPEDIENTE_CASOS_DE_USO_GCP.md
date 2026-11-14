# Expediente Técnico de Casos de Uso y Pruebas — SIIAC

> 🌐 **Enlace Oficial de Producción (GCP):** [https://siiac-gabrielcabana-7144a.web.app](https://siiac-gabrielcabana-7144a.web.app)  
> 📄 **Generador de PDF en Vivo (A4 Imprimible):** [https://siiac-gabrielcabana-7144a.web.app/casos_de_uso_pdf.html](https://siiac-gabrielcabana-7144a.web.app/casos_de_uso_pdf.html)  
> 👤 **Autor y Administrador:** Gabriel Cabana • Administrador General y Arquitecto de Solución  
> 🏢 **Curso:** SI806U Desarrollo Adaptativo e Integración de Software  
> ☁️ **Infraestructura Cloud:** Google Cloud Platform (ID: `siiac-gabrielcabana-7144a`, N° Proyecto: `643130825015`)  

---

## 1. Matriz de Casos de Uso Evaluados

| ID | Caso de Uso | Módulo | Datos de Entrada | Criterio de Aceptación del Docente |
| :--- | :--- | :--- | :--- | :--- |
| **CU-01** | Consulta Multiaérea por DNI | `/consulta` | DNI `45892104` | Integración sin producto cartesiano de Tránsito y Fiscalización. Saldo exacto S/ 150.00. |
| **CU-02** | Ingesta Excel Campo y Búsqueda Directa | `/importar` ➔ `/consulta` | `papeletas_campo_inspectores.xlsx` | Carga de 10 válidas y botón de acceso directo a `/consulta?q=PAP-2024-00401` en vivo. |
| **CU-03** | Ingesta Bancaria y Amortización | `/importar` ➔ `/consulta` | `recaudacion_bancos_externos.xlsx` | Descuento automático de saldos e imputación de intereses coactivos. |
| **CU-04** | Cuarentena de Errores (Reject Bucket) | `/importar` (Calidad) | Filas con monto -75, fecha inválida | Aislamiento en `staging.import_errors` sin abortar las filas válidas del lote. |
| **CU-05** | Digitación en Vivo y Caja Ventanilla | `/operaciones` | Placa `ABC-123` / Acta Fiscaliz. | Inserción en tiempo real en Tránsito, Fiscalización Urbana y cobro en Ventanilla. |
| **CU-06** | Pipeline ETL e Idempotencia SHA-256 | `/etl` | Doble ejecución consecutiva | Corrida 1 inserta registros; Corrida 2 genera exactamente 0 duplicados. |
| **CU-07** | Auditoría y Trazabilidad de Lotes | `/historial` | Lotes históricos | Hashes SHA-256 inmutables y descarga de reportes CSV de discrepancias. |
| **CU-08** | Benchmark Masivo (>100K) en GCP | `/operaciones` (Pestaña 4) | 100,000 filas sintéticas | Throughput >15,000 filas/seg con RAM controlada <60 MB mediante streams. |

---

## 2. Guía Paso a Paso para la Demostración

### CU-01: Consulta Unificada de Deuda Ciudadana por DNI
- **URL:** [https://siiac-gabrielcabana-7144a.web.app/consulta](https://siiac-gabrielcabana-7144a.web.app/consulta)
- **Acción:** Buscar DNI `45892104`.
- **Verificación:**
  - Monto base Tránsito: S/ 350.00 (`PAP-2024-00101`).
  - Pago Caja: -S/ 200.00 (`REC-CAJA-101`).
  - Pago Banco: -S/ 50.00 (`EXT-BN-501`).
  - Intereses Coactivos: +S/ 50.00 (`COB-MORA-01` y `02`).
  - **Saldo Final:** $\mathbf{S/\ 150.00}$ (Estado: `AMORTIZADA`).

### CU-02: Ingesta de Excel de Campo con Búsqueda Directa
- **URL:** [https://siiac-gabrielcabana-7144a.web.app/importar](https://siiac-gabrielcabana-7144a.web.app/importar)
- **Archivo:** `papeletas_campo_inspectores.xlsx`.
- **Acción:** Subir archivo, presionar *Confirmar e Importar Lote*.
- **Verificación:** Clic en el botón verde directo `🔍 Consultar Registro de este Lote ([PAP-2024-00401])`. Se abre la consulta con la papeleta de Rosa Victoria Huamán Ramos (DNI `08392019`, S/ 280.00).

### CU-03: Cuarentena de Errores (Reject Bucket)
- **Acción:** Durante la previsualización del archivo de inspectores o bancario, señalar las filas en rojo.
- **Verificación:** Errores detectados: `INVALID_AMOUNT` (monto -75.00), `MISSING_TICKET` (código vacío) e `INVALID_DATE`. El sistema procesa las válidas y aísla las corruptas en auditoría.

### CU-04: Digitación en Mesa de Partes y Cobro en Ventanilla
- **URL:** [https://siiac-gabrielcabana-7144a.web.app/operaciones](https://siiac-gabrielcabana-7144a.web.app/operaciones)
- **Acción:**
  - Pestaña 1 (Tránsito): Digitar Placa `ABC-123`, DNI `45892104`, S/ 412.00.
  - Pestaña 2 (Fiscalización Urbana): Registrar Acta `FISC-2024-0099` (Clausura y Multa S/ 2,575.00).
  - Pestaña 3 (Caja Unificada): Cobrar S/ 200.00.
- **Verificación:** En `/consulta`, ambas sanciones se visualizan bajo el mismo ciudadano con saldo actualizado.

### CU-05: Pipeline ETL e Idempotencia SHA-256
- **URL:** [https://siiac-gabrielcabana-7144a.web.app/etl](https://siiac-gabrielcabana-7144a.web.app/etl)
- **Acción:** Ejecutar el pipeline ETL dos veces seguidas.
- **Verificación:** La segunda corrida muestra `0 nuevas inserciones`, garantizando cero duplicados mediante hashing criptográfico.

