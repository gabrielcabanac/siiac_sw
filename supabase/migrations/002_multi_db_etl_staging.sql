-- ====================================================================
-- SIIAC: Migración 002 - Integración Multi-BD + Excel mediante Staging y ETL
-- ====================================================================

-- 1. Ampliar tablas del Core (public) con columnas de trazabilidad y hash
ALTER TABLE public.tickets 
    ADD COLUMN IF NOT EXISTS source_system TEXT DEFAULT 'BD_PAPELETAS_LEGADO',
    ADD COLUMN IF NOT EXISTS source_entity TEXT DEFAULT 'sgp_papeletas',
    ADD COLUMN IF NOT EXISTS source_record_id TEXT,
    ADD COLUMN IF NOT EXISTS record_hash TEXT,
    ADD COLUMN IF NOT EXISTS last_etl_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.payments 
    ADD COLUMN IF NOT EXISTS source_system TEXT DEFAULT 'BD_RECAUDACION_LEGADO',
    ADD COLUMN IF NOT EXISTS source_entity TEXT DEFAULT 'caja_pagos',
    ADD COLUMN IF NOT EXISTS source_record_id TEXT,
    ADD COLUMN IF NOT EXISTS record_hash TEXT,
    ADD COLUMN IF NOT EXISTS last_etl_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.interest_charges 
    ADD COLUMN IF NOT EXISTS source_system TEXT DEFAULT 'EXCEL_COBRANZA',
    ADD COLUMN IF NOT EXISTS source_entity TEXT DEFAULT 'intereses_coactiva',
    ADD COLUMN IF NOT EXISTS source_record_id TEXT,
    ADD COLUMN IF NOT EXISTS record_hash TEXT,
    ADD COLUMN IF NOT EXISTS last_etl_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Crear Esquemas Aislados para Simulación Lógica de BDs y Capa Staging
CREATE SCHEMA IF NOT EXISTS legacy_papeletas;
CREATE SCHEMA IF NOT EXISTS legacy_recaudacion;
CREATE SCHEMA IF NOT EXISTS staging;

-- 3. Tablas de la Base de Datos Independiente 1: Sistema de Tránsito/Papeletas (legacy_papeletas)
CREATE TABLE IF NOT EXISTS legacy_papeletas.sgp_ciudadanos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    num_doc TEXT NOT NULL UNIQUE,
    nombres_apellidos TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legacy_papeletas.sgp_papeletas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nro_papeleta TEXT NOT NULL UNIQUE,
    doc_ciudadano TEXT NOT NULL,
    monto_infraccion NUMERIC(12,2) NOT NULL CHECK (monto_infraccion >= 0),
    fecha_infraccion DATE NOT NULL,
    cod_infraccion TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'PENDIENTE',
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tablas de la Base de Datos Independiente 2: Sistema de Recaudación (legacy_recaudacion)
CREATE TABLE IF NOT EXISTS legacy_recaudacion.caja_pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_recibo TEXT NOT NULL UNIQUE,
    nro_papeleta TEXT NOT NULL,
    fecha_cobro DATE NOT NULL,
    monto_cobrado NUMERIC(12,2) NOT NULL CHECK (monto_cobrado > 0),
    cajero TEXT DEFAULT 'Ventanilla 01',
    medio_pago TEXT DEFAULT 'EFECTIVO',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tablas de la Capa Staging (staging)
CREATE TABLE IF NOT EXISTS staging.etl_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    executed_by UUID REFERENCES auth.users(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'INICIADO' CHECK (status IN ('INICIADO', 'EN_PROCESO', 'COMPLETADO', 'COMPLETADO_CON_ADVERTENCIAS', 'FALLIDO')),
    total_extracted INT DEFAULT 0,
    total_inserted INT DEFAULT 0,
    total_updated INT DEFAULT 0,
    total_unchanged INT DEFAULT 0,
    total_rejected INT DEFAULT 0,
    details JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS staging.infracciones_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etl_run_id UUID REFERENCES staging.etl_runs(id) ON DELETE CASCADE,
    source_system TEXT NOT NULL,
    source_entity TEXT NOT NULL,
    source_record_id TEXT NOT NULL,
    nro_papeleta TEXT,
    doc_ciudadano TEXT,
    nombre_ciudadano TEXT,
    monto NUMERIC(12,2),
    fecha DATE,
    cod_infraccion TEXT,
    raw_payload JSONB,
    record_hash TEXT,
    validation_status TEXT DEFAULT 'PENDIENTE' CHECK (validation_status IN ('PENDIENTE', 'VALIDO', 'RECHAZADO')),
    validation_message TEXT,
    extracted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staging.transacciones_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etl_run_id UUID REFERENCES staging.etl_runs(id) ON DELETE CASCADE,
    source_system TEXT NOT NULL,
    source_entity TEXT NOT NULL,
    source_record_id TEXT NOT NULL,
    nro_papeleta TEXT,
    tipo_transaccion TEXT NOT NULL CHECK (tipo_transaccion IN ('PAGO', 'INTERES')),
    monto NUMERIC(12,2),
    fecha DATE,
    referencia TEXT,
    raw_payload JSONB,
    record_hash TEXT,
    validation_status TEXT DEFAULT 'PENDIENTE' CHECK (validation_status IN ('PENDIENTE', 'VALIDO', 'RECHAZADO')),
    validation_message TEXT,
    extracted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staging.etl_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etl_run_id UUID REFERENCES staging.etl_runs(id) ON DELETE CASCADE,
    source_system TEXT NOT NULL,
    source_entity TEXT NOT NULL,
    record_identifier TEXT,
    error_code TEXT NOT NULL,
    message TEXT NOT NULL,
    rejected_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Actualizar Vista Consolidada con Trazabilidad
CREATE OR REPLACE VIEW public.consolidated_tickets_view AS
WITH agg_payments AS (
    SELECT 
        ticket_id, 
        COALESCE(SUM(amount), 0.00) AS total_pagado, 
        COUNT(id) AS count_pagos,
        MAX(paid_at) AS ultimo_pago_fecha
    FROM public.payments
    GROUP BY ticket_id
),
agg_interests AS (
    SELECT 
        ticket_id, 
        COALESCE(SUM(amount), 0.00) AS total_intereses, 
        COUNT(id) AS count_intereses,
        MAX(charged_at) AS ultimo_cargo_fecha
    FROM public.interest_charges
    GROUP BY ticket_id
)
SELECT 
    t.id AS ticket_id,
    t.ticket_number,
    t.citizen_id,
    c.document_number,
    c.full_name AS citizen_name,
    c.phone AS citizen_phone,
    c.email AS citizen_email,
    t.base_amount,
    t.issue_date,
    t.status AS base_status,
    t.infraction_code,
    t.description,
    t.source_system AS ticket_source_system,
    t.source_entity AS ticket_source_entity,
    t.last_etl_at,
    COALESCE(i.total_intereses, 0.00) AS total_intereses,
    COALESCE(p.total_pagado, 0.00) AS total_pagado,
    ROUND((t.base_amount + COALESCE(i.total_intereses, 0.00) - COALESCE(p.total_pagado, 0.00)), 2) AS saldo,
    COALESCE(p.count_pagos, 0) AS cantidad_pagos,
    COALESCE(i.count_intereses, 0) AS cantidad_intereses,
    p.ultimo_pago_fecha,
    i.ultimo_cargo_fecha,
    CASE 
        WHEN ROUND((t.base_amount + COALESCE(i.total_intereses, 0.00) - COALESCE(p.total_pagado, 0.00)), 2) <= 0 THEN 'PAGADA'
        WHEN COALESCE(p.total_pagado, 0.00) > 0 THEN 'AMORTIZADA'
        ELSE 'PENDIENTE'
    END AS computed_status
FROM public.tickets t
JOIN public.citizens c ON t.citizen_id = c.id
LEFT JOIN agg_payments p ON t.id = p.ticket_id
LEFT JOIN agg_interests i ON t.id = i.ticket_id;

-- 7. Procedimiento Transaccional ETL Orquestador
-- Extrae de legacy_papeletas, legacy_recaudacion y los dos arreglos JSON de Excel
CREATE OR REPLACE FUNCTION public.execute_full_etl_pipeline(
    p_excel_infracciones JSONB DEFAULT '[]'::jsonb,
    p_excel_transacciones JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, staging, legacy_papeletas, legacy_recaudacion, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_run_id UUID;
    v_ext INT := 0;
    v_ins INT := 0;
    v_upd INT := 0;
    v_unch INT := 0;
    v_rej INT := 0;
    
    -- Variables temporales
    r_pap RECORD;
    r_pag RECORD;
    v_item JSONB;
    v_hash TEXT;
    v_cit_id UUID;
    v_ticket_id UUID;
    v_existing_hash TEXT;
    v_status TEXT;
    v_amount NUMERIC(12,2);
    v_date DATE;
    v_ticket_num TEXT;
    v_source_key TEXT;
BEGIN
    -- 1. Validar autorización del usuario
    v_user_id := auth.uid();
    IF v_user_id IS NOT NULL THEN
        SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;
        IF v_user_role IS NOT NULL AND v_user_role = 'consulta' THEN
            RAISE EXCEPTION 'Acceso denegado: El rol de consulta no puede ejecutar procesos ETL.';
        END IF;
    END IF;

    -- 2. Registrar inicio de ejecución en Staging
    INSERT INTO staging.etl_runs (executed_by, status)
    VALUES (v_user_id, 'EN_PROCESO')
    RETURNING id INTO v_run_id;

    -- ================================================================
    -- FASE 1: EXTRACCIÓN Y STAGING DE FUENTE 1 (BD Legada de Tránsito)
    -- ================================================================
    FOR r_pap IN 
        SELECT p.*, c.nombres_apellidos, c.telefono, c.email
        FROM legacy_papeletas.sgp_papeletas p
        JOIN legacy_papeletas.sgp_ciudadanos c ON p.doc_ciudadano = c.num_doc
    LOOP
        v_ext := v_ext + 1;
        v_hash := md5(r_pap.nro_papeleta || '|' || r_pap.doc_ciudadano || '|' || r_pap.monto_infraccion::text || '|' || r_pap.fecha_infraccion::text || '|' || r_pap.cod_infraccion || '|' || r_pap.estado);

        INSERT INTO staging.infracciones_raw (
            etl_run_id, source_system, source_entity, source_record_id,
            nro_papeleta, doc_ciudadano, nombre_ciudadano, monto, fecha, cod_infraccion,
            raw_payload, record_hash, validation_status
        ) VALUES (
            v_run_id, 'BD_PAPELETAS_LEGADO', 'sgp_papeletas', r_pap.id::text,
            r_pap.nro_papeleta, r_pap.doc_ciudadano, r_pap.nombres_apellidos, r_pap.monto_infraccion, r_pap.fecha_infraccion, r_pap.cod_infraccion,
            to_jsonb(r_pap), v_hash, 'VALIDO'
        );
    END LOOP;

    -- ================================================================
    -- FASE 2: EXTRACCIÓN Y STAGING DE FUENTE 2 (Excel Inspectores de Campo)
    -- ================================================================
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_excel_infracciones)
    LOOP
        v_ext := v_ext + 1;
        v_ticket_num := UPPER(TRIM(COALESCE(v_item->>'nro_papeleta', '')));
        
        -- Validación preliminar
        IF v_ticket_num = '' THEN
            v_rej := v_rej + 1;
            INSERT INTO staging.etl_errors (etl_run_id, source_system, source_entity, record_identifier, error_code, message, rejected_payload)
            VALUES (v_run_id, 'EXCEL_INSPECTORES', 'infracciones_campo', 'Fila ' || COALESCE(v_item->>'row_number', '?'), 'MISSING_TICKET', 'Número de papeleta no proporcionado', v_item);
            CONTINUE;
        END IF;

        BEGIN
            v_amount := (v_item->>'monto')::numeric(12,2);
            IF v_amount IS NULL OR v_amount <= 0 THEN
                RAISE EXCEPTION 'Monto no positivo';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_rej := v_rej + 1;
            INSERT INTO staging.etl_errors (etl_run_id, source_system, source_entity, record_identifier, error_code, message, rejected_payload)
            VALUES (v_run_id, 'EXCEL_INSPECTORES', 'infracciones_campo', v_ticket_num, 'INVALID_AMOUNT', 'Monto inválido o menor a 0.01', v_item);
            CONTINUE;
        END;

        BEGIN
            v_date := (v_item->>'fecha')::date;
        EXCEPTION WHEN OTHERS THEN
            v_rej := v_rej + 1;
            INSERT INTO staging.etl_errors (etl_run_id, source_system, source_entity, record_identifier, error_code, message, rejected_payload)
            VALUES (v_run_id, 'EXCEL_INSPECTORES', 'infracciones_campo', v_ticket_num, 'INVALID_DATE', 'Fecha de infracción inválida', v_item);
            CONTINUE;
        END;

        v_hash := md5(v_ticket_num || '|' || COALESCE(v_item->>'doc_ciudadano', '') || '|' || v_amount::text || '|' || v_date::text);

        INSERT INTO staging.infracciones_raw (
            etl_run_id, source_system, source_entity, source_record_id,
            nro_papeleta, doc_ciudadano, nombre_ciudadano, monto, fecha, cod_infraccion,
            raw_payload, record_hash, validation_status
        ) VALUES (
            v_run_id, 'EXCEL_INSPECTORES', 'papeletas_campo_inspectores.xlsx', COALESCE(v_item->>'source_key', v_ticket_num),
            v_ticket_num, COALESCE(v_item->>'doc_ciudadano', '00000000'), COALESCE(v_item->>'nombre_ciudadano', 'Ciudadano No Identificado'), v_amount, v_date, COALESCE(v_item->>'cod_infraccion', 'M-99'),
            v_item, v_hash, 'VALIDO'
        );
    END LOOP;

    -- ================================================================
    -- FASE 3: EXTRACCIÓN Y STAGING DE FUENTE 3 (BD Legada de Recaudación / Caja)
    -- ================================================================
    FOR r_pag IN SELECT * FROM legacy_recaudacion.caja_pagos
    LOOP
        v_ext := v_ext + 1;
        v_hash := md5(r_pag.codigo_recibo || '|' || r_pag.nro_papeleta || '|' || r_pag.monto_cobrado::text || '|' || r_pag.fecha_cobro::text);

        INSERT INTO staging.transacciones_raw (
            etl_run_id, source_system, source_entity, source_record_id,
            nro_papeleta, tipo_transaccion, monto, fecha, referencia,
            raw_payload, record_hash, validation_status
        ) VALUES (
            v_run_id, 'BD_RECAUDACION_LEGADO', 'caja_pagos', r_pag.codigo_recibo,
            r_pag.nro_papeleta, 'PAGO', r_pag.monto_cobrado, r_pag.fecha_cobro, 'Recibo ventanilla: ' || r_pag.codigo_recibo || ' (' || r_pag.cajero || ')',
            to_jsonb(r_pag), v_hash, 'VALIDO'
        );
    END LOOP;

    -- ================================================================
    -- FASE 4: EXTRACCIÓN Y STAGING DE FUENTE 4 (Excel Bancos Externos y Cobranza)
    -- ================================================================
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_excel_transacciones)
    LOOP
        v_ext := v_ext + 1;
        v_source_key := TRIM(COALESCE(v_item->>'source_key', ''));
        v_ticket_num := UPPER(TRIM(COALESCE(v_item->>'nro_papeleta', '')));

        IF v_source_key = '' OR v_ticket_num = '' THEN
            v_rej := v_rej + 1;
            INSERT INTO staging.etl_errors (etl_run_id, source_system, source_entity, record_identifier, error_code, message, rejected_payload)
            VALUES (v_run_id, COALESCE(v_item->>'source_system', 'EXCEL_BANCOS_COBRANZA'), 'transacciones_externas', 'Fila ' || COALESCE(v_item->>'row_number', '?'), 'MISSING_FIELDS', 'Falta clave origen o número de papeleta', v_item);
            CONTINUE;
        END IF;

        BEGIN
            v_amount := (v_item->>'monto')::numeric(12,2);
            IF v_amount IS NULL OR v_amount <= 0 THEN
                RAISE EXCEPTION 'Monto no positivo';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_rej := v_rej + 1;
            INSERT INTO staging.etl_errors (etl_run_id, source_system, source_entity, record_identifier, error_code, message, rejected_payload)
            VALUES (v_run_id, COALESCE(v_item->>'source_system', 'EXCEL_BANCOS_COBRANZA'), 'transacciones_externas', v_source_key, 'INVALID_AMOUNT', 'Monto inválido en transacción', v_item);
            CONTINUE;
        END;

        BEGIN
            v_date := (v_item->>'fecha')::date;
        EXCEPTION WHEN OTHERS THEN
            v_rej := v_rej + 1;
            INSERT INTO staging.etl_errors (etl_run_id, source_system, source_entity, record_identifier, error_code, message, rejected_payload)
            VALUES (v_run_id, COALESCE(v_item->>'source_system', 'EXCEL_BANCOS_COBRANZA'), 'transacciones_externas', v_source_key, 'INVALID_DATE', 'Fecha de transacción inválida', v_item);
            CONTINUE;
        END;

        v_hash := md5(v_source_key || '|' || v_ticket_num || '|' || v_amount::text || '|' || v_date::text || '|' || COALESCE(v_item->>'tipo', 'PAGO'));

        INSERT INTO staging.transacciones_raw (
            etl_run_id, source_system, source_entity, source_record_id,
            nro_papeleta, tipo_transaccion, monto, fecha, referencia,
            raw_payload, record_hash, validation_status
        ) VALUES (
            v_run_id, COALESCE(v_item->>'source_system', 'EXCEL_BANCOS_COBRANZA'), COALESCE(v_item->>'source_entity', 'recaudacion_bancos_externos.xlsx'), v_source_key,
            v_ticket_num, COALESCE(v_item->>'tipo', 'PAGO'), v_amount, v_date, COALESCE(v_item->>'referencia', 'Sin referencia'),
            v_item, v_hash, 'VALIDO'
        );
    END LOOP;

    -- ================================================================
    -- FASE 5: CARGA IDEMPOTENTE A TABLAS CORE (public) CON DETECCIÓN DE CAMBIOS
    -- ================================================================

    -- 5.1 Carga de Infracciones y Ciudadanos
    FOR r_pap IN SELECT * FROM staging.infracciones_raw WHERE etl_run_id = v_run_id AND validation_status = 'VALIDO'
    LOOP
        -- Asegurar ciudadano en public.citizens
        INSERT INTO public.citizens (document_number, full_name)
        VALUES (r_pap.doc_ciudadano, r_pap.nombre_ciudadano)
        ON CONFLICT (document_number) DO UPDATE
        SET full_name = CASE 
            WHEN public.citizens.full_name LIKE '%No Identificado%' THEN EXCLUDED.full_name 
            ELSE public.citizens.full_name 
        END
        RETURNING id INTO v_cit_id;

        IF v_cit_id IS NULL THEN
            SELECT id INTO v_cit_id FROM public.citizens WHERE document_number = r_pap.doc_ciudadano;
        END IF;

        -- Evaluar existencia en public.tickets
        SELECT id, record_hash INTO v_ticket_id, v_existing_hash 
        FROM public.tickets WHERE ticket_number = r_pap.nro_papeleta;

        IF v_ticket_id IS NULL THEN
            -- Inserción nueva
            INSERT INTO public.tickets (
                ticket_number, citizen_id, base_amount, issue_date, status, infraction_code, description,
                source_system, source_entity, source_record_id, record_hash, last_etl_at
            ) VALUES (
                r_pap.nro_papeleta, v_cit_id, r_pap.monto, r_pap.fecha, 'PENDIENTE', r_pap.cod_infraccion, 'Infracción cargada por proceso ETL',
                r_pap.source_system, r_pap.source_entity, r_pap.source_record_id, r_pap.record_hash, NOW()
            );
            v_ins := v_ins + 1;
        ELSIF v_existing_hash IS DISTINCT FROM r_pap.record_hash THEN
            -- Actualización controlada (cambio detectado)
            UPDATE public.tickets
            SET base_amount = r_pap.monto,
                issue_date = r_pap.fecha,
                infraction_code = r_pap.cod_infraccion,
                source_system = r_pap.source_system,
                source_entity = r_pap.source_entity,
                record_hash = r_pap.record_hash,
                last_etl_at = NOW()
            WHERE id = v_ticket_id;
            v_upd := v_upd + 1;
        ELSE
            -- Sin cambios (idempotencia pura)
            v_unch := v_unch + 1;
        END IF;
    END LOOP;

    -- 5.2 Carga de Transacciones Financieras (Pagos e Intereses)
    FOR r_pag IN SELECT * FROM staging.transacciones_raw WHERE etl_run_id = v_run_id AND validation_status = 'VALIDO'
    LOOP
        -- Verificar que la papeleta exista en el Core
        SELECT id INTO v_ticket_id FROM public.tickets WHERE ticket_number = r_pag.nro_papeleta;

        IF v_ticket_id IS NULL THEN
            v_rej := v_rej + 1;
            INSERT INTO staging.etl_errors (etl_run_id, source_system, source_entity, record_identifier, error_code, message, rejected_payload)
            VALUES (v_run_id, r_pag.source_system, r_pag.source_entity, r_pag.source_record_id, 'TICKET_NOT_FOUND', 'La papeleta ' || r_pag.nro_papeleta || ' no existe en el sistema consolidado', r_pag.raw_payload);
            CONTINUE;
        END IF;

        IF r_pag.tipo_transaccion = 'PAGO' THEN
            SELECT record_hash INTO v_existing_hash FROM public.payments WHERE ticket_id = v_ticket_id AND source_record_key = r_pag.source_record_id;

            IF v_existing_hash IS NULL THEN
                -- Nuevo Pago
                INSERT INTO public.payments (
                    ticket_id, source_record_key, paid_at, amount, reference,
                    source_system, source_entity, source_record_id, record_hash, last_etl_at
                ) VALUES (
                    v_ticket_id, r_pag.source_record_id, r_pag.fecha, r_pag.monto, r_pag.referencia,
                    r_pag.source_system, r_pag.source_entity, r_pag.source_record_id, r_pag.record_hash, NOW()
                );
                v_ins := v_ins + 1;
            ELSIF v_existing_hash <> r_pag.record_hash THEN
                -- Actualización controlada
                UPDATE public.payments
                SET amount = r_pag.monto,
                    paid_at = r_pag.fecha,
                    reference = r_pag.referencia,
                    record_hash = r_pag.record_hash,
                    last_etl_at = NOW()
                WHERE ticket_id = v_ticket_id AND source_record_key = r_pag.source_record_id;
                v_upd := v_upd + 1;
            ELSE
                v_unch := v_unch + 1;
            END IF;

        ELSIF r_pag.tipo_transaccion = 'INTERES' THEN
            SELECT record_hash INTO v_existing_hash FROM public.interest_charges WHERE ticket_id = v_ticket_id AND source_record_key = r_pag.source_record_id;

            IF v_existing_hash IS NULL THEN
                -- Nuevo Cargo
                INSERT INTO public.interest_charges (
                    ticket_id, source_record_key, charged_at, amount, observation,
                    source_system, source_entity, source_record_id, record_hash, last_etl_at
                ) VALUES (
                    v_ticket_id, r_pag.source_record_id, r_pag.fecha, r_pag.monto, r_pag.referencia,
                    r_pag.source_system, r_pag.source_entity, r_pag.source_record_id, r_pag.record_hash, NOW()
                );
                v_ins := v_ins + 1;
            ELSIF v_existing_hash <> r_pag.record_hash THEN
                -- Actualización controlada
                UPDATE public.interest_charges
                SET amount = r_pag.monto,
                    charged_at = r_pag.fecha,
                    observation = r_pag.referencia,
                    record_hash = r_pag.record_hash,
                    last_etl_at = NOW()
                WHERE ticket_id = v_ticket_id AND source_record_key = r_pag.source_record_id;
                v_upd := v_upd + 1;
            ELSE
                v_unch := v_unch + 1;
            END IF;
        END IF;
    END LOOP;

    -- ================================================================
    -- FASE 6: CIERRE DE EJECUCIÓN
    -- ================================================================
    IF v_rej > 0 AND (v_ins > 0 OR v_upd > 0) THEN
        v_status := 'COMPLETADO_CON_ADVERTENCIAS';
    ELSIF v_rej > 0 AND v_ins = 0 AND v_upd = 0 AND v_unch = 0 THEN
        v_status := 'FALLIDO';
    ELSE
        v_status := 'COMPLETADO';
    END IF;

    UPDATE staging.etl_runs
    SET status = v_status,
        finished_at = NOW(),
        total_extracted = v_ext,
        total_inserted = v_ins,
        total_updated = v_upd,
        total_unchanged = v_unch,
        total_rejected = v_rej,
        details = jsonb_build_object(
            'extracted', v_ext,
            'inserted', v_ins,
            'updated', v_upd,
            'unchanged', v_unch,
            'rejected', v_rej
        )
    WHERE id = v_run_id;

    RETURN jsonb_build_object(
        'etl_run_id', v_run_id,
        'status', v_status,
        'extracted', v_ext,
        'inserted', v_ins,
        'updated', v_upd,
        'unchanged', v_unch,
        'rejected', v_rej
    );
END;
$$;

