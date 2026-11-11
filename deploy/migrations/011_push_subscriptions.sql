-- =====================================================================
-- MIGRACIÓN 011: Notificaciones push del Admin (una fila por dispositivo suscrito)
-- =====================================================================
-- Tabla nueva (no modifica tablas existentes). Guarda las suscripciones Web Push de cada navegador o app instalada
-- del Admin y sus filtros (ciudades/frentes que quiere recibir). Es opcional para que el sistema funcione: si no
-- existe, las notificaciones quedan desactivadas y el Admin avisa que falta la migración.
-- Requiere además las variables del Lambda VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY (ver .env.example).
-- Ejecutar manualmente en RDS ANTES de desplegar. Idempotente.

USE marketingvip_roulette;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  endpoint_hash CHAR(64) NOT NULL,         -- SHA-256 del endpoint (índice único; el endpoint es largo)
  endpoint TEXT NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  label VARCHAR(80) NULL,                  -- nombre del dispositivo (p. ej. "Chrome · Windows")
  filters JSON NULL,                       -- {"events":["riobamba"],"fronts":["kiosk"],"includeDemo":true}; vacío = todo
  user_agent VARCHAR(255) NULL,
  failure_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_sent_at DATETIME NULL,
  UNIQUE KEY uq_push_endpoint (endpoint_hash)
) ENGINE=InnoDB;

-- Verificar (vacía al inicio)
SELECT COUNT(*) AS dispositivos FROM push_subscriptions;
