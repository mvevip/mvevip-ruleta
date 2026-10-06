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
    whatsapp: process.env.WHATSAPP_NUMBER || '593999999999'
  }
};
