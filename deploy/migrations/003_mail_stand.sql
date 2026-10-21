-- =====================================================================
-- MIGRACIÓN 003: Canal "Correo" (campaña Brevo, /?view=mail)
-- =====================================================================
-- Sin cambios de esquema: prizes.stand y leads.screen_id ya aceptan el nuevo valor.
-- Solo siembra un catálogo de premios independiente (stand = 'mail') copiado del
-- catálogo ACTUAL de Autos. REVISAR nombres, pesos y stock desde Admin > pestaña Correo
-- antes de enviar la campaña. Ejecutar manualmente en RDS ANTES de desplegar.
-- Idempotente: no hace nada si el canal ya tiene premios.

USE marketingvip_roulette;

INSERT INTO prizes (name, description, category, color_hex, text_color, weight, stock, max_daily_wins, active, stand)
SELECT name, description, category, color_hex, text_color, weight, stock, 0, active, 'mail'
FROM prizes
WHERE stand = 'autos' AND active = 1
  AND NOT EXISTS (SELECT 1 FROM (SELECT id FROM prizes WHERE stand = 'mail' LIMIT 1) AS existing_mail);
