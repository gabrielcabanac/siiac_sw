# Arquitectura de Integración de Datos Multi-Fuente — SIIAC (SI806U)

> 📥 **Descarga de Diagramas:**  
> - [Descargar Imagen PNG del Diagrama](file:///c:/Automatizacion%20Proy%20SW/public/diagrama_arquitectura.png)  
> - [Descargar Vectorial SVG del Diagrama](file:///c:/Automatizacion%20Proy%20SW/public/diagrama_arquitectura.svg)  
> - [Visor y Exportador en 4K Ultra-HD](file:///c:/Automatizacion%20Proy%20SW/public/export_diagram.html)  

El **Sistema Integrado de Información y Atención al Ciudadano (SIIAC)** es una solución arquitectónica diseñada para resolver la fragmentación de información en instituciones públicas descentralizadas mediante un proceso **ETL (Extract, Transform, Load)** y una **capa Staging**.

---

## 1. Diagrama de la Arquitectura de Integración

```mermaid
flowchart TD
    subgraph FuentesArea1["Área 1: Dirección de Tránsito y Transporte"]
        BD_LEG_PAP[("BD Legada Tránsito\n[schema: legacy_papeletas]\n- sgp_ciudadanos\n- sgp_papeletas")]
        EXCEL_PAP["Excel de Inspectores de Campo\n(papeletas_campo_inspectores.xlsx)\nInfracciones en vía pública no digitadas"]
    end

    subgraph FuentesArea2["Área 2: Oficina General de Recaudación y Cobranza"]
        BD_LEG_REC[("BD Legada Caja / Ventanilla\n[schema: legacy_recaudacion]\n- caja_pagos")]
        EXCEL_REC["Excel de Bancos y Coactiva\n(recaudacion_bancos_externos.xlsx)\nAbonos BCP/BBVA y liquidación de mora"]
    end

    subgraph FuentesArea3["Área 3: Subgerencia de Fiscalización y Control Urbano"]
        BD_LEG_FISC[("BD Legada Fiscalización\n[schema: legacy_fiscalizacion]\n- sgf_sanciones (RSA)\nClausuras y multas comerciales")]
    end

    subgraph CapaStaging["Capa Staging / Landing Zone (schema: staging)"]
        STG_PAP["staging.infracciones_raw\n(Datos en bruto + Hash MD5 + Source System)"]
        STG_PAG["staging.transacciones_raw\n(Pagos e Intereses + Hash MD5)"]
        STG_LOG["staging.etl_runs\n(Control de lotes y métricas de ejecución)"]
        STG_ERR["staging.etl_errors\n(Aislamiento de inconsistencias y rechazos)"]
    end

    subgraph PipelineETL["Motor ETL Transaccional e Idempotente"]
        EXTRACT["Fase 1: Extracción\n(Snapshot de esquemas legados + Ingesta Excel)"]
        CLEAN_VAL["Fase 2: Limpieza y Calidad de Datos\n- Filtro de importes negativos\n- Validación de formatos de fecha\n- Detección de papeletas inexistentes"]
        TRANSFORM["Fase 3: Transformación y Hash\n- Normalización de estados\n- Cálculo de hash criptográfico de contenido\n- Detección de modificaciones (CDC)"]
        LOAD["Fase 4: Carga Consolidada Idempotente\n- Inserción de nuevos registros\n- Actualización selectiva por cambio de hash\n- Omisión de registros idénticos (0 duplicados)"]
    end

    subgraph RepositorioCentral["Repositorio Central Consolidado (schema: public)"]
        CORE_CITIZENS[("public.citizens\n(Padrón unificado)")]
        CORE_TICKETS[("public.tickets\n(Papeletas consolidadas + Trazabilidad)")]
        CORE_PAYMENTS[("public.payments\n(Pagos unificados: Caja + Bancos)")]
        CORE_INTERESTS[("public.interest_charges\n(Intereses coactivos)")]
        CORE_VIEW["public.consolidated_tickets_view\n(Agregación previa: Saldo = Base + Intereses - Pagos)"]
    end

    subgraph Presentacion["Capa de Presentación (React 18 + TypeScript)"]
        UI_DASHBOARD["Dashboard de Integración\n(Salud de las 4 fuentes + Métricas)"]
        UI_ETL["Orquestador ETL\n(Ejecución por fases, Staging y Auditoría)"]
        UI_CITIZEN["Atención al Ciudadano\n(Consulta con trazabilidad de origen y saldo real)"]
    end

    BD_LEG_PAP --> EXTRACT
    EXCEL_PAP --> EXTRACT
    BD_LEG_REC --> EXTRACT
    EXCEL_REC --> EXTRACT
    BD_LEG_FISC --> EXTRACT

    EXTRACT --> STG_PAP & STG_PAG & STG_LOG
    STG_PAP & STG_PAG --> CLEAN_VAL
    CLEAN_VAL -->|Inconsistencias| STG_ERR
    CLEAN_VAL -->|Válidos| TRANSFORM --> LOAD

    LOAD --> CORE_CITIZENS & CORE_TICKETS & CORE_PAYMENTS & CORE_INTERESTS
    CORE_CITIZENS & CORE_TICKETS & CORE_PAYMENTS & CORE_INTERESTS --> CORE_VIEW

    CORE_VIEW --> UI_CITIZEN
    STG_LOG --> UI_ETL & UI_DASHBOARD
```

---

## 2. Decisiones Técnicas y Justificación

### A. Simulación Lógica de BDs Independientes (Esquemas PostgreSQL)
- **Decisión:** Los esquemas `legacy_papeletas` y `legacy_recaudacion` modelan bases de datos relacionales independientes.
- **Justificación:** Proporciona un aislamiento lógico riguroso en PostgreSQL sin requerir la sobrecarga de múltiples servidores Docker ni comprometer la portabilidad académica en Supabase.
- **Transparencia:** Representa una simulación lógica. En un entorno productivo real, estas fuentes residirían en servidores externos heterogéneos (MySQL, SQL Server, Oracle) consumidos vía Foreign Data Wrappers (`postgres_fdw`) o conectores Debezium/Kafka.

### B. Capa Staging y Quality Gate
- Los datos crudos no tocan el repositorio central directamente. Aterrizan en `staging.infracciones_raw` y `staging.transacciones_raw`.
- Las anomalías (montos negativos, papeletas vacías, fechas corruptas) se aíslan en `staging.etl_errors` permitiendo que los registros válidos continúen sin abortar la transacción.

### C. Estrategia de Idempotencia y Detección de Modificaciones (Change Data Capture)
- Cada registro procesado calcula un **hash MD5** de su contenido (`record_hash`).
- Al consolidar contra las tablas del Core:
  1. Si la clave de negocio no existe $\rightarrow$ **INSERT**.
  2. Si la clave de negocio existe pero el `record_hash` es diferente $\rightarrow$ **UPDATE** (actualización controlada de montos o reclasificaciones).
  3. Si la clave de negocio existe y el `record_hash` es idéntico $\rightarrow$ **NO-OP (Unchanged)** (prevención total de duplicados).

### D. Eliminación del Producto Cartesiano en la Liquidación de Saldo
Para una papeleta con $M$ pagos y $N$ cargos por intereses, la vista `consolidated_tickets_view` agrupa cada tabla separadamente en CTEs **antes** del JOIN:

$$\text{Saldo} = \text{Monto Base} + \sum(\text{Intereses}) - \sum(\text{Pagos})$$
