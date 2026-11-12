-- =====================================================================
-- MIGRACIÓN 014: Correo de bienvenida por Brevo (plantilla por frente + registro de envíos)
-- =====================================================================
-- Tablas nuevas (no modifican las existentes). `email_templates` guarda el número de plantilla de Brevo de cada frente
-- (autos, ford, kiosk, mail, gen_mail, rio_stand, rio_kiosk, rio_mail, amb_stand, amb_kiosk, amb_mail): con número se envía
-- el correo al registrarse; sin número (o sin fila) NO se envía nada. `email_log` registra cada envío (uno por lead).
-- Es opcional para que el resto funcione: sin estas tablas el correo de bienvenida queda desactivado y el Admin lo avisa.
-- Ejecutar manualmente en RDS ANTES de desplegar. Idempotente.

USE marketingvip_roulette;

CREATE TABLE IF NOT EXISTS email_templates (
  stand VARCHAR(20) PRIMARY KEY,
  template_id VARCHAR(10) NULL,            -- número de plantilla en Brevo; vacío = no enviar
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS email_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT NOT NULL,                    -- un correo de bienvenida por lead
  stand VARCHAR(20) NOT NULL,
  template_id VARCHAR(10) NOT NULL,
  to_email VARCHAR(150) NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'pending',   -- pending | sent | failed
  message_id VARCHAR(120) NULL,
  error VARCHAR(300) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_email_lead (lead_id),
  KEY idx_email_stand (stand, created_at)
) ENGINE=InnoDB;

-- Verificar (vacías al inicio)
SELECT (SELECT COUNT(*) FROM email_templates) AS plantillas, (SELECT COUNT(*) FROM email_log) AS envios;
