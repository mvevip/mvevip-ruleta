-- =====================================================================
-- MIGRACIÓN 004: Íconos de viaje en los premios (ruleta del canal Correo)
-- =====================================================================
-- Agrega prizes.icon (llave del ícono, ej. 'plane', 'luggage'). NULL = la ruleta muestra el texto del premio.
-- Ejecutar manualmente en RDS ANTES de desplegar el código que la usa
-- (el API nuevo selecciona la columna `icon`; sin ella fallarían las consultas de premios).
-- Ejecutar UNA sola vez: si la columna ya existe, el ALTER dará error "Duplicate column name" (inofensivo).

USE marketingvip_roulette;

-- 1) Verificar que la columna aún no existe (debe devolver 0 filas)
SELECT COLUMN_NAME FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'marketingvip_roulette' AND TABLE_NAME = 'prizes' AND COLUMN_NAME = 'icon';

-- 2) Agregar la columna (no modifica datos existentes)
ALTER TABLE prizes ADD COLUMN icon VARCHAR(40) NULL DEFAULT NULL;

-- 3) Ícono sugerido para los premios actuales del canal Correo (solo donde aún no hay ícono; editable luego en Admin)
UPDATE prizes SET icon = CASE
  WHEN UPPER(name) LIKE '%VISADO%' THEN 'stamp'
  WHEN UPPER(name) LIKE '%MALETA%' THEN 'luggage'
  WHEN UPPER(name) LIKE '%SEGUNDO DESTINO%' THEN 'plane'
  WHEN UPPER(name) LIKE '%TONSUPA%' THEN 'palmtree'
  WHEN UPPER(name) LIKE '%KIT VIAJERO%' THEN 'backpack'
  WHEN UPPER(name) LIKE '%BONO%' THEN 'badge-dollar'
  ELSE NULL END
WHERE stand = 'mail' AND icon IS NULL;

-- 4) Verificar
SELECT id, stand, name, icon FROM prizes WHERE stand = 'mail' ORDER BY id;
