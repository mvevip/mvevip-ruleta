-- =====================================================================
-- MIGRACIÓN 007: Kiosco de 2 pantallas (stand = 'kiosk', screen_id = 'KIOSK_01')
-- =====================================================================
-- Sin cambios en tablas existentes. Crea:
--   1. Tabla `kiosk_sessions` (una sesión activa por kiosco: registro -> botón -> giro -> premio -> impresión).
--   2. Catálogo de premios propio del kiosco (stand = 'kiosk'), copiado del catálogo ACTUAL de Autos.
--      REVISAR nombres, pesos y stock desde Admin > pestaña KIOSCO antes del evento.
--   3. Configuración de pantalla del kiosco (kiosk_roulette, kiosk_qr, kiosk_slider, kiosk_combo), copiada de Autos.
-- Ejecutar manualmente en RDS ANTES de desplegar. Idempotente: re-ejecutar es inofensivo.

USE marketingvip_roulette;

-- 1. Sesiones del kiosco
CREATE TABLE IF NOT EXISTS kiosk_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  screen_id VARCHAR(50) NOT NULL DEFAULT 'KIOSK_01',
  lead_id INT NOT NULL,
  status ENUM('REGISTERED','SPINNING','REVEALED','DONE','EXPIRED') NOT NULL DEFAULT 'REGISTERED',
  phone_token VARCHAR(48) NOT NULL,
  prize_id INT NULL,
  ticket_code VARCHAR(50) NULL,
  is_test TINYINT(1) NOT NULL DEFAULT 0,
  print_status VARCHAR(20) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  started_at DATETIME NULL,
  revealed_at DATETIME NULL,
  finished_at DATETIME NULL,
  INDEX idx_kiosk_screen_status (screen_id, status),
  INDEX idx_kiosk_ticket (ticket_code),
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2. Premios del kiosco (solo si el kiosco aún no tiene)
INSERT INTO prizes (name, description, category, color_hex, text_color, icon, weight, stock, max_daily_wins, active, stand)
SELECT name, description, category, color_hex, text_color, icon, weight, stock, 0, active, 'kiosk'
FROM prizes
WHERE stand = 'autos' AND active = 1
  AND NOT EXISTS (SELECT 1 FROM (SELECT id FROM prizes WHERE stand = 'kiosk' LIMIT 1) AS existing_kiosk);

-- 3. Configuración de pantalla del kiosco (copia de Autos)
INSERT IGNORE INTO display_configs (screen_key, orientation, slide_duration, layout_ratio, video_url, qr_scale_percent, wheel_scale_x, wheel_font_size, video_logo_scale, video_qr_scale, video_qr_position, video_logo_visible)
SELECT CONCAT('kiosk_', screen_key), orientation, slide_duration, layout_ratio, video_url, qr_scale_percent, wheel_scale_x, wheel_font_size, video_logo_scale, video_qr_scale, video_qr_position, video_logo_visible
FROM display_configs WHERE screen_key IN ('roulette', 'qr', 'slider', 'combo');

INSERT IGNORE INTO system_sync (sync_key, version_timestamp, action)
VALUES ('displays_kiosk', UNIX_TIMESTAMP() * 1000, 'INITIAL');

-- Verificar
SELECT stand, COUNT(*) AS premios, SUM(stock) AS stock_total FROM prizes WHERE stand IN ('autos','kiosk') GROUP BY stand;
SELECT screen_key FROM display_configs WHERE screen_key LIKE 'kiosk\_%';
