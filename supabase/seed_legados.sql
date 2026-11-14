-- ====================================================================
-- SIIAC: Semillas de las Bases de Datos Legadas (Simulación Lógica)
-- Dataset Ampliado y Robusto (12 Ciudadanos, 12 Papeletas, 8 Pagos Caja)
-- ====================================================================

-- 1. Poblado de la Base de Datos Independiente 1: Sistema de Tránsito / Papeletas (legacy_papeletas)
INSERT INTO legacy_papeletas.sgp_ciudadanos (num_doc, nombres_apellidos, telefono, email) VALUES
('45892104', 'Juan Carlos Pérez Quispe', '987112233', 'juan.perez.mock@siiac.demo'),
('71203948', 'María Elena Rodríguez Mendoza', '998223344', 'maria.rodriguez.mock@siiac.demo'),
('10459283', 'Carlos Alberto Sánchez Torres', '976334455', 'carlos.sanchez.mock@siiac.demo'),
('42198034', 'Luis Fernando Castro Morales', '954556677', 'luis.castro.mock@siiac.demo'),
('48192031', 'Jorge Luis Mamani Condori', '981223344', 'jorge.mamani.mock@siiac.demo'),
('70291845', 'Patricia Giuliana Flores Vargas', '972334455', 'patricia.flores.mock@siiac.demo'),
('15829304', 'Víctor Raúl Espinoza Benites', '963445566', 'victor.espinoza.mock@siiac.demo'),
('46719283', 'Diana Carolina Ruiz Palacios', '954556677', 'diana.ruiz.mock@siiac.demo'),
('09384712', 'Manuel Enrique Morales Chumpitaz', '945667788', 'manuel.morales.mock@siiac.demo'),
('72839401', 'Carmen Rosa Salazar Villanueva', '936778899', 'carmen.salazar.mock@siiac.demo'),
('44920183', 'Julio César Tello Alarcón', '927889900', 'julio.tello.mock@siiac.demo'),
('75849302', 'Sofía Alejandra Valdivia Ríos', '918990011', 'sofia.valdivia.mock@siiac.demo')
ON CONFLICT (num_doc) DO UPDATE
SET nombres_apellidos = EXCLUDED.nombres_apellidos;

INSERT INTO legacy_papeletas.sgp_papeletas (nro_papeleta, doc_ciudadano, monto_infraccion, fecha_infraccion, cod_infraccion, estado, observaciones) VALUES
('PAP-2024-00101', '45892104', 350.00, '2024-01-15', 'M-01', 'PENDIENTE', 'Infracción registrada en sistema legado PHP'),
('PAP-2024-00102', '45892104', 180.00, '2024-02-10', 'G-40', 'PENDIENTE', 'Giro indebido registrado en sistema legado PHP'),
('PAP-2024-00201', '71203948', 450.00, '2024-03-05', 'M-02', 'PENDIENTE', 'Sin placa visible registrado en sistema legado PHP'),
('PAP-2024-00202', '71203948', 620.00, '2024-04-12', 'M-17', 'PENDIENTE', 'Semáforo en rojo registrado en sistema legado PHP'),
('PAP-2024-00301', '10459283', 1200.00, '2024-01-20', 'M-04', 'PENDIENTE', 'Alcoholemia registrada en sistema legado PHP'),
('PAP-2024-00701', '48192031', 1100.00, '2024-04-10', 'M-01', 'PENDIENTE', 'Transporte público informal registrado en PHP'),
('PAP-2024-00801', '70291845', 495.00, '2024-03-12', 'L-04', 'PENDIENTE', 'Zona reservada para discapacitados en PHP'),
('PAP-2024-00901', '15829304', 620.00, '2024-06-18', 'M-17', 'PENDIENTE', 'Cruzar luz roja registrado en sistema PHP'),
('PAP-2024-01001', '46719283', 380.00, '2024-07-20', 'G-24', 'PENDIENTE', 'Uso de teléfono al conducir en PHP'),
('PAP-2024-01101', '09384712', 1850.00, '2024-01-28', 'M-02', 'PENDIENTE', 'Sin SOAT operativo nocturno en PHP'),
('PAP-2024-01201', '72839401', 550.00, '2024-04-14', 'M-19', 'PENDIENTE', 'No ceder paso a peatón en cruce en PHP'),
('PAP-2024-01301', '44920183', 780.00, '2024-08-05', 'M-40', 'PENDIENTE', 'Conducir con licencia vencida en PHP')
ON CONFLICT (nro_papeleta) DO UPDATE
SET monto_infraccion = EXCLUDED.monto_infraccion;

-- 2. Poblado de la Base de Datos Independiente 2: Sistema de Recaudación / Caja Ventanilla (legacy_recaudacion)
INSERT INTO legacy_recaudacion.caja_pagos (codigo_recibo, nro_papeleta, fecha_cobro, monto_cobrado, cajero, medio_pago) VALUES
('REC-CAJA-101', 'PAP-2024-00101', '2024-02-01', 200.00, 'Ventanilla 01 - Sede Central', 'EFECTIVO'),
('REC-CAJA-102', 'PAP-2024-00201', '2024-03-20', 450.00, 'Ventanilla 02 - Sede Norte', 'TARJETA_DEBITO'),
('REC-CAJA-103', 'PAP-2024-00301', '2024-02-15', 500.00, 'Ventanilla 01 - Sede Central', 'EFECTIVO'),
('REC-CAJA-104', 'PAP-2024-00701', '2024-04-25', 400.00, 'Ventanilla 03 - Sede Sur', 'EFECTIVO'),
('REC-CAJA-105', 'PAP-2024-00801', '2024-03-20', 495.00, 'Ventanilla 01 - Sede Central', 'TARJETA_CREDITO'),
('REC-CAJA-106', 'PAP-2024-01001', '2024-07-28', 200.00, 'Ventanilla 02 - Sede Norte', 'EFECTIVO'),
('REC-CAJA-107', 'PAP-2024-01101', '2024-02-10', 500.00, 'Ventanilla 01 - Sede Central', 'EFECTIVO'),
('REC-CAJA-108', 'PAP-2024-01201', '2024-04-20', 550.00, 'Ventanilla 03 - Sede Sur', 'TARJETA_DEBITO')
ON CONFLICT (codigo_recibo) DO UPDATE
SET monto_cobrado = EXCLUDED.monto_cobrado;
