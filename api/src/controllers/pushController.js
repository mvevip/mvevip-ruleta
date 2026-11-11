/**
 * Notificaciones push del Admin: clave pública, alta/baja de dispositivos, filtros y prueba.
 *   GET    /api/push/public-key               (público: solo devuelve la clave pública VAPID)
 *   POST   /api/admin/push/subscribe           (PIN)
 *   POST   /api/admin/push/unsubscribe         (PIN)
 *   GET    /api/admin/push/status?endpoint=    (PIN)
 *   PUT    /api/admin/push/filters             (PIN)
 *   POST   /api/admin/push/test                (PIN)
 *   GET    /api/admin/push/devices             (PIN)
 *   DELETE /api/admin/push/devices/:id         (PIN)
 */
const { pool } = require('../config/db');
const push = require('../services/pushService');

function isValidEndpoint(endpoint) {
  return typeof endpoint === 'string' && endpoint.length <= 1500 && /^https:\/\/[^\s]+$/.test(endpoint);
}

function missingTable(res) {
  return res.status(503).json({ success: false, code: 'MISSING_TABLE', message: 'Falta ejecutar la migración 011 (tabla push_subscriptions).' });
}

function shortAgent(ua) {
  const s = String(ua || '');
  const browser = /edg\//i.test(s) ? 'Edge' : /opr\//i.test(s) ? 'Opera' : /chrome|crios/i.test(s) ? 'Chrome' : /firefox|fxios/i.test(s) ? 'Firefox' : /safari/i.test(s) ? 'Safari' : 'Navegador';
  const os = /android/i.test(s) ? 'Android' : /iphone|ipad|ios/i.test(s) ? 'iPhone/iPad' : /windows/i.test(s) ? 'Windows' : /mac os/i.test(s) ? 'Mac' : /linux/i.test(s) ? 'Linux' : '';
  return `${browser}${os ? ` · ${os}` : ''}`;
}

async function getPublicKey(req, res) {
  res.set('Cache-Control', 'no-store');
  return res.json({ success: true, configured: push.isConfigured(), publicKey: push.isConfigured() ? push.publicKey() : null });
}

async function subscribe(req, res) {
  if (!push.isConfigured()) return res.status(503).json({ success: false, code: 'NOT_CONFIGURED', message: 'Las notificaciones no están configuradas en el servidor (faltan las claves VAPID).' });
  const sub = (req.body && req.body.subscription) || {};
  const keys = sub.keys || {};
  if (!isValidEndpoint(sub.endpoint) || !keys.p256dh || !keys.auth || String(keys.p256dh).length > 255 || String(keys.auth).length > 255) {
    return res.status(400).json({ success: false, message: 'La suscripción del dispositivo no es válida.' });
  }
  const filters = push.cleanFilters(req.body.filters);
  const label = String((req.body && req.body.label) || shortAgent(req.headers['user-agent'])).trim().slice(0, 80);
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (endpoint_hash, endpoint, p256dh, auth, label, filters, user_agent, failure_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth), label = VALUES(label), filters = VALUES(filters),
         user_agent = VALUES(user_agent), failure_count = 0`,
      [push.hashEndpoint(sub.endpoint), sub.endpoint, keys.p256dh, keys.auth, label, JSON.stringify(filters), String(req.headers['user-agent'] || '').slice(0, 255)]
    );
    return res.json({ success: true, label, filters });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return missingTable(res);
    console.error('[Push] Error guardando la suscripción:', error);
    return res.status(500).json({ success: false, message: 'No se pudo activar las notificaciones.' });
  }
}

async function unsubscribe(req, res) {
  const endpoint = req.body && req.body.endpoint;
  if (!isValidEndpoint(endpoint)) return res.status(400).json({ success: false, message: 'Dispositivo no válido.' });
  try {
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint_hash = ?', [push.hashEndpoint(endpoint)]);
    return res.json({ success: true });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return missingTable(res);
    return res.status(500).json({ success: false, message: 'No se pudieron desactivar las notificaciones.' });
  }
}

async function status(req, res) {
  res.set('Cache-Control', 'no-store');
  const configured = push.isConfigured();
  const endpoint = req.query && req.query.endpoint;
  try {
    const [[{ devices }]] = await pool.query('SELECT COUNT(*) AS devices FROM push_subscriptions');
    let registered = false; let filters = push.cleanFilters({}); let label = '';
    if (isValidEndpoint(endpoint)) {
      const [rows] = await pool.query('SELECT label, filters FROM push_subscriptions WHERE endpoint_hash = ?', [push.hashEndpoint(endpoint)]);
      if (rows.length) { registered = true; filters = push.parseFilters(rows[0].filters); label = rows[0].label || ''; }
    }
    return res.json({ success: true, configured, tableReady: true, devices, registered, filters, label });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return res.json({ success: true, configured, tableReady: false, devices: 0, registered: false, filters: push.cleanFilters({}), label: '' });
    return res.status(500).json({ success: false, message: 'No se pudo consultar el estado de las notificaciones.' });
  }
}

async function updateFilters(req, res) {
  const endpoint = req.body && req.body.endpoint;
  if (!isValidEndpoint(endpoint)) return res.status(400).json({ success: false, message: 'Dispositivo no válido.' });
  const filters = push.cleanFilters(req.body.filters);
  const label = req.body.label !== undefined ? String(req.body.label).trim().slice(0, 80) : null;
  try {
    const [result] = await pool.query(
      'UPDATE push_subscriptions SET filters = ?, label = COALESCE(?, label) WHERE endpoint_hash = ?',
      [JSON.stringify(filters), label || null, push.hashEndpoint(endpoint)]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Este dispositivo no tiene las notificaciones activadas.' });
    return res.json({ success: true, filters });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return missingTable(res);
    return res.status(500).json({ success: false, message: 'No se pudieron guardar los filtros.' });
  }
}

async function test(req, res) {
  const endpoint = req.body && req.body.endpoint;
  if (!isValidEndpoint(endpoint)) return res.status(400).json({ success: false, message: 'Dispositivo no válido.' });
  try {
    const result = await push.sendTest(endpoint);
    if (result.reason === 'not_configured') return res.status(503).json({ success: false, code: 'NOT_CONFIGURED', message: 'Las notificaciones no están configuradas en el servidor.' });
    if (result.reason === 'not_registered') return res.status(404).json({ success: false, message: 'Este dispositivo no tiene las notificaciones activadas.' });
    if (!result.ok) return res.status(502).json({ success: false, message: 'El servicio de notificaciones del navegador no aceptó el envío. Vuelve a activar las notificaciones en este dispositivo.' });
    return res.json({ success: true, message: 'Notificación de prueba enviada.' });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return missingTable(res);
    return res.status(500).json({ success: false, message: 'No se pudo enviar la prueba.' });
  }
}

async function listDevices(req, res) {
  try {
    const [rows] = await pool.query('SELECT id, label, filters, user_agent, created_at, last_sent_at FROM push_subscriptions ORDER BY id DESC');
    return res.json({
      success: true,
      data: rows.map((r) => ({ id: r.id, label: r.label || shortAgent(r.user_agent), filters: push.parseFilters(r.filters), created_at: r.created_at, last_sent_at: r.last_sent_at }))
    });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return res.json({ success: true, data: [], tableReady: false });
    return res.status(500).json({ success: false, message: 'No se pudo listar los dispositivos.' });
  }
}

async function removeDevice(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ success: false, message: 'Dispositivo no válido.' });
  try {
    await pool.query('DELETE FROM push_subscriptions WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'No se pudo quitar el dispositivo.' });
  }
}

module.exports = { getPublicKey, subscribe, unsubscribe, status, updateFilters, test, listDevices, removeDevice };
