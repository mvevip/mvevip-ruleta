const mysql = require('mysql2/promise');
const config = require('./env');

const pool = mysql.createPool({
  host: config.DB.host,
  port: config.DB.port,
  user: config.DB.user,
  password: config.DB.password,
  database: config.DB.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function checkConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Conectado exitosamente a MySQL: ${config.DB.database} en ${config.DB.host}:${config.DB.port}`);

    // Auto-migración y verificación de columnas para resiliencia
    try {
      // 1. Asegurar columna max_daily_wins en prizes
      await connection.query(`
        ALTER TABLE prizes ADD COLUMN max_daily_wins INT NOT NULL DEFAULT 0;
      `).catch(() => {}); // Si ya existe, ignorar error silenciosamente

      // 2. Asegurar columna device_id en leads
      await connection.query(`
        ALTER TABLE leads ADD COLUMN device_id VARCHAR(64) NOT NULL DEFAULT 'unknown';
      `).catch(() => {});

      // 3. Verificar si hay premios en la tabla, si está vacía, poblar los 8 premios iniciales
      const [prizesCount] = await connection.query('SELECT COUNT(*) AS count FROM prizes');
      if (prizesCount[0].count === 0) {
        console.log('[Database] Poblando premios semilla iniciales...');
        await connection.query(`
          INSERT INTO prizes (id, name, description, category, color_hex, text_color, weight, stock, max_daily_wins, active) VALUES
          (1, 'Gorra Oficial VIP', 'Gorra oficial Marketing VIP edición motorsport.', 'SOUVENIR', '#9AC31C', '#000000', 450, 500, 0, 1),
          (2, 'Bono $100 Paquetes', 'Bono de $100 USD en cualquier paquete internacional.', 'DESCUENTO', '#18181B', '#FFFFFF', 350, 400, 0, 1),
          (3, 'Termo Deportivo', 'Termo metálico térmico de alta gama para viajes.', 'SOUVENIR', '#9AC31C', '#000000', 150, 200, 15, 1),
          (4, 'Bono $200 Vuelos', 'Bono de $200 USD aplicable en vuelos internacionales.', 'VUELO', '#27272A', '#FFFFFF', 60, 100, 5, 1),
          (5, 'Maleta de Mano', 'Maleta de mano deportiva para cabina de avión.', 'SOUVENIR', '#9AC31C', '#000000', 25, 30, 3, 1),
          (6, 'Upgrade All-Inclusive', 'Pase VIP a categoría All-Inclusive Luxury en tu reserva.', 'EXPERIENCIA', '#18181B', '#FFFFFF', 8, 15, 2, 1),
          (7, 'Vuelo 2x1 Caribe', 'Segunda persona viaja gratis en vuelos a Cancún/Punta Cana.', 'VUELO', '#27272A', '#FFFFFF', 2, 8, 1, 1),
          (8, 'Noche Cancún Resort', '1 noche gratis en resort 5 estrellas todo incluido en Cancún.', 'ALOJAMIENTO', '#9AC31C', '#000000', 1, 5, 1, 1)
          ON DUPLICATE KEY UPDATE name=VALUES(name);
        `);
      }
      // 4. Asegurar tabla destinations
      await connection.query(`
        CREATE TABLE IF NOT EXISTS destinations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          is_default BOOLEAN DEFAULT FALSE,
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_active (active)
        ) ENGINE=InnoDB;
      `).catch(() => {});

      const [destCount] = await connection.query('SELECT COUNT(*) AS count FROM destinations');
      if (destCount[0].count === 0) {
        console.log('[Database] Poblando destinos iniciales...');
        await connection.query(`
          INSERT INTO destinations (id, name, is_default, active) VALUES
          (1, '🌴 Cancún', TRUE, TRUE),
          (2, '🏰 Europa', FALSE, TRUE),
          (3, '🏖️ Punta Cana', FALSE, TRUE),
          (4, '🎢 Orlando / Disney', FALSE, TRUE),
          (5, '🚢 Crucero Caribe', FALSE, TRUE),
          (6, '☀️ Miami Beach', FALSE, TRUE)
          ON DUPLICATE KEY UPDATE name=VALUES(name);
        `);
      }
      // 5. Asegurar tabla spin_queue para gestión concurrente de turnos
      await connection.query(`
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
      `).catch(() => {});

      // 6. Asegurar tabla slider_images para cartelería digital
      await connection.query(`
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
      `).catch(() => {});

      // 7. Asegurar tabla display_configs para control de pantallas (orientación y opciones)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS display_configs (
          screen_key VARCHAR(50) PRIMARY KEY,
          orientation VARCHAR(20) NOT NULL DEFAULT 'auto',
          slide_duration INT NOT NULL DEFAULT 8,
          layout_ratio VARCHAR(20) NOT NULL DEFAULT '55/45',
          video_url VARCHAR(255) NOT NULL DEFAULT 'AzQlHkHx6HI',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
      `).catch(() => {});

      await connection.query(`
        ALTER TABLE display_configs ADD COLUMN video_url VARCHAR(255) NOT NULL DEFAULT 'AzQlHkHx6HI';
      `).catch(() => {});

      await connection.query(`
        ALTER TABLE display_configs ADD COLUMN qr_scale_percent INT NOT NULL DEFAULT 55;
      `).catch(() => {});

      await connection.query(`
        ALTER TABLE display_configs ADD COLUMN wheel_scale_x INT NOT NULL DEFAULT 100;
      `).catch(() => {});

      await connection.query(`
        ALTER TABLE display_configs ADD COLUMN wheel_font_size INT NOT NULL DEFAULT 100;
      `).catch(() => {});

      // Poblar configuraciones de pantalla iniciales si no existen
      await connection.query(`
        INSERT INTO display_configs (screen_key, orientation, slide_duration, layout_ratio, video_url, qr_scale_percent, wheel_scale_x, wheel_font_size) VALUES
        ('roulette', 'auto', 8, 'default', 'AzQlHkHx6HI', 55, 100, 100),
        ('qr', 'auto', 8, 'default', 'AzQlHkHx6HI', 55, 100, 100),
        ('slider', 'auto', 8, 'default', 'AzQlHkHx6HI', 55, 100, 100),
        ('combo', 'auto', 8, '55/45', 'AzQlHkHx6HI', 55, 100, 100)
        ON DUPLICATE KEY UPDATE screen_key=VALUES(screen_key);
      `).catch(() => {});

      // 8. Asegurar tabla system_sync para control remoto en tiempo real
      await connection.query(`
        CREATE TABLE IF NOT EXISTS system_sync (
          sync_key VARCHAR(50) PRIMARY KEY,
          version_timestamp BIGINT NOT NULL,
          action VARCHAR(50) NOT NULL DEFAULT 'INITIAL',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
      `).catch(() => {});

      await connection.query(`
        INSERT INTO system_sync (sync_key, version_timestamp, action) VALUES
        ('global_displays', ${Date.now()}, 'INITIAL')
        ON DUPLICATE KEY UPDATE sync_key=VALUES(sync_key);
      `).catch(() => {});

      // 9. Asegurar tabla test_users para usuarios de prueba del stand
      await connection.query(`
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
      `).catch(() => {});

      // Auto-migrar columnas is_test en leads y spins si no existen
      await connection.query(`ALTER TABLE leads ADD COLUMN is_test BOOLEAN DEFAULT FALSE;`).catch(() => {});
      await connection.query(`ALTER TABLE spins ADD COLUMN is_test BOOLEAN DEFAULT FALSE;`).catch(() => {});

      // Semilla inicial de usuarios de prueba si la tabla está vacía
      await connection.query(`
        INSERT IGNORE INTO test_users (id, name, phone, email, notes, active) VALUES
        (1, 'Asesor Demo 1', '0990000001', 'demo1@mvevip.com', 'Demostración Stand', TRUE),
        (2, 'Asesor Demo 2', '0990000002', 'demo2@mvevip.com', 'Demostración Stand', TRUE);
      `).catch(() => {});
    } catch (migErr) {
      console.warn('[Database Migration] Nota durante chequeo de esquema:', migErr.message);
    }

    connection.release();
    return true;
  } catch (error) {
    console.error('[Database Error] Error conectando a MySQL:', error.message);
    return false;
  }
}

module.exports = {
  pool,
  checkConnection
};
