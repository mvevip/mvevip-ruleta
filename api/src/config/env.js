const path = require('path');
const dotenv = require('dotenv');

// Cargar .env de la raíz del proyecto si existe
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
// Fallback a .env en carpeta actual
dotenv.config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT_API || 5500,
  DB: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    database: process.env.DB_NAME || 'marketingvip_roulette',
    user: process.env.DB_USER || 'vip_user',
    password: process.env.DB_PASSWORD || 'vip_secure_password',
  },
  COMPANY: {
    name: process.env.COMPANY_NAME || 'Marketing VIP',
    slogan: process.env.COMPANY_SLOGAN || 'Especialistas en sueños',
    whatsapp: process.env.WHATSAPP_NUMBER || '593987933325'
  },
  SECURITY: {
    adminPin: (process.env.ADMIN_PIN || 'VIP2026').trim().toUpperCase(),
    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || '',
    // Clave para firmar los enlaces del correo (?correo=...&t=...). Sin clave, la búsqueda por correo queda deshabilitada.
    mailTokenSecret: process.env.MAIL_TOKEN_SECRET || '',
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'https://autos.mvevip.com,https://mvevip.com,http://localhost:5500,http://localhost:5502,http://localhost:5503,http://localhost:5504')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean)
  }
};
