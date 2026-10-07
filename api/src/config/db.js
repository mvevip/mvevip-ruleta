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
