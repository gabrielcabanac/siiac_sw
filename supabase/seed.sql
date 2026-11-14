-- ====================================================================
-- SIIAC: Datos Semilla Iniciales (Seed Data Ficticio)
-- Simula la base de datos heredada del Sistema de Papeletas
-- ====================================================================

-- 1. Insertar Ciudadanos Ficticios
INSERT INTO public.citizens (id, document_number, full_name, phone, email) VALUES
('c1000000-0000-0000-0000-000000000001', '45892104', 'Juan Carlos Pérez Quispe', '987112233', 'juan.perez.mock@siiac.demo'),
('c1000000-0000-0000-0000-000000000002', '71203948', 'María Elena Rodríguez Mendoza', '998223344', 'maria.rodriguez.mock@siiac.demo'),
('c1000000-0000-0000-0000-000000000003', '10459283', 'Carlos Alberto Sánchez Torres', '976334455', 'carlos.sanchez.mock@siiac.demo'),
('c1000000-0000-0000-0000-000000000004', '08392019', 'Rosa Victoria Huamán Ramos', '965445566', 'rosa.huaman.mock@siiac.demo'),
('c1000000-0000-0000-0000-000000000005', '42198034', 'Luis Fernando Castro Morales', '954556677', 'luis.castro.mock@siiac.demo'),
('c1000000-0000-0000-0000-000000000006', '73928174', 'Ana Lucía Gómez Chávez', '943667788', 'ana.gomez.mock@siiac.demo')
ON CONFLICT (document_number) DO UPDATE 
SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, email = EXCLUDED.email;

-- 2. Insertar Papeletas Iniciales (Sistema Existente)
INSERT INTO public.tickets (id, ticket_number, citizen_id, base_amount, issue_date, status, infraction_code, description) VALUES
('t1000000-0000-0000-0000-000000000001', 'PAP-2024-00101', 'c1000000-0000-0000-0000-000000000001', 350.00, '2024-01-15', 'PENDIENTE', 'M-01', 'Estacionar en zona rígida o prohibida'),
('t1000000-0000-0000-0000-000000000002', 'PAP-2024-00102', 'c1000000-0000-0000-0000-000000000001', 180.00, '2024-02-10', 'PENDIENTE', 'G-40', 'Giro indebido a la izquierda'),
('t1000000-0000-0000-0000-000000000003', 'PAP-2024-00201', 'c1000000-0000-0000-0000-000000000002', 450.00, '2024-03-05', 'PENDIENTE', 'M-02', 'Conducir sin placa visible o adulterada'),
('t1000000-0000-0000-0000-000000000004', 'PAP-2024-00202', 'c1000000-0000-0000-0000-000000000002', 620.00, '2024-04-12', 'PENDIENTE', 'M-17', 'Cruzar intersección con semáforo en luz roja'),
('t1000000-0000-0000-0000-000000000005', 'PAP-2024-00301', 'c1000000-0000-0000-0000-000000000003', 1200.00, '2024-01-20', 'PENDIENTE', 'M-04', 'Conducir bajo efectos de alcohol superando límite'),
('t1000000-0000-0000-0000-000000000006', 'PAP-2024-00401', 'c1000000-0000-0000-0000-000000000004', 280.00, '2024-05-18', 'PENDIENTE', 'G-10', 'No utilizar cinturón de seguridad'),
('t1000000-0000-0000-0000-000000000007', 'PAP-2024-00402', 'c1000000-0000-0000-0000-000000000004', 510.00, '2024-06-01', 'PENDIENTE', 'M-20', 'No respetar señales de policía de tránsito'),
('t1000000-0000-0000-0000-000000000008', 'PAP-2024-00501', 'c1000000-0000-0000-0000-000000000005', 950.00, '2024-02-28', 'PENDIENTE', 'M-03', 'Exceso de velocidad en zona escolar'),
('t1000000-0000-0000-0000-000000000009', 'PAP-2024-00502', 'c1000000-0000-0000-0000-000000000005', 210.00, '2024-07-14', 'PENDIENTE', 'L-01', 'Dejar mal estacionado vehículo menor'),
('t1000000-0000-0000-0000-000000000010', 'PAP-2024-00601', 'c1000000-0000-0000-0000-000000000006', 820.00, '2024-08-01', 'PENDIENTE', 'M-08', 'Circular en sentido contrario al tránsito')
ON CONFLICT (ticket_number) DO UPDATE 
SET base_amount = EXCLUDED.base_amount, issue_date = EXCLUDED.issue_date;

