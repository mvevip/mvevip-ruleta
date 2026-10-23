-- =====================================================================
-- MIGRACIÓN 006: Canales de acceso (habilitar/deshabilitar y canal por defecto)
-- =====================================================================
-- Tabla nueva `channel_settings` (no modifica tablas existentes). Los 3 canales parten HABILITADOS y con
-- Autos como canal por defecto (comportamiento actual); el cambio se hace luego desde el Admin.
-- Es opcional para que el sistema funcione: si no existe, el API usa esos mismos valores y el Admin avisa
-- que falta la tabla al intentar guardar. Ejecutar UNA sola vez (CREATE IF NOT EXISTS + INSERT IGNORE: re-ejecutar es inofensivo).

USE marketingvip_roulette;

CREATE TABLE IF NOT EXISTS channel_settings (
  channel VARCHAR(20) PRIMARY KEY,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO channel_settings (channel, enabled, is_default) VALUES
  ('autos', 1, 1),
  ('ford',  1, 0),
  ('mail',  1, 0);

-- Verificar
SELECT channel, enabled, is_default FROM channel_settings ORDER BY channel;
