const config = require('../config/env');

/**
 * Middleware para validar el token de Cloudflare Turnstile
 * Soporta modo bypass automático si TURNSTILE_SECRET_KEY no está configurada aún en .env
 */
async function verifyTurnstile(req, res, next) {
  const secretKey = config.SECURITY.turnstileSecretKey;

  // Si no está configurada la llave secreta, operar en modo bypass para desarrollo/transición
  if (!secretKey) {
    return next();
  }

  const token = req.body.turnstile_token || req.headers['cf-turnstile-token'];

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Verificación anti-bot no recibida. Por favor recarga e intenta nuevamente.'
    });
  }

  try {
    const clientIp = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (clientIp) {
      formData.append('remoteip', clientIp);
    }

    const cfResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const outcome = await cfResponse.json();

    if (!outcome.success) {
      console.warn('[Anti-Bot] Turnstile verification fallida:', outcome['error-codes']);
      return res.status(403).json({
        success: false,
        message: 'Validación de seguridad anti-bot no superada. Por favor intenta nuevamente.'
      });
    }

    next();
  } catch (error) {
    console.error('[Anti-Bot] Error al conectar con servicio Turnstile:', error.message);
    // En caso de caída de la red de Cloudflare, permitir continuar para no detener la feria
    next();
  }
}

module.exports = {
  verifyTurnstile
};
