-- =====================================================================
-- MIGRACIÓN 005: Vínculo del lead con el cliente del CRM (campaña por correo de Brevo)
-- =====================================================================
-- crm_email: correo con el que se identificó el cliente en el enlace del correo (puede diferir del correo
--            que luego corrigió en el formulario). NULL = jugó entrando por el enlace abierto.
-- crm_match: 'direct' (pasó directo a la ruleta con datos completos), 'corrected' (corrigió datos) o 'linked'.
-- Ejecutar manualmente en RDS. Es opcional para el funcionamiento: si no existe, el giro igual se registra
-- (solo se pierde el vínculo con el CRM). Ejecutar UNA sola vez.

USE marketingvip_roulette;

-- 1) Verificar que las columnas aún no existen (debe devolver 0 filas)
SELECT COLUMN_NAME FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'marketingvip_roulette' AND TABLE_NAME = 'leads' AND COLUMN_NAME IN ('crm_email', 'crm_match');

-- 2) Agregar columnas e índice (no modifica datos existentes)
ALTER TABLE leads
  ADD COLUMN crm_email VARCHAR(150) NULL DEFAULT NULL,
  ADD COLUMN crm_match VARCHAR(20) NULL DEFAULT NULL,
  ADD INDEX idx_leads_crm_email (crm_email);
