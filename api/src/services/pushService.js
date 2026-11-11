/**
 * Notificaciones push (Web Push / VAPID) de cada lead nuevo para el Admin (navegador y app instalada).
 *  - Cada dispositivo guarda su suscripción y sus filtros (ciudades/frentes) en `push_subscriptions` (migración 011).
 *  - Sin VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY o sin la tabla, todo queda desactivado y NADA del flujo de participación falla.
 *  - El Lambda se congela al responder: por eso el envío se espera (con tope de tiempo) ANTES de responder al participante.
 *  - El contenido NO incluye teléfono ni correo: nombre, ciudad/frente y premio.
 */
const crypto = require('crypto');
const webpush = require('web-push');
const { pool } = require('../config/db');
const config = require('../config/env');
const { STANDS, eventOf } = require('../config/stands');
const { getEventInfo } = require('../config/events');

const SEND_BUDGET_MS = 3500;      // tope total por lead: la participación nunca espera más
const MAX_FAILURES = 8;           // se elimina una suscripción tras varios fallos seguidos
const FRONT_LABEL = { stand: 'Pantalla', kiosk: 'Kiosco', mail: 'Correo' };

let ready = false;
function init() {
  if (ready) return true;
  const { publicKey, privateKey, subject } = config.PUSH;
  if (!publicKey || !privateKey) return false;
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    ready = true;
  } catch (e) {
    console.error('[Push] Claves VAPID inválidas:', e.message);
  }
  return ready;
}

function isConfigured() { return init(); }
function publicKey() { return config.PUSH.publicKey; }
function hashEndpoint(endpoint) { return crypto.createHash('sha256').update(String(endpoint)).digest('hex'); }

/** Normaliza los filtros recibidos del Admin (listas de eventos y frentes conocidos). */
const KNOWN_EVENTS = ['autos', 'ford', 'cuotas', 'kiosk', 'riobamba', 'ambato'];
const KNOWN_FRONTS = ['stand', 'kiosk', 'mail'];
function cleanFilters(raw) {
  const f = raw && typeof raw === 'object' ? raw : {};
  const events = Array.isArray(f.events) ? [...new Set(f.events.map(String).filter((e) => KNOWN_EVENTS.includes(e)))] : [];
  const fronts = Array.isArray(f.fronts) ? [...new Set(f.fronts.map(String).filter((e) => KNOWN_FRONTS.includes(e)))] : [];
  return { events, fronts, includeDemo: f.includeDemo !== false };
}

function parseFilters(value) {
  if (!value) return cleanFilters({});
  try { return cleanFilters(typeof value === 'string' ? JSON.parse(value) : value); } catch (e) { return cleanFilters({}); }
}

function matches(filters, { event, front, isTest }) {
  if (isTest && filters.includeDemo === false) return false;
  if (filters.events.length && !filters.events.includes(event)) return false;
  if (filters.fronts.length && !filters.fronts.includes(front)) return false;
  return true;
}

/** Título y destino de la notificación según el stand del lead. */
function describeLead({ stand, leadName, prizeName, isTest }) {
  const st = STANDS[stand] || STANDS.autos;
  const event = eventOf(stand);
  const info = getEventInfo(event);
  const place = info ? `${info.city} · ${FRONT_LABEL[st.front]}` : (stand === 'mail' ? 'Cuotas · Correo' : st.label);
  const name = String(leadName || 'Alguien').slice(0, 60);
  return {
    event,
    front: st.front,
    payload: {
      title: `${isTest ? 'DEMO · ' : ''}Nuevo lead · ${place}`,
      body: prizeName ? `${name} ganó ${prizeName}` : `${name} se registró y aún no juega`,
      url: `./#/leads?event=${event}`,
      tag: `lead-${Date.now()}`,
      timestamp: Date.now()
    }
  };
}

async function sendTo(row, payload) {
  const subscription = { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 3600, urgency: 'high', timeout: 3000 });
    await pool.query('UPDATE push_subscriptions SET failure_count = 0, last_sent_at = NOW() WHERE id = ?', [row.id]);
    return { ok: true };
  } catch (error) {
    const gone = error.statusCode === 404 || error.statusCode === 410;
    if (gone || row.failure_count + 1 >= MAX_FAILURES) {
      await pool.query('DELETE FROM push_subscriptions WHERE id = ?', [row.id]).catch(() => {});
    } else {
      await pool.query('UPDATE push_subscriptions SET failure_count = failure_count + 1 WHERE id = ?', [row.id]).catch(() => {});
    }
    return { ok: false, statusCode: error.statusCode || 0, gone };
  }
}

/**
 * Avisa de un lead nuevo a los dispositivos suscritos cuyos filtros coinciden. Nunca lanza errores.
 * @param {{stand:string, leadName:string, prizeName?:string, isTest?:boolean}} lead
 */
async function notifyNewLead(lead) {
  if (!init()) return { sent: 0, skipped: 'not_configured' };
  try {
    const [rows] = await pool.query('SELECT id, endpoint, p256dh, auth, filters, failure_count FROM push_subscriptions');
    if (rows.length === 0) return { sent: 0 };
    const desc = describeLead(lead);
    const targets = rows.filter((r) => matches(parseFilters(r.filters), { event: desc.event, front: desc.front, isTest: Boolean(lead.isTest) }));
    if (targets.length === 0) return { sent: 0 };

    const work = Promise.all(targets.map((r) => sendTo(r, desc.payload)));
    const results = await Promise.race([work, new Promise((resolve) => setTimeout(() => resolve(null), SEND_BUDGET_MS))]);
    return { sent: results ? results.filter((x) => x.ok).length : 0, timedOut: results === null };
  } catch (error) {
    if (error.code !== 'ER_NO_SUCH_TABLE') console.error('[Push] Error notificando el lead:', error.code || error.message);
    return { sent: 0, error: true };
  }
}

async function sendTest(endpoint) {
  if (!init()) return { ok: false, reason: 'not_configured' };
  const [rows] = await pool.query('SELECT id, endpoint, p256dh, auth, failure_count FROM push_subscriptions WHERE endpoint_hash = ?', [hashEndpoint(endpoint)]);
  if (rows.length === 0) return { ok: false, reason: 'not_registered' };
  const result = await sendTo(rows[0], {
    title: 'Notificaciones activas ✅',
    body: 'Así verás cada lead nuevo: nombre, ciudad y premio.',
    url: './#/leads',
    tag: 'vip-test',
    timestamp: Date.now()
  });
  return { ok: result.ok, statusCode: result.statusCode };
}

module.exports = {
  isConfigured, publicKey, hashEndpoint, cleanFilters, parseFilters, matches, describeLead, notifyNewLead, sendTest, KNOWN_EVENTS, KNOWN_FRONTS
};
