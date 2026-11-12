/**
 * Correo de bienvenida por Brevo al registrarse (todos los frentes: pantalla, kiosco, correo, general, Autos, Ford).
 *  - Cada frente tiene su número de plantilla de Brevo (tabla `email_templates`, se edita en Admin > Ajustes > Correo de bienvenida).
 *    Con número se envía; sin número no se envía nada (como antes).
 *  - Se envía llamando a la Lambda `mvevip-brevo` (API Gateway, POST /enviar-email). Esa Lambda EXIGE `sender` {name, email}
 *    en el cuerpo, así que se manda siempre (BREVO_SENDER_EMAIL / BREVO_SENDER_NAME del Lambda de la ruleta).
 *  - Un solo correo por lead (clave única en `email_log`), nunca a usuarios demo, y NUNCA rompe ni retrasa más de unos segundos
 *    la participación: cualquier fallo se registra y el juego sigue.
 *  - El Lambda se congela al responder: por eso el envío se espera (con tope) ANTES de responder al participante.
 *  - Sin tablas (migración 014), sin remitente o sin plantilla, todo queda desactivado.
 */
const { pool } = require('../config/db');
const config = require('../config/env');

const SEND_BUDGET_MS = 6000;
const CACHE_TTL_MS = 10 * 1000;
let cache = { at: 0, map: {}, missingTable: false };
let warnedNoSender = false;

const TEMPLATE_RE = /^[0-9]{1,8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isConfigured() {
  return Boolean(config.BREVO.senderEmail && EMAIL_RE.test(config.BREVO.senderEmail) && config.BREVO.apiUrl);
}

async function loadTemplates({ force = false } = {}) {
  if (!force && Date.now() - cache.at < CACHE_TTL_MS) return cache;
  try {
    const [rows] = await pool.query('SELECT stand, template_id FROM email_templates');
    const map = {};
    rows.forEach((r) => { if (r.template_id && TEMPLATE_RE.test(String(r.template_id))) map[r.stand] = String(r.template_id); });
    cache = { at: Date.now(), map, missingTable: false };
  } catch (error) {
    cache = { at: Date.now(), map: {}, missingTable: error.code === 'ER_NO_SUCH_TABLE' };
    if (error.code !== 'ER_NO_SUCH_TABLE') console.error('[Correo] Error leyendo plantillas:', error.code || error.message);
  }
  return cache;
}

function invalidateCache() { cache.at = 0; }

/** Llama a la Lambda de Brevo. Devuelve { ok, messageId, error }. */
async function callBrevo({ to, templateId, params }) {
  const body = {
    sender: { name: config.BREVO.senderName || 'Marketing VIP', email: config.BREVO.senderEmail },
    to,
    templateId: String(templateId)
  };
  if (config.BREVO.replyEmail && EMAIL_RE.test(config.BREVO.replyEmail)) body.replyTo = { email: config.BREVO.replyEmail };
  if (params && Object.keys(params).length) body.params = params;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_BUDGET_MS);
  try {
    const res = await fetch(`${config.BREVO.apiUrl}/enviar-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    let json = null;
    try { json = await res.json(); } catch (_) { /* respuesta sin JSON */ }
    if (res.ok && json && json.success) {
      const messageId = json.result && (json.result.messageId || (json.result.body && json.result.body.messageId));
      return { ok: true, messageId: messageId ? String(messageId).slice(0, 120) : null };
    }
    const detail = (json && (json.error || (json.details && json.details.message))) || `HTTP ${res.status}`;
    return { ok: false, error: String(detail).slice(0, 300) };
  } catch (error) {
    return { ok: false, error: error.name === 'AbortError' ? 'Tiempo de espera agotado' : String(error.message || error).slice(0, 300) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Envía el correo de bienvenida del lead si su frente tiene plantilla. Nunca lanza.
 * @param {{stand:string, leadId:number, name?:string, email:string, isTest?:boolean}} lead
 */
async function sendWelcome(lead) {
  try {
    if (!lead || lead.isTest || !lead.leadId || !lead.email || !EMAIL_RE.test(lead.email)) return { sent: false, skipped: 'n/a' };
    const { map } = await loadTemplates();
    const templateId = map[lead.stand];
    if (!templateId) return { sent: false, skipped: 'no_template' };
    if (!isConfigured()) {
      if (!warnedNoSender) { warnedNoSender = true; console.warn('[Correo] Hay plantilla configurada pero falta BREVO_SENDER_EMAIL: no se envía.'); }
      return { sent: false, skipped: 'not_configured' };
    }

    // Un solo correo por lead: si ya existe la fila, no se repite (reintentos, registros repetidos)
    const [ins] = await pool.query(
      `INSERT IGNORE INTO email_log (lead_id, stand, template_id, to_email, status) VALUES (?, ?, ?, ?, 'pending')`,
      [lead.leadId, lead.stand, templateId, lead.email.slice(0, 150)]
    );
    if (!ins.affectedRows) return { sent: false, skipped: 'duplicate' };

    const result = await callBrevo({ to: lead.email, templateId });
    await pool.query(
      'UPDATE email_log SET status = ?, message_id = ?, error = ? WHERE lead_id = ?',
      [result.ok ? 'sent' : 'failed', result.messageId || null, result.ok ? null : result.error, lead.leadId]
    );
    if (!result.ok) console.warn(`[Correo] Falló el envío (lead ${lead.leadId}, frente ${lead.stand}): ${result.error}`);
    return { sent: result.ok };
  } catch (error) {
    if (error.code !== 'ER_NO_SUCH_TABLE') console.error('[Correo] Error en el correo de bienvenida:', error.code || error.message);
    return { sent: false, error: true };
  }
}

module.exports = { sendWelcome, callBrevo, loadTemplates, invalidateCache, isConfigured, TEMPLATE_RE, EMAIL_RE };
