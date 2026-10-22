const {
  normalizeEmailParam,
  isMailLinkAuthorized,
  findCrmClient,
  evaluateClient,
  hasPlayedMail,
  findPreviousMailPlay,
  maskPhone
} = require('../services/mailLookup');

/**
 * GET /api/mail/lookup?correo=...&c=<clave de campaña>   (o &t=<token firmado>)
 * Indica si el cliente existe en el CRM y si sus datos están completos, para saltar o prellenar el formulario.
 * Privacidad: el celular NUNCA se envía al navegador (solo una versión enmascarada); en el flujo directo el
 * giro se hace con los datos que el servidor lee del CRM. Sin credencial válida no se devuelve ningún dato y
 * no se distingue "no existe" de "credencial falsa". No se registran datos personales en logs.
 */
async function lookupMailClient(req, res) {
  res.set('Cache-Control', 'no-store, private');

  const email = normalizeEmailParam(req.query.correo || req.query.email);

  if (!email || !isMailLinkAuthorized(email, { c: req.query.c, t: req.query.t })) {
    return res.json({ success: true, found: false });
  }

  try {
    // ¿Ya jugó (y quizá corrigió sus datos)? Se resuelve con lo guardado en leads, no con el CRM
    const previous = await findPreviousMailPlay(email);
    if (previous) {
      return res.json({
        success: true,
        found: true,
        complete: true,
        issues: [],
        alreadyPlayed: true,
        email,
        data: { name: previous.name, email: previous.email, phoneHint: maskPhone(previous.phone) }
      });
    }

    const row = await findCrmClient(email);
    if (!row) {
      return res.json({ success: true, found: false, email });
    }

    const { complete, issues, data, phoneHint } = evaluateClient(row, email);
    const alreadyPlayed = complete ? await hasPlayedMail({ phone: data.phone, email: data.email }) : false;

    // data.phone se queda en el servidor; al navegador solo llegan nombre, correo y el celular enmascarado
    return res.json({
      success: true,
      found: true,
      complete,
      issues,
      alreadyPlayed,
      email,
      data: { name: data.name, email: data.email, phoneHint }
    });
  } catch (error) {
    // Fallo de CRM o de conexión: el cliente ve el formulario normal
    console.error('[MailLookup] Error consultando CRM:', error.code || error.message);
    return res.json({ success: true, found: false, email, degraded: true });
  }
}

module.exports = { lookupMailClient };
