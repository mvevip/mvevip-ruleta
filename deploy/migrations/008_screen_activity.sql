-- 008: actividad reciente por pantalla (escaneo de QR / formulario), compartida entre contenedores Lambda.
-- Opcional: sin esta tabla el API usa la memoria del contenedor (comportamiento anterior).
CREATE TABLE IF NOT EXISTS screen_activity (
  screen_id VARCHAR(50) NOT NULL PRIMARY KEY,
  last_activity_ms BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB;
