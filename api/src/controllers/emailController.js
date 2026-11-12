/**
 * Admin del correo de bienvenida (Brevo):
 *   GET  /api/admin/email           plantilla por frente + conteo de envíos + últimos envíos
 *   PUT  /api/admin/email/:stand    guarda el número de plantilla (vacío = no enviar)
 *   POST /api/admin/email/:stand/test  envía la plantilla de ese frente a un correo de prueba
 */
const { pool } = require('../config/db');
const { STANDS } = require('../config/stands');
const welcome = require('../services/welcomeEmail');

function missingTable(res) {
  return res.status(503).json({ success: false, code: 'MISSING_TABLE', message: 'Falta ejecutar la migración 014 (tablas email_templates y email_log).' });
}

async function overview(req, res) {
  res.set('Cache-Control', 'no-store');
  try {
    const [tpl] = await pool.query('SELECT stand, template_id FROM email_templates');
    const [counts] = await pool.query(
      `SELECT stand, SUM(status = 'sent') AS sent, SUM(status = 'failed') AS failed, SUM(status = 'pending') AS pending
         FROM email_log GROUP BY stand`
    );
    const [recent] = await pool.query(
      `SELECT id, stand, template_id, status, error, created_at,
              CONCAT(LEFT(to_email, 2), '***', SUBSTRING(to_email, LOCATE('@', to_email))) AS to_masked
         FROM email_log ORDER BY id DESC LIMIT 15`
    );
    const byStand = {};
    Object.keys(STANDS).forEach((k) => { byStand[k] = { stand: k, template_id: '', sent: 0, failed: 0 }; });
    tpl.forEach((r) => { if (byStand[r.stand]) byStand[r.stand].template_id = r.template_id || ''; });
    counts.forEach((r) => { if (byStand[r.stand]) { byStand[r.stand].sent = Number(r.sent); byStand[r.stand].failed = Number(r.failed) + Number(r.pending); } });
    return res.json({ success: true, configured: welcome.isConfigured(), data: Object.values(byStand), recent });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return missingTable(res);
    console.error('[Correo] Error cargando el panel:', error);
    return res.status(500).json({ success: false, message: 'No se pudo cargar el correo de bienvenida.' });
  }
}

async function save(req, res) {
  const stand = String(req.params.stand || '');
  if (!STANDS[stand]) return res.status(400).json({ success: false, message: 'Frente no válido.' });
  const raw = String((req.body && req.body.template_id) || '').trim();
  if (raw && !welcome.TEMPLATE_RE.test(raw)) return res.status(400).json({ success: false, message: 'El número de plantilla solo lleva dígitos (ej.: 261).' });
  try {
    await pool.query(
      'INSERT INTO email_templates (stand, template_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE template_id = VALUES(template_id)',
      [stand, raw || null]
    );
    welcome.invalidateCache();
    return res.json({ success: true, template_id: raw });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return missingTable(res);
    console.error('[Correo] Error guardando la plantilla:', error);
    return res.status(500).json({ success: false, message: 'No se pudo guardar la plantilla.' });
  }
}

async function test(req, res) {
  const stand = String(req.params.stand || '');
  if (!STANDS[stand]) return res.status(400).json({ success: false, message: 'Frente no válido.' });
  const email = String((req.body && req.body.email) || '').trim();
  if (!welcome.EMAIL_RE.test(email)) return res.status(400).json({ success: false, message: 'Escribe un correo válido para la prueba.' });
  if (!welcome.isConfigured()) return res.status(503).json({ success: false, message: 'Falta configurar BREVO_SENDER_EMAIL en el servidor.' });
  try {
    const [rows] = await pool.query('SELECT template_id FROM email_templates WHERE stand = ?', [stand]);
    const templateId = rows[0] && rows[0].template_id;
    if (!templateId) return res.status(400).json({ success: false, message: 'Este frente no tiene plantilla guardada.' });
    const result = await welcome.callBrevo({ to: email, templateId });
    if (!result.ok) return res.status(502).json({ success: false, message: `Brevo no envió el correo: ${result.error}` });
    return res.json({ success: true, messageId: result.messageId });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return missingTable(res);
    return res.status(500).json({ success: false, message: 'No se pudo enviar la prueba.' });
  }
}

module.exports = { overview, save, test };
