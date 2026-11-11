-- =====================================================================
-- MIGRACIÓN 008: Ferias de Riobamba y Ambato (13 a 15 de noviembre de 2026)
-- =====================================================================
-- Sin cambios de esquema (prizes.stand y leads.screen_id ya aceptan los valores nuevos). Solo siembra:
--   1. Catálogo de premios de Riobamba (prizes.stand = 'rio') y de Ambato (stand = 'amb'), copiados del catálogo
--      ACTUAL de Autos. Cada catálogo lo COMPARTEN los 3 frentes de la ciudad (pantalla gigante, kiosco y correo):
--      el stock se descuenta del mismo grupo. REVISAR nombres, pesos y stock desde el Admin antes del evento.
--   2. Íconos de viaje de la ruleta del celular (mismas reglas por nombre de la migración 004).
-- Ejecutar manualmente en RDS ANTES de desplegar. Idempotente: no hace nada si la ciudad ya tiene premios.
-- Los frentes de pantalla gigante y kiosco necesitarán además su configuración de pantalla (llegará con la Fase B).

USE marketingvip_roulette;

INSERT INTO prizes (name, description, category, color_hex, text_color, icon, weight, stock, max_daily_wins, active, stand)
SELECT name, description, category, color_hex, text_color, icon, weight, stock, 0, active, 'rio'
FROM prizes
WHERE stand = 'autos' AND active = 1
  AND NOT EXISTS (SELECT 1 FROM (SELECT id FROM prizes WHERE stand = 'rio' LIMIT 1) AS existing_rio);

INSERT INTO prizes (name, description, category, color_hex, text_color, icon, weight, stock, max_daily_wins, active, stand)
SELECT name, description, category, color_hex, text_color, icon, weight, stock, 0, active, 'amb'
FROM prizes
WHERE stand = 'autos' AND active = 1
  AND NOT EXISTS (SELECT 1 FROM (SELECT id FROM prizes WHERE stand = 'amb' LIMIT 1) AS existing_amb);

UPDATE prizes SET icon = CASE
  WHEN UPPER(name) LIKE '%VISADO%' THEN 'stamp'
  WHEN UPPER(name) LIKE '%MALETA%' THEN 'luggage'
  WHEN UPPER(name) LIKE '%SEGUNDO DESTINO%' THEN 'plane'
  WHEN UPPER(name) LIKE '%TONSUPA%' THEN 'palmtree'
  WHEN UPPER(name) LIKE '%KIT VIAJERO%' THEN 'backpack'
  WHEN UPPER(name) LIKE '%BONO%' THEN 'badge-dollar'
  ELSE NULL END
WHERE stand IN ('rio', 'amb') AND icon IS NULL;

-- Verificar
SELECT stand, COUNT(*) AS premios, SUM(stock) AS stock_total FROM prizes WHERE stand IN ('autos','mail','rio','amb') GROUP BY stand;
