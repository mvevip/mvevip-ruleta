-- =====================================================================
-- MIGRACIÓN 012: Campaña de correo GENERAL (clientes normales) — screen_id GEN_MAIL, evento 'general'
-- =====================================================================
-- Sin cambios de esquema (prizes.stand y leads.screen_id ya aceptan el valor nuevo). Solo siembra el catálogo de premios
-- propio de la campaña (prizes.stand = 'gen'), copiado del catálogo ACTUAL de Autos. REVISAR nombres, pesos y stock desde
-- el Admin (Premios, evento GENERAL) antes de enviar la campaña.
-- Enlace: https://autos.mvevip.com/?view=mail&ev=general&correo={{ contact.EMAIL }}&c=campana_general
-- La vigencia (hasta 2026-12-31) y la apertura/cierre manual se manejan desde el Admin (usa la tabla event_settings, migración 010).
-- Ejecutar manualmente en RDS ANTES de desplegar. Idempotente: no hace nada si la campaña ya tiene premios.

USE marketingvip_roulette;

INSERT INTO prizes (name, description, category, color_hex, text_color, icon, weight, stock, max_daily_wins, active, stand)
SELECT name, description, category, color_hex, text_color, icon, weight, stock, 0, active, 'gen'
FROM prizes
WHERE stand = 'autos' AND active = 1
  AND NOT EXISTS (SELECT 1 FROM (SELECT id FROM prizes WHERE stand = 'gen' LIMIT 1) AS existing_gen);

UPDATE prizes SET icon = CASE
  WHEN UPPER(name) LIKE '%VISADO%' THEN 'stamp'
  WHEN UPPER(name) LIKE '%MALETA%' THEN 'luggage'
  WHEN UPPER(name) LIKE '%SEGUNDO DESTINO%' THEN 'plane'
  WHEN UPPER(name) LIKE '%TONSUPA%' THEN 'palmtree'
  WHEN UPPER(name) LIKE '%KIT VIAJERO%' THEN 'backpack'
  WHEN UPPER(name) LIKE '%BONO%' THEN 'badge-dollar'
  ELSE NULL END
WHERE stand = 'gen' AND icon IS NULL;

-- Verificar
SELECT stand, COUNT(*) AS premios, SUM(stock) AS stock_total FROM prizes WHERE stand IN ('autos','mail','rio','amb','gen') GROUP BY stand;
