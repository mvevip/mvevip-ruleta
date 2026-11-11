-- =====================================================================
-- MIGRACIÓN 010: Datos de las ferias editables desde el Admin (tabla event_settings)
-- =====================================================================
-- Tabla nueva (no modifica tablas existentes). Vacía: mientras no haya fila de una feria rigen los valores por
-- defecto del código (nombre, lugar, mapa, fechas, stand y cierre el domingo 15-nov 22:00 hora Ecuador).
-- El Admin guarda aquí lo que se edite (modal "Datos de la feria") y se aplica en pocos segundos a los 3 frentes de la ciudad.
-- Es opcional para que el sistema funcione: si no existe, el API usa los valores por defecto y el Admin avisa al guardar.
-- Ejecutar manualmente en RDS ANTES de desplegar. Idempotente.

USE marketingvip_roulette;

CREATE TABLE IF NOT EXISTS event_settings (
  event VARCHAR(20) PRIMARY KEY,          -- 'riobamba' | 'ambato'
  fair_name VARCHAR(150) NULL,
  venue VARCHAR(200) NULL,
  maps_url VARCHAR(500) NULL,
  dates_text VARCHAR(150) NULL,
  stand_text VARCHAR(150) NULL,
  closes_at VARCHAR(40) NULL,             -- ISO-8601 con zona, p. ej. 2026-11-15T22:00:00-05:00
  is_open TINYINT(1) NOT NULL DEFAULT 1,  -- 0 = cerrada manualmente (no se aceptan participaciones nuevas)
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Verificar (vacía al inicio)
SELECT event, fair_name, venue, closes_at, is_open FROM event_settings;
