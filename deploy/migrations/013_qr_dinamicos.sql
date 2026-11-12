-- =====================================================================
-- MIGRACIÓN 013: QR dinámicos (enlaces cortos redirigibles con conteo de escaneos)
-- =====================================================================
-- Tablas nuevas (no modifican las existentes). Un QR impreso apunta a https://autos.mvevip.com/api/q/<slug>;
-- el Admin cambia el destino cuando quiera sin reimprimir. Los escaneos se cuentan por día (una fila por enlace y día).
-- Es opcional para que el resto del sistema funcione: sin estas tablas, los enlaces /api/q/... mandan al inicio y el Admin
-- avisa que falta la migración. Ejecutar manualmente en RDS ANTES de desplegar. Idempotente.

USE marketingvip_roulette;

CREATE TABLE IF NOT EXISTS qr_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(40) NOT NULL,              -- parte corta del enlace: /api/q/<slug>
  name VARCHAR(80) NOT NULL,              -- nombre interno ("QR mesa Ambato")
  target_url VARCHAR(1000) NOT NULL,      -- destino actual (https)
  active TINYINT(1) NOT NULL DEFAULT 1,   -- 0 = el QR manda al inicio
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_qr_slug (slug)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS qr_scans (
  link_id INT NOT NULL,
  day DATE NOT NULL,                      -- día en hora de Ecuador
  total INT NOT NULL DEFAULT 0,
  PRIMARY KEY (link_id, day)
) ENGINE=InnoDB;

-- Verificar (vacías al inicio)
SELECT (SELECT COUNT(*) FROM qr_links) AS enlaces, (SELECT COUNT(*) FROM qr_scans) AS dias_con_escaneos;
