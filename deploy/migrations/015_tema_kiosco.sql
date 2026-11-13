-- 015: tema claro/oscuro de las pantallas (se usa en los kioscos al aire libre; se cambia desde Admin > Pantallas).
-- RDS es MySQL (no acepta IF NOT EXISTS en ADD COLUMN): ejecutar UNA sola vez. Si da "Duplicate column name 'theme'" ya existe y no hay nada que hacer.
-- Si no se ejecuta, el API crea la columna sola al primer guardado del tema; mientras tanto todo sigue en oscuro.
ALTER TABLE display_configs ADD COLUMN theme VARCHAR(10) NOT NULL DEFAULT 'dark';
