# SIIAC — Sistema Integrado de Información y Atención al Ciudadano

> **Curso:** SI806U — Desarrollo Adaptativo e Integración de Software  
> **Tema:** Integración de Datos Multi-Fuente mediante Capa Staging y Proceso ETL  
> **Tecnologías:** React 18, TypeScript, Vite, Tailwind CSS, SheetJS (xlsx), Supabase / PostgreSQL (Esquemas aislados + Staging + RLS).

---

## 1. Resumen de la Arquitectura de Integración

SIIAC demuestra una arquitectura empresarial de consolidación de datos integrando **4 fuentes heterogéneas** provenientes de dos áreas operacionales independientes:
1. **Área 1 (Tránsito y Transporte):**
   - **Fuente 1:** Base de datos relacional del sistema de tránsito (simulada en el esquema `legacy_papeletas`).
   - **Fuente 2:** Archivo Excel de actas de campo levantadas por inspectores en vía pública (`papeletas_campo_inspectores.xlsx`).
2. **Área 2 (Recaudación y Cobranza):**
   - **Fuente 3:** Base de datos relacional del sistema de caja ventanilla (simulada en el esquema `legacy_recaudacion`).
   - **Fuente 4:** Archivo Excel con extractos de pagos bancarios (BCP/BBVA) e intereses coactivos (`recaudacion_bancos_externos.xlsx`).

Los datos son orquestados por un **pipeline ETL transaccional** que aterriza los registros crudos en una **Capa Staging** (`staging`), calcula hashes de contenido para detección de cambios (Change Data Capture), aísla inconsistencias en `staging.etl_errors` y consolida idempotentemente en las tablas del Core (`public`), evitando la multiplicación cartesiana mediante agregación previa en `consolidated_tickets_view`.

---

## 2. Estructura del Proyecto

```
c:\Automatizacion Proy SW\
├── public\
│   └── samples\
│       ├── papeletas_campo_inspectores.xlsx   # Fuente 2: Infracciones de campo no digitadas
│       └── recaudacion_bancos_externos.xlsx   # Fuente 4: Abonos bancarios e intereses coactiva
├── scripts\
│   ├── generate_samples.cjs                   # Generador automatizado de archivos Excel
│   └── test_etl_scenarios.cjs                 # Suite de pruebas automatizadas de los 6 escenarios
├── supabase\
│   ├── migrations\
│   │   ├── 001_initial_schema.sql             # Esquema base inicial, RLS y perfiles
│   │   └── 002_multi_db_etl_staging.sql       # Esquemas legados, staging, trazabilidad y función ETL
│   ├── seed.sql                               # Semilla inicial core
│   └── seed_legados.sql                       # Semilla de las bases de datos legadas independientes
├── src\
│   ├── components\                            # Navbar, Sidebar, ProtectedRoute, StatusBadge
│   ├── context\                               # AuthContext (soporta Supabase y Modo Demo)
│   ├── lib\                                   # supabase.ts y excelParser.ts (SHA-256 / normalizador)
│   ├── pages\                                 # Login, Dashboard, PanelETL, Consulta, Historial
│   ├── types\                                 # Tipado TypeScript estricto
│   ├── App.tsx                                # Enrutamiento React Router v6
│   └── main.tsx                               # Entry point
├── ARQUITECTURA.md                            # Diagrama Mermaid y justificación técnica
├── LIMITACIONES.md                            # Declaración formal de componentes reales vs simulados
├── README_DATOS.md                            # Catálogo de las 4 fuentes y casos de error
└── GUIA_DEMO.md                               # Guion de presentación de 3 a 5 minutos
```

---

## 3. Instrucciones de Configuración en Supabase

### Paso 3.1: Ejecutar Migraciones SQL
En el **SQL Editor** de tu proyecto Supabase:
1. Ejecuta el script `supabase/migrations/001_initial_schema.sql`.
2. Ejecuta el script aditivo `supabase/migrations/002_multi_db_etl_staging.sql`.
   - *Nota:* Esta migración es 100% compatible y no borra datos existentes; crea los esquemas `legacy_papeletas`, `legacy_recaudacion`, `staging` y la función `execute_full_etl_pipeline`.
3. Ejecuta el script `supabase/seed_legados.sql` para poblar las bases de datos de tránsito y caja.

### Paso 3.2: Configurar Variables en `.env.local`
Copia `.env.example` como `.env.local`:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-publica
```

---

## 4. Ejecución del Proyecto y Pruebas Automatizadas

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Generar los archivos Excel de demostración:**
   ```bash
   npm run generate-samples
   ```

3. **Ejecutar la suite de pruebas automatizadas (6 escenarios obligatorios):**
   ```bash
   node scripts/test_etl_scenarios.cjs
   ```
   *Evidencia que se comprueba en consola:*
   - Escenario 1: Integración inicial desde las 4 fuentes.
   - Escenario 2: Reejecución sin duplicar información (Idempotencia).
   - Escenario 3: Actualización controlada de un registro (Detección de modificaciones por hash).
   - Escenario 4: Rechazo y aislamiento de registros inválidos en Staging.
   - Escenario 5: Consulta consolidada ciudadana (eliminación de producto cartesiano).
   - Escenario 6: Registro de auditoría y procedencia por fila.

4. **Iniciar la aplicación en modo desarrollo:**
   ```bash
   npm run dev
   ```
   Abre tu navegador en `http://localhost:5173`.

5. **Compilar para producción:**
   ```bash
   npm run build
   ```
