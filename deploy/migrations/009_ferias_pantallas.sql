-- =====================================================================
-- MIGRACIÓN 009: Pantallas de las ferias de Riobamba y Ambato (pantalla gigante y kiosco de cada ciudad)
-- =====================================================================
-- Sin cambios de esquema. Crea la configuración de pantalla (video, QR, ruleta, slider, combo) de cada frente,
-- copiada de la de Autos, para poder ajustarla después desde el Admin:
--   rio_stand_*  pantalla gigante de Riobamba     (screen_id RIO_STAND)
--   rio_kiosk_*  kiosco de Riobamba, pantalla de arriba (screen_id RIO_KIOSK)
--   amb_stand_*  pantalla gigante de Ambato        (screen_id AMB_STAND)
--   amb_kiosk_*  kiosco de Ambato, pantalla de arriba   (screen_id AMB_KIOSK)
-- Los premios ya existen (migración 008: catálogo por ciudad compartido por pantalla, kiosco y correo).
-- La tabla kiosk_sessions (migración 007) ya sirve a los dos kioscos nuevos (columna screen_id).
-- Ejecutar manualmente en RDS ANTES de desplegar. Idempotente (INSERT IGNORE).

USE marketingvip_roulette;

INSERT IGNORE INTO display_configs (screen_key, orientation, slide_duration, layout_ratio, video_url, qr_scale_percent, wheel_scale_x, wheel_font_size, video_logo_scale, video_qr_scale, video_qr_position, video_logo_visible)
SELECT CONCAT(p.prefix, d.screen_key), d.orientation, d.slide_duration, d.layout_ratio, d.video_url, d.qr_scale_percent, d.wheel_scale_x, d.wheel_font_size, d.video_logo_scale, d.video_qr_scale, d.video_qr_position, d.video_logo_visible
FROM display_configs d
JOIN (SELECT 'rio_stand_' AS prefix UNION ALL SELECT 'rio_kiosk_' UNION ALL SELECT 'amb_stand_' UNION ALL SELECT 'amb_kiosk_') p
WHERE d.screen_key IN ('roulette', 'qr', 'slider', 'combo');

INSERT IGNORE INTO system_sync (sync_key, version_timestamp, action) VALUES
  ('displays_rio_stand', UNIX_TIMESTAMP() * 1000, 'INITIAL'),
  ('displays_rio_kiosk', UNIX_TIMESTAMP() * 1000, 'INITIAL'),
  ('displays_amb_stand', UNIX_TIMESTAMP() * 1000, 'INITIAL'),
  ('displays_amb_kiosk', UNIX_TIMESTAMP() * 1000, 'INITIAL');

-- Verificar (deben salir 4 filas por frente: roulette, qr, slider, combo)
SELECT screen_key FROM display_configs
WHERE screen_key LIKE 'rio\_stand\_%' OR screen_key LIKE 'rio\_kiosk\_%' OR screen_key LIKE 'amb\_stand\_%' OR screen_key LIKE 'amb\_kiosk\_%'
ORDER BY screen_key;
