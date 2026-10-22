-- Esquema SIMULADO del CRM para pruebas LOCALES del flujo de correo (nunca ejecutar en producción).
-- La tabla real es mve.mve_clientes (mismo servidor RDS que la ruleta); aquí solo las 4 columnas que usa
-- api/src/services/mailLookup.js. Usuario local de la API: vip_user.
CREATE DATABASE IF NOT EXISTS mve CHARACTER SET utf8mb4;
DROP TABLE IF EXISTS mve.mve_clientes;
CREATE TABLE mve.mve_clientes (
  cli_id INT AUTO_INCREMENT PRIMARY KEY,
  cli_nombre VARCHAR(100), cli_apellido VARCHAR(100), cli_celular VARCHAR(30), cli_email VARCHAR(150),
  INDEX idx_cli_email (cli_email)
);
INSERT INTO mve.mve_clientes (cli_nombre, cli_apellido, cli_celular, cli_email) VALUES
('CARLOS ANDRES', 'PEREZ DE LA TORRE', '0991234567',        'ok@test.com'),          -- completo y válido
('MARIA',         'LOPEZ',             '+593 98 765 4321',  'intl@test.com'),        -- celular con +593 (se normaliza)
('JUAN',          'GOMEZ',             '0991',              'badphone@test.com'),    -- celular inválido
('PEDRO',         NULL,                '0987654321',        'noapellido@test.com'),  -- apellido NULL (nombre incompleto)
('ANA',           'RUIZ',              NULL,                'nophone@test.com'),     -- sin celular
('LUIS',          'MORA',              '0970001234',        'luis+promo@test.com'),  -- correo con "+"
('SOFIA',         'VERA',              '0961112222',        'dup@test.com'),         -- correo duplicado (gana la fila con celular)
('SOFIA DUP',     'VERA',              '',                  'dup@test.com'),
('ELENA',         'CANO',              '0955556666',        'Mayus@Test.COM'),       -- mayúsculas
('DIEGO',         'PAZ',               '0944445555',        'jugado@test.com');
GRANT SELECT ON mve.* TO 'vip_user'@'%';
GRANT SELECT ON mve.* TO 'vip_user'@'localhost';
FLUSH PRIVILEGES;
