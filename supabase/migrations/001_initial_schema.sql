-- ====================================================================
-- SIIAC: Sistema Integrado de Información y Atención al Ciudadano
-- Migración 001: Esquema Base, Tablas, Vistas, Índices y Políticas RLS
-- ====================================================================

-- 1. Habilitar extensión pgcrypto para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabla de Perfiles de Usuario (Roles: admin, operador, consulta)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'operador', 'consulta')),
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Ciudadanos (Datos simulados)
CREATE TABLE IF NOT EXISTS public.citizens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_number TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Papeletas (Sistema existente simulado)
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL UNIQUE,
    citizen_id UUID NOT NULL REFERENCES public.citizens(id) ON DELETE RESTRICT,
    base_amount NUMERIC(12,2) NOT NULL CHECK (base_amount >= 0),
    issue_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDIENTE',
    infraction_code TEXT DEFAULT 'M-01',
    description TEXT DEFAULT 'Infracción de tránsito simulada',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Lotes de Importación (Auditoría de cargas Excel)
CREATE TABLE IF NOT EXISTS public.import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area TEXT NOT NULL CHECK (area IN ('RECAUDACION', 'COBRANZA')),
    original_filename TEXT NOT NULL,
    sha256 TEXT,
    uploader_id UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'PROCESADO' CHECK (status IN ('EN_PROCESO', 'COMPLETADO', 'COMPLETADO_CON_ERRORES', 'FALLIDO')),
    rows_total INT NOT NULL DEFAULT 0,
    rows_valid INT NOT NULL DEFAULT 0,
    rows_rejected INT NOT NULL DEFAULT 0
);

-- 6. Tabla de Errores de Importación por Fila
CREATE TABLE IF NOT EXISTS public.import_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
    row_number INT NOT NULL,
    field_name TEXT,
    error_code TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabla de Pagos (Fuente: Área de Recaudación)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE RESTRICT,
    source_record_key TEXT NOT NULL,
    paid_at DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    reference TEXT,
    import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_payment_ticket_source UNIQUE (ticket_id, source_record_key)
);

-- 8. Tabla de Intereses y Cargos (Fuente: Área de Cobranza)
CREATE TABLE IF NOT EXISTS public.interest_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE RESTRICT,
    source_record_key TEXT NOT NULL,
    charged_at DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    observation TEXT,
    import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_interest_ticket_source UNIQUE (ticket_id, source_record_key)
);

-- ====================================================================
-- ÍNDICES DE RENDIMIENTO
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_citizens_doc ON public.citizens(document_number);
CREATE INDEX IF NOT EXISTS idx_tickets_number ON public.tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_citizen ON public.tickets(citizen_id);
CREATE INDEX IF NOT EXISTS idx_payments_ticket ON public.payments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_interests_ticket ON public.interest_charges(ticket_id);
CREATE INDEX IF NOT EXISTS idx_errors_batch ON public.import_errors(batch_id);
CREATE INDEX IF NOT EXISTS idx_batches_uploader ON public.import_batches(uploader_id);

-- ====================================================================
-- VISTA CONSOLIDADA (Evita producto cartesiano agrupando ANTES del JOIN)
-- Fórmula ilustrativa: saldo = base_amount + total_intereses - total_pagado
-- ====================================================================
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

-- ====================================================================
-- FUNCIÓN RPC EN SERVIDOR: PROCESAMIENTO ATÓMICO E IDEMPOTENTE DE LOTES
-- ====================================================================
CREATE OR REPLACE FUNCTION public.process_import_batch(
    p_area TEXT,
    p_filename TEXT,
    p_sha256 TEXT,
    p_records JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_batch_id UUID;
    v_record RECORD;
    v_ticket_id UUID;
    v_base_amount NUMERIC(12,2);
    v_rows_total INT := 0;
    v_rows_valid INT := 0;
    v_rows_rejected INT := 0;
    v_status TEXT;
    v_item JSONB;
    v_row_num INT;
    v_source_key TEXT;
    v_ticket_number TEXT;
    v_date_val DATE;
    v_amount NUMERIC(12,2);
    v_extra TEXT;
    v_exists BOOLEAN;
BEGIN
    -- 1. Validar autenticación
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado.';
    END IF;

    -- 2. Validar rol autorizado (admin u operador)
    SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;
    IF v_user_role IS NULL OR v_user_role NOT IN ('admin', 'operador') THEN
        RAISE EXCEPTION 'Acceso denegado: Su rol (%) no tiene permisos para cargar lotes.', COALESCE(v_user_role, 'sin rol');
    END IF;

    -- 3. Crear Lote Inicial
    v_rows_total := jsonb_array_length(p_records);
    INSERT INTO public.import_batches (
        area, original_filename, sha256, uploader_id, status, rows_total, rows_valid, rows_rejected
    ) VALUES (
        p_area, p_filename, p_sha256, v_user_id, 'EN_PROCESO', v_rows_total, 0, 0
    ) RETURNING id INTO v_batch_id;

    -- 4. Iterar cada registro para validación y persistencia
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        v_row_num := (v_item->>'row_number')::INT;
        v_source_key := TRIM(COALESCE(v_item->>'source_key', ''));
        v_ticket_number := UPPER(TRIM(COALESCE(v_item->>'ticket_number', '')));
        v_extra := COALESCE(v_item->>'reference_or_obs', '');

        -- Validación 4.1: Clave de origen obligatoria
        IF v_source_key = '' THEN
            INSERT INTO public.import_errors (batch_id, row_number, field_name, error_code, message)
            VALUES (v_batch_id, v_row_num, 'source_key', 'MISSING_KEY', 'El identificador de transacción origen es obligatorio.');
            v_rows_rejected := v_rows_rejected + 1;
            CONTINUE;
        END IF;

        -- Validación 4.2: Número de papeleta obligatorio
        IF v_ticket_number = '' THEN
            INSERT INTO public.import_errors (batch_id, row_number, field_name, error_code, message)
            VALUES (v_batch_id, v_row_num, 'ticket_number', 'MISSING_TICKET', 'El número de papeleta es obligatorio.');
            v_rows_rejected := v_rows_rejected + 1;
            CONTINUE;
        END IF;

        -- Validación 4.3: Importe numérico positivo
        BEGIN
            v_amount := (v_item->>'amount')::NUMERIC(12,2);
            IF v_amount IS NULL OR v_amount <= 0 THEN
                INSERT INTO public.import_errors (batch_id, row_number, field_name, error_code, message)
                VALUES (v_batch_id, v_row_num, 'amount', 'INVALID_AMOUNT', 'El importe debe ser un número positivo mayor a 0.00.');
                v_rows_rejected := v_rows_rejected + 1;
                CONTINUE;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO public.import_errors (batch_id, row_number, field_name, error_code, message)
            VALUES (v_batch_id, v_row_num, 'amount', 'INVALID_FORMAT_AMOUNT', 'Formato de importe no numérico o inválido.');
            v_rows_rejected := v_rows_rejected + 1;
            CONTINUE;
        END;

        -- Validación 4.4: Fecha válida
        BEGIN
            v_date_val := (v_item->>'date_str')::DATE;
            IF v_date_val IS NULL THEN
                INSERT INTO public.import_errors (batch_id, row_number, field_name, error_code, message)
                VALUES (v_batch_id, v_row_num, 'date', 'MISSING_DATE', 'La fecha de la transacción es obligatoria.');
                v_rows_rejected := v_rows_rejected + 1;
                CONTINUE;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO public.import_errors (batch_id, row_number, field_name, error_code, message)
            VALUES (v_batch_id, v_row_num, 'date', 'INVALID_FORMAT_DATE', 'Formato de fecha inválido (use YYYY-MM-DD o DD/MM/YYYY).');
            v_rows_rejected := v_rows_rejected + 1;
            CONTINUE;
        END;

        -- Validación 4.5: Existencia de papeleta en el sistema base
        SELECT id, base_amount INTO v_ticket_id, v_base_amount FROM public.tickets WHERE ticket_number = v_ticket_number;
        IF v_ticket_id IS NULL THEN
            INSERT INTO public.import_errors (batch_id, row_number, field_name, error_code, message)
            VALUES (v_batch_id, v_row_num, 'ticket_number', 'TICKET_NOT_FOUND', 'La papeleta ' || v_ticket_number || ' no existe en el sistema de papeletas.');
            v_rows_rejected := v_rows_rejected + 1;
            CONTINUE;
        END IF;

        -- Procesamiento según Área:
        IF p_area = 'RECAUDACION' THEN
            -- Validación 4.6A: Unicidad e Idempotencia de pago
            SELECT EXISTS (
                SELECT 1 FROM public.payments WHERE ticket_id = v_ticket_id AND source_record_key = v_source_key
            ) INTO v_exists;

            IF v_exists THEN
                INSERT INTO public.import_errors (batch_id, row_number, field_name, error_code, message)
                VALUES (v_batch_id, v_row_num, 'source_key', 'DUPLICATE_PAYMENT', 'El pago con ID ' || v_source_key || ' ya fue registrado previamente para esta papeleta.');
                v_rows_rejected := v_rows_rejected + 1;
                CONTINUE;
            END IF;

            -- Inserción del pago
            INSERT INTO public.payments (ticket_id, source_record_key, paid_at, amount, reference, import_batch_id)
            VALUES (v_ticket_id, v_source_key, v_date_val, v_amount, v_extra, v_batch_id);
            v_rows_valid := v_rows_valid + 1;

        ELSIF p_area = 'COBRANZA' THEN
            -- Validación 4.6B: Unicidad e Idempotencia de interés
            SELECT EXISTS (
                SELECT 1 FROM public.interest_charges WHERE ticket_id = v_ticket_id AND source_record_key = v_source_key
            ) INTO v_exists;

            IF v_exists THEN
                INSERT INTO public.import_errors (batch_id, row_number, field_name, error_code, message)
                VALUES (v_batch_id, v_row_num, 'source_key', 'DUPLICATE_INTEREST', 'El cargo con ID ' || v_source_key || ' ya fue registrado previamente para esta papeleta.');
                v_rows_rejected := v_rows_rejected + 1;
                CONTINUE;
            END IF;

            -- Inserción del interés
            INSERT INTO public.interest_charges (ticket_id, source_record_key, charged_at, amount, observation, import_batch_id)
            VALUES (v_ticket_id, v_source_key, v_date_val, v_amount, v_extra, v_batch_id);
            v_rows_valid := v_rows_valid + 1;
        ELSE
            RAISE EXCEPTION 'Área desconocida: %', p_area;
        END IF;

    END LOOP;

    -- 5. Actualizar estado final del lote
    IF v_rows_rejected = 0 THEN
        v_status := 'COMPLETADO';
    ELSIF v_rows_valid = 0 THEN
        v_status := 'FALLIDO';
    ELSE
        v_status := 'COMPLETADO_CON_ERRORES';
    END IF;

    UPDATE public.import_batches
    SET status = v_status,
        rows_valid = v_rows_valid,
        rows_rejected = v_rows_rejected
    WHERE id = v_batch_id;

    RETURN jsonb_build_object(
        'batch_id', v_batch_id,
        'status', v_status,
        'rows_total', v_rows_total,
        'rows_valid', v_rows_valid,
        'rows_rejected', v_rows_rejected
    );
END;
$$;

-- ====================================================================
-- CONFIGURACIÓN DE SEGURIDAD A NIVEL DE FILAS (RLS)
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interest_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_errors ENABLE ROW LEVEL SECURITY;

-- Funciones auxiliares para RLS
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Políticas para profiles
CREATE POLICY "Usuarios autenticados pueden ver su propio perfil"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.current_user_role() = 'admin');

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admin puede gestionar todos los perfiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.current_user_role() = 'admin');

-- Políticas para citizens (Lectura para cualquier autenticado, escritura admin/operador)
CREATE POLICY "Lectura de ciudadanos para usuarios autenticados"
ON public.citizens FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Gestión de ciudadanos solo admin"
ON public.citizens FOR ALL
TO authenticated
USING (public.current_user_role() = 'admin');

-- Políticas para tickets (Lectura para cualquier autenticado)
CREATE POLICY "Lectura de papeletas para usuarios autenticados"
ON public.tickets FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Gestión de papeletas solo admin"
ON public.tickets FOR ALL
TO authenticated
USING (public.current_user_role() = 'admin');

-- Políticas para payments
CREATE POLICY "Lectura de pagos para usuarios autenticados"
ON public.payments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Operadores y admin pueden registrar pagos"
ON public.payments FOR INSERT
TO authenticated
WITH CHECK (public.current_user_role() IN ('admin', 'operador'));

-- Políticas para interest_charges
CREATE POLICY "Lectura de cargos para usuarios autenticados"
ON public.interest_charges FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Operadores y admin pueden registrar cargos"
ON public.interest_charges FOR INSERT
TO authenticated
WITH CHECK (public.current_user_role() IN ('admin', 'operador'));

-- Políticas para import_batches
CREATE POLICY "Lectura de lotes para usuarios autenticados"
ON public.import_batches FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Inserción de lotes solo admin y operador"
ON public.import_batches FOR INSERT
TO authenticated
WITH CHECK (public.current_user_role() IN ('admin', 'operador'));

-- Políticas para import_errors
CREATE POLICY "Lectura de errores para usuarios autenticados"
ON public.import_errors FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Inserción de errores solo admin y operador"
ON public.import_errors FOR INSERT
TO authenticated
WITH CHECK (public.current_user_role() IN ('admin', 'operador'));

-- Trigger automático para crear perfil cuando un usuario se registra en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario SIIAC'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'consulta')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

