const {
  normalizeEmailParam,
  verifyToken,
  findCrmClient,
  evaluateClient,
  hasPlayedMail
} = require('../services/mailLookup');

/**
 * GET /api/mail/lookup?correo=...&t=...
 * Devuelve los datos del cliente del CRM para saltar o prellenar el formulario del canal Correo.
 * Respuestas uniformes: con token inválido (o sin clave configurada) NUNCA se devuelve ningún dato ni se
 * distingue "no existe" de "token falso". No se registran datos personales en logs.
 */
async function lookupMailClient(req, res) {
  res.set('Cache-Control', 'no-store, private');

  const email = normalizeEmailParam(req.query.correo || req.query.email);
  const token = typeof req.query.t === 'string' ? req.query.t.trim() : '';

  if (!email || !verifyToken(email, token)) {
    return res.json({ success: true, found: false });
  }

  try {
    const row = await findCrmClient(email);
    if (!row) {
      // El token es válido (el enlace es auténtico): se puede devolver el correo para prellenarlo
      return res.json({ success: true, found: false, email });
    }

    const { complete, issues, data } = evaluateClient(row, email);
    const alreadyPlayed = complete ? await hasPlayedMail({ phone: data.phone, email: data.email }) : false;

    return res.json({ success: true, found: true, complete, issues, alreadyPlayed, email, data });
  } catch (error) {
    // Fallo de CRM o de conexión: el cliente ve el formulario normal
    console.error('[MailLookup] Error consultando CRM:', error.code || error.message);
    return res.json({ success: true, found: false, email, degraded: true });
  }
}

module.exports = { lookupMailClient };
