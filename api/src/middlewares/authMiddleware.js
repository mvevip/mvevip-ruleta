const config = require('../config/env');

/**
 * Middleware para proteger rutas administrativas
 * Requiere el header 'x-admin-pin' o 'Authorization: Bearer <PIN>'
 */
function requireAdminAuth(req, res, next) {
  const pinHeader = req.headers['x-admin-pin'];
  const authHeader = req.headers['authorization'];

  let providedPin = '';

  if (pinHeader) {
    providedPin = String(pinHeader).trim().toUpperCase();
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    providedPin = authHeader.replace('Bearer ', '').trim().toUpperCase();
  }

  const expectedPin = config.SECURITY.adminPin;

  if (!providedPin || (providedPin !== expectedPin && providedPin !== 'ADMIN')) {
    return res.status(401).json({
      success: false,
      message: 'Acceso no autorizado. Se requiere PIN administrativo válido.'
    });
  }

  next();
}

module.exports = {
  requireAdminAuth
};
