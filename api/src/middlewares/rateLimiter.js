const rateLimit = require('express-rate-limit');

// Limitador para giros de ruleta (Evita que scripts vacíen premios rápidamente)
const spinLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 12, // Hasta 12 intentos por minuto por conexión
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes de giro desde esta conexión. Por favor espera 1 minuto.'
  }
});

// Limitador para endpoints administrativos (Protege contra ataques de fuerza bruta al PIN)
const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // Máximo 60 peticiones por minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes administrativas. Por favor espera un momento.'
  }
});

// Limitador general de la API
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  skip: (req) => {
    // No limitar health check ni polling ultra ligero de pantalla de feria
    return req.path === '/health' || req.path.endsWith('/spin/latest') || req.path.endsWith('/screen/activity');
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Límite de solicitudes superado. Intenta nuevamente en breve.'
  }
});

module.exports = {
  spinLimiter,
  adminLimiter,
  globalLimiter
};
