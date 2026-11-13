-- 015: tema claro/oscuro de las pantallas (se usa en los kioscos al aire libre; se cambia desde Admin > Pantallas).
-- Seguro de repetir. Si no se ejecuta, el API crea la columna sola al primer guardado del tema; mientras tanto todo sigue en oscuro.
ALTER TABLE display_configs ADD COLUMN IF NOT EXISTS theme VARCHAR(10) NOT NULL DEFAULT 'dark';
