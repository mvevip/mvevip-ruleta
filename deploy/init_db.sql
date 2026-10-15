-- ==========================================
-- MARKETING VIP - BASE DE DATOS RULETA
-- ==========================================

CREATE DATABASE IF NOT EXISTS marketingvip_roulette;
USE marketingvip_roulette;

-- 1. Tabla de Premios de la Ruleta (Con pesos ponderados y límites diarios)
CREATE TABLE IF NOT EXISTS prizes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    category ENUM('DESCUENTO', 'ALOJAMIENTO', 'VUELO', 'EXPERIENCIA', 'SOUVENIR') DEFAULT 'DESCUENTO',
    color_hex VARCHAR(20) NOT NULL DEFAULT '#9AC31C',
    text_color VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
    weight INT NOT NULL DEFAULT 100, -- Peso para calcular probabilidad (0 a 1000)
    stock INT NOT NULL DEFAULT 100,
    max_daily_wins INT NOT NULL DEFAULT 0, -- 0 = sin límite diario, > 0 = tope de veces por día
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Leads (Con device_id y validación de Ecuador)
CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    dream_destination VARCHAR(100) DEFAULT '🌴 Cancún',
    screen_id VARCHAR(50) DEFAULT 'STAND_01',
    device_id VARCHAR(64) NOT NULL DEFAULT 'unknown',
    ip_address VARCHAR(50) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_email (email),
    INDEX idx_device (device_id)
);

-- 3. Tabla de Giros de Ruleta (Historial & Canjes)
CREATE TABLE IF NOT EXISTS spins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    prize_id INT NOT NULL,
    ticket_code VARCHAR(50) UNIQUE NOT NULL,
    screen_id VARCHAR(50) DEFAULT 'STAND_01',
    redeemed BOOLEAN DEFAULT FALSE,
    redeemed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (prize_id) REFERENCES prizes(id) ON DELETE RESTRICT,
    INDEX idx_lead_id (lead_id),
    INDEX idx_created_at (created_at)
);

-- Inserción de premios con paleta corporativa (#9AC31C y contraste oscuro) y estrategia de pesos
INSERT INTO prizes (id, name, description, category, color_hex, text_color, weight, stock, max_daily_wins) VALUES
(1, 'Gorra Oficial VIP', 'Gorra oficial Marketing VIP edición motorsport.', 'SOUVENIR', '#9AC31C', '#000000', 450, 500, 0),
(2, 'Bono $100 Paquetes', 'Bono de $100 USD en cualquier paquete internacional.', 'DESCUENTO', '#18181B', '#FFFFFF', 350, 400, 0),
(3, 'Termo Deportivo', 'Termo metálico térmico de alta gama para viajes.', 'SOUVENIR', '#9AC31C', '#000000', 150, 200, 15),
(4, 'Bono $200 Vuelos', 'Bono de $200 USD aplicable en vuelos internacionales.', 'VUELO', '#27272A', '#FFFFFF', 60, 100, 5),
(5, 'Maleta de Mano', 'Maleta de mano deportiva para cabina de avión.', 'SOUVENIR', '#9AC31C', '#000000', 25, 30, 3),
(6, 'Upgrade All-Inclusive', 'Pase VIP a categoría All-Inclusive Luxury en tu reserva.', 'EXPERIENCIA', '#18181B', '#FFFFFF', 8, 15, 2),
(7, 'Vuelo 2x1 Caribe', 'Segunda persona viaja gratis en vuelos a Cancún/Punta Cana.', 'VUELO', '#27272A', '#FFFFFF', 2, 8, 1),
(8, 'Noche Cancún Resort', '1 noche gratis en resort 5 estrellas todo incluido en Cancún.', 'ALOJAMIENTO', '#9AC31C', '#000000', 1, 5, 1)
ON DUPLICATE KEY UPDATE 
    name=VALUES(name),
    description=VALUES(description),
    category=VALUES(category),
    color_hex=VALUES(color_hex),
    text_color=VALUES(text_color),
    weight=VALUES(weight),
    stock=VALUES(stock),
    max_daily_wins=VALUES(max_daily_wins);

-- 4. Tabla de Destinos Soñados (Gestionable desde Admin)
CREATE TABLE IF NOT EXISTS destinations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_active (active)
) ENGINE=InnoDB;

-- Inserción inicial de destinos
INSERT INTO destinations (id, name, is_default, active) VALUES
(1, '🌴 Cancún', TRUE, TRUE),
(2, '🏰 Europa', FALSE, TRUE),
(3, '🏖️ Punta Cana', FALSE, TRUE),
(4, '🎢 Orlando / Disney', FALSE, TRUE),
(5, '🚢 Crucero Caribe', FALSE, TRUE),
(6, '☀️ Miami Beach', FALSE, TRUE)
ON DUPLICATE KEY UPDATE 
    name=VALUES(name),
    is_default=VALUES(is_default),
    active=VALUES(active);

-- 5. Tabla de Cola de Turnos (Gestión Concurrente de Stands)
CREATE TABLE IF NOT EXISTS spin_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    prize_id INT NOT NULL,
    ticket_code VARCHAR(50) UNIQUE NOT NULL,
    screen_id VARCHAR(50) DEFAULT 'STAND_01',
    status ENUM('WAITING', 'SPINNING', 'COMPLETED', 'EXPIRED') DEFAULT 'WAITING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    INDEX idx_screen_status (screen_id, status),
    INDEX idx_created (created_at),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (prize_id) REFERENCES prizes(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 6. Tabla de Imágenes de Slider (Cartelería Digital)
CREATE TABLE IF NOT EXISTS slider_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL DEFAULT '',
    image_url MEDIUMTEXT NOT NULL,
    duration_seconds INT NOT NULL DEFAULT 8,
    sort_order INT NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active_order (active, sort_order)
) ENGINE=InnoDB;

-- 7. Tabla de Configuraciones de Pantalla (Orientación y Opciones)
CREATE TABLE IF NOT EXISTS display_configs (
    screen_key VARCHAR(50) PRIMARY KEY,
    orientation VARCHAR(20) NOT NULL DEFAULT 'auto',
    slide_duration INT NOT NULL DEFAULT 8,
    layout_ratio VARCHAR(20) NOT NULL DEFAULT '55/45',
    video_url VARCHAR(255) NOT NULL DEFAULT 'AzQlHkHx6HI',
    qr_scale_percent INT NOT NULL DEFAULT 55,
    wheel_scale_x INT NOT NULL DEFAULT 100,
    wheel_font_size INT NOT NULL DEFAULT 100,
    video_logo_scale INT NOT NULL DEFAULT 100,
    video_qr_scale INT NOT NULL DEFAULT 100,
    video_qr_position VARCHAR(50) NOT NULL DEFAULT 'top-center',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO display_configs (screen_key, orientation, slide_duration, layout_ratio, video_url, qr_scale_percent, wheel_scale_x, wheel_font_size, video_logo_scale, video_qr_scale, video_qr_position) VALUES
('roulette', 'auto', 8, 'default', 'AzQlHkHx6HI', 55, 100, 100, 100, 100, 'top-center'),
('qr', 'auto', 8, 'default', 'AzQlHkHx6HI', 55, 100, 100, 100, 100, 'top-center'),
('slider', 'auto', 8, 'default', 'AzQlHkHx6HI', 55, 100, 100, 100, 100, 'top-center'),
('combo', 'auto', 8, '55/45', 'AzQlHkHx6HI', 55, 100, 100, 100, 100, 'top-center')
ON DUPLICATE KEY UPDATE screen_key=VALUES(screen_key);

-- 8. Tabla de Sincronización Remota de Sistema (Control Remoto en Tiempo Real)
CREATE TABLE IF NOT EXISTS system_sync (
    sync_key VARCHAR(50) PRIMARY KEY,
    version_timestamp BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL DEFAULT 'INITIAL',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO system_sync (sync_key, version_timestamp, action) VALUES
('global_displays', 1728830000000, 'INITIAL')
ON DUPLICATE KEY UPDATE sync_key=VALUES(sync_key);

-- 9. Tabla de Usuarios de Prueba (Modo Demo Stand)
CREATE TABLE IF NOT EXISTS test_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(150) NOT NULL,
    notes VARCHAR(255) NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_phone (phone),
    INDEX idx_email (email),
    INDEX idx_active (active)
) ENGINE=InnoDB;

INSERT INTO test_users (id, name, phone, email, notes, active) VALUES
(1, 'Asesor Demo 1', '0990000001', 'demo1@mvevip.com', 'Demostración Stand', TRUE),
(2, 'Asesor Demo 2', '0990000002', 'demo2@mvevip.com', 'Demostración Stand', TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name);

