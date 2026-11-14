-- 016: reutiliza las imágenes del slider de AUTOS en las pantallas gigantes de Riobamba y Ambato
-- (fase "imágenes con QR" entre el video y la ruleta). Copia SOLO si el stand aún no tiene imágenes (se puede repetir sin duplicar).
-- Después, cada ciudad edita sus imágenes desde Admin > Pantallas (no afecta a Autos).
INSERT INTO slider_images (title, image_url, duration_seconds, sort_order, active, stand)
SELECT title, image_url, duration_seconds, sort_order, 1, 'rio_stand'
FROM slider_images
WHERE stand = 'autos' AND active = 1
  AND NOT EXISTS (SELECT 1 FROM (SELECT id FROM slider_images WHERE stand = 'rio_stand') x);

INSERT INTO slider_images (title, image_url, duration_seconds, sort_order, active, stand)
SELECT title, image_url, duration_seconds, sort_order, 1, 'amb_stand'
FROM slider_images
WHERE stand = 'autos' AND active = 1
  AND NOT EXISTS (SELECT 1 FROM (SELECT id FROM slider_images WHERE stand = 'amb_stand') x);

-- Avisa a las pantallas para que carguen las imágenes sin recargar (versión de sincronización)
UPDATE system_sync SET version_timestamp = UNIX_TIMESTAMP() * 1000, action = 'IMAGENES_COPIADAS'
WHERE sync_key IN ('displays_rio_stand', 'displays_amb_stand');

-- Verificación: debe dar 5 / 5 / 5
SELECT stand, COUNT(*) AS imagenes FROM slider_images WHERE stand IN ('autos','rio_stand','amb_stand') AND active = 1 GROUP BY stand;
