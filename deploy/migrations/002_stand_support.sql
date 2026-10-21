-- =====================================================================
-- MIGRACIÓN 002: Soporte Multi-Stand (Autos / Ford) en la misma BD
-- =====================================================================
-- IMPORTANTE: Ejecutar manualmente en producción ANTES de desplegar.
-- En entorno local (Docker) se aplica automáticamente al iniciar la API.

USE marketingvip_roulette;

-- 1. Columna stand en prizes ('autos' por defecto para conservar datos actuales)
ALTER TABLE prizes
  ADD COLUMN stand VARCHAR(20) NOT NULL DEFAULT 'autos',
  ADD INDEX idx_prizes_stand (stand);

-- 2. Columna stand en slider_images ('autos' por defecto)
ALTER TABLE slider_images
  ADD COLUMN stand VARCHAR(20) NOT NULL DEFAULT 'autos',
  ADD INDEX idx_slider_stand (stand);

-- 3. Asegurar columna assigned_to en leads (por si no existía)
ALTER TABLE leads
  ADD COLUMN assigned_to VARCHAR(150) DEFAULT NULL;

-- 4. Semilla inicial de premios para el stand Ford (colores corporativos #212650 y #FFFFFF)
INSERT IGNORE INTO prizes (id, name, description, category, color_hex, text_color, weight, stock, max_daily_wins, active, stand) VALUES
(101, 'Gorra Oficial Ford', 'Gorra oficial Ford | Quito Motors edición especial.', 'SOUVENIR', '#212650', '#FFFFFF', 350, 300, 0, 1, 'ford'),
(102, 'Termo Ford Performance', 'Termo metálico deportivo edición Ford.', 'SOUVENIR', '#FFFFFF', '#212650', 250, 200, 15, 1, 'ford'),
(103, 'Llavero Metálico Ford', 'Llavero metálico coleccionable Ford | Quito Motors.', 'SOUVENIR', '#212650', '#FFFFFF', 400, 400, 0, 1, 'ford'),
(104, 'Bono Accesorios Ford', 'Bono especial para accesorios originales en Quito Motors.', 'DESCUENTO', '#FFFFFF', '#212650', 120, 100, 10, 1, 'ford'),
(105, 'Camiseta Oficial Ford', 'Camiseta edición feria automotriz Ford | Quito Motors.', 'SOUVENIR', '#212650', '#FFFFFF', 150, 150, 10, 1, 'ford'),
(106, 'Kit Souvenir Ford', 'Kit oficial de souvenirs corporativos Ford.', 'EXPERIENCIA', '#FFFFFF', '#212650', 80, 80, 5, 1, 'ford');

-- 5. Configuraciones de pantalla independientes para Ford (ford_roulette, ford_qr, ford_slider, ford_combo)
INSERT IGNORE INTO display_configs (screen_key, orientation, slide_duration, layout_ratio, video_url, qr_scale_percent, wheel_scale_x, wheel_font_size, video_logo_scale, video_qr_scale, video_qr_position, video_logo_visible)
SELECT CONCAT('ford_', screen_key), orientation, slide_duration, layout_ratio, video_url, qr_scale_percent, wheel_scale_x, wheel_font_size, video_logo_scale, video_qr_scale, video_qr_position, video_logo_visible
FROM display_configs
WHERE screen_key IN ('roulette', 'qr', 'slider', 'combo');

-- 6. Clave de sincronización remota independiente para las pantallas de Ford
INSERT IGNORE INTO system_sync (sync_key, version_timestamp, action)
VALUES ('displays_ford', UNIX_TIMESTAMP() * 1000, 'INITIAL');
