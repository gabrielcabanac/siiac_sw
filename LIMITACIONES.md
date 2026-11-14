# Limitaciones del Entorno y Transparencia Académica — SIIAC

Este documento declara formalmente los componentes que operan de forma **real** y aquellos que corresponden a una **simulación didáctica**, con el fin de sustentar con máxima rigurosidad y honestidad técnica ante el docente del curso **SI806U**.

---

## 1. Matriz de Componentes: Real vs. Simulado

| Componente | Clasificación | Descripción Técnica |
| :--- | :--- | :--- |
| **Archivos Excel (`.xlsx`)** | **REAL** | Archivos binarios generados con SheetJS, descargables, leídos dinámicamente y procesados en memoria. |
| **Cálculo de Hash SHA-256 / MD5** | **REAL** | Hashing criptográfico real aplicado en cliente y servidor para control de integridad y detección de modificaciones. |
| **Capa Staging y Tablas de Auditoría** | **REAL** | Tablas físicas reales en PostgreSQL (`staging.etl_runs`, `staging.etl_errors`, etc.) con persistencia de logs de rechazo. |
| **Proceso Transaccional ETL** | **REAL** | Función Stored Procedure PL/pgSQL real con transacciones ACID, validaciones, detección de cambios y cláusulas de idempotencia. |
| **Prevención de Producto Cartesiano** | **REAL** | Vista SQL real con Common Table Expressions (CTEs) agrupadas previo al JOIN. |
| **Bases de Datos de Tránsito y Recaudación** | **SIMULADA (Lógica)** | **No existen servidores externos físicos independientes (PHP/MySQL o C#/SQL Server)**. Se simulan mediante esquemas separados (`legacy_papeletas` y `legacy_recaudacion`) en la misma instancia PostgreSQL de Supabase. |
| **Fórmula de Saldo Municipal** | **SIMULADA (Didáctica)** | `Saldo = Base + Intereses - Pagos` es un modelo simplificado para fines académicos. En municipalidades reales rige el Código Tributario (TIM, factores de indexación y prescripciones). |
| **Datos Personales y Papeletas** | **SIMULADA (Ficticia)** | Todos los DNI, nombres de ciudadanos, fechas y descripciones son 100% inventados para dar cumplimiento a la Ley N° 29733 (Protección de Datos Personales de Perú). |

---

## 2. Requerimientos para una Implementación Física Productiva

Para pasar de esta simulación lógica a una arquitectura empresarial distribuida:
1. **Conectores Físicos Heterogéneos:** Implementar *Foreign Data Wrappers* (`postgres_fdw`, `mysql_fdw`, `tds_fdw` para SQL Server) o pipelines de streaming con Apache Kafka y Debezium (Change Data Capture en tiempo real).
2. **Servicio Orquestador de Flujo:** Reemplazar la invocación manual por herramientas de orquestación de datos como Apache Airflow, Prefect o Dagster.
3. **Almacenamiento Object Storage:** Depósito de archivos Excel en Amazon S3 o Supabase Storage con escaneo antivirus y políticas de retención.
