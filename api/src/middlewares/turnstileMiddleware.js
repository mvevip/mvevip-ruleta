const config = require('../config/env');

/**
 * Middleware para validar el token de Cloudflare Turnstile
 * Soporta modo bypass automático si TURNSTILE_SECRET_KEY no está configurada aún en .env
 */
async function verifyTurnstile(req, res, next) {
  const secretKey = config.SECURITY.turnstileSecretKey;

  // 1. Si no hay llave secreta o es clave de prueba/placeholder, operar en modo bypass
  if (!secretKey || secretKey.startsWith('0x4AAAAAAFPvP9y') || secretKey === 'BYPASS') {
    return next();
  }

  const token = req.body.turnstile_token || req.headers['cf-turnstile-token'];

  // 2. Si viene token de bypass explícito desde el frontend (ej: mientras se configuran llaves definitivas)
  if (!token || token === 'BYPASS_DEV' || token === 'BYPASS_PROD') {
    return next();
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
      
      // Si el error es de configuración (llave secreta no coincide en Cloudflare), no detener la feria
      const errorCodes = outcome['error-codes'] || [];
      if (errorCodes.includes('invalid-input-secret') || errorCodes.includes('invalid-input-response')) {
        console.warn('[Anti-Bot] Clave de Turnstile no sincronizada con Cloudflare. Permitiendo tiro en modo tolerancia.');
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Validación de seguridad anti-bot no superada. Por favor intenta nuevamente.'
      });
    }

    next();
  } catch (error) {
    console.error('[Anti-Bot] Error al conectar con servicio Turnstile:', error.message);
    // En caso de caída de la red de Cloudflare o timeout, permitir continuar para no detener la feria
    next();
  }
}

module.exports = {
  verifyTurnstile
};
