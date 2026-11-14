# Guía Maestra de Exposición para el Profesor — SIIAC (SI806U)

> 🌐 **Enlace de Producción en Vivo:** [https://automatizacion-proy-sw.vercel.app](https://automatizacion-proy-sw.vercel.app)  
> 👤 **Autor y Administrador:** Gabriel Cabana • Administrador General  
> 🏢 **Curso:** Desarrollo Adaptativo e Integración de Software (SI806U)  

---

## Estructura de la Demostración (8 a 10 Minutos)

### Acto 1: Planteamiento del Problema y Dashboard (1-2 min)
1. **Abrir el enlace:** [https://automatizacion-proy-sw.vercel.app](https://automatizacion-proy-sw.vercel.app)
2. **Explicación del contexto:**
   > *"Profesor, en una institución municipal real la información está fragmentada en silos: la Dirección de Tránsito opera un sistema legado en PHP con su propia BD, la Oficina de Recaudación gestiona la caja con un sistema en C# con su propia BD, los inspectores en calle llenan papeletas en Excel y los bancos envían extractos de recaudación externa. El SIIAC unifica estos 4 orígenes mediante una Capa Staging y un motor ETL idempotente."*
3. **Mostrar en el Dashboard:**
   - La matriz de 4 fuentes heterogéneas.
   - Indicadores consolidados (Papeletas integradas, Pagos unificados, Saldo exigible).
   - Identidad visible en la barra superior: **Gabriel Cabana • ADMIN**.

---

### Acto 2: Digitación Operacional en Vivo (2-3 min)
*(Demostración interactiva de captura de datos manuales y cobros en ventanilla).*

1. Navegar a **Registro Operacional (Digitación)** (`/operaciones`).
2. **Papeleta en vivo:**
   - En la pestaña *1. Digitar Nueva Papeleta*, ingresar:
     - Placa: `ABC-123`
     - DNI: `45892104`
     - Conductor: `Gabriel Cabana Morales`
     - Infracción: `G-47 Estacionar en zona rígida (S/ 412.00)`
   - Clic en **Guardar en Base de Datos de Tránsito**. Mostrar cómo se inserta de inmediato en la tabla de Tránsito.
3. **Cobro en caja en vivo:**
   - Pasar a la pestaña *2. Registrar Pago en Caja*.
   - Seleccionar la papeleta recién creada o una pendiente.
   - Digitar un cobro de `S/ 200.00` con medio *Tarjeta Débito (POS Visa)* y presionar **Registrar Cobro en BD Recaudación**.
4. **Verificación en Consulta Ciudadana:**
   - Ir a **Atención al Ciudadano** (`/consulta`), buscar el DNI `45892104`.
   - Mostrar cómo la papeleta se visualiza inmediatamente en estado `AMORTIZADA`, con el pago registrado por el cajero *Gabriel Cabana* y el saldo recalculado en tiempo real.

---

### Acto 3: Orquestador ETL Multi-Fuente e Idempotencia (2 min)
1. Navegar a **Orquestador ETL (4 Fuentes)** (`/etl`).
2. Explicar el flujo por fases:
   - **Extracción** $\rightarrow$ **Staging** $\rightarrow$ **Limpieza y Reglas** $\rightarrow$ **Carga Consolidada**.
3. Clic en **Ejecutar Pipeline ETL Integral**:
   - Mostrar las métricas de la primera corrida: registros extraídos, insertados y rechazados.
4. **Demostración de Idempotencia estricta:**
   - Clic nuevamente en **Ejecutar Pipeline ETL Integral**.
   - Mostrar que las inserciones son `0` y los registros sin cambios se mantienen idénticos, demostrando que no existen duplicados gracias al hash SHA-256 de contenido.

---

### Acto 4: Respuesta al Manejo de Errores e Inconsistencias (2 min)
*(Pregunta clave del docente: ¿Qué pasa cuando un archivo tiene errores y dónde se ven?)*

1. Ir a **Carga Individual Excel** (`/importar`).
2. Explicar el principio arquitectónico:
   > *"No ejecutamos un ROLLBACK destructivo que cancele todo el lote, porque si un archivo bancario de 20,000 registros tiene 4 líneas con fecha corrupta, detener el archivo perjudicaría los pagos de 19,996 ciudadanos. Aplicamos una **Estrategia de Cuarentena (Reject Bucket)**."*
3. Cargar el archivo de muestra `recaudacion_bancos_externos.xlsx`:
   - Mostrar la **Previsualización**: las filas inconsistentes se resaltan en rojo/ámbar con el motivo exacto.
   - Al confirmar la importación, mostrar la tarjeta de resultados: `10 válidas` y `4 rechazadas`.
   - Mostrar la tabla de auditoría con la columna afectada y el código tipificado: `INVALID_AMOUNT`, `TICKET_NOT_FOUND`, `DUPLICATE_PAYMENT`.
4. Ir a **Auditoría y Lotes** (`/historial`) y mostrar el estado **`COMPLETADO_CON_ERRORES`** con su hash inmutable y el botón para descargar el reporte de discrepancias.

---

### Acto 5: Escalabilidad y Carga Masiva (>100K registros) en GCP (2 min)
1. Ir a **Registro Operacional** $\rightarrow$ Pestaña **4. Benchmark Carga Masiva (>100K)**.
2. Seleccionar **100,000 registros** (o 500,000) y presionar **Ejecutar Prueba**.
3. Mostrar las métricas en vivo:
   - **Throughput:** `~16,000 filas/segundo`.
   - **Memoria RAM:** Controlada a menos de `60 MB` gracias al procesamiento por lotes (chunks de 5,000 filas).
   - **Deduplicación:** Registros repetidos filtrados por índice hash.
4. **Sustentación de Arquitectura Cloud (GCP) para el profesor:**
   - **Cloud Storage:** Recepción del archivo pesado vía *Signed URL* sin pasar por la RAM del servidor web.
   - **Cloud Run Jobs:** Tarea batch desacoplada que procesa por streams en chunks de 5,000 registros sin riesgo de timeout (soporta ejecuciones de hasta 24 horas).
   - **Cloud SQL (PostgreSQL):** Inserción masiva de alta velocidad mediante `COPY FROM STDIN` en la capa Staging, reduciendo tiempos de minutos a segundos.
