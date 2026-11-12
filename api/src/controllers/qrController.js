/**
 * QR dinámicos: enlaces cortos que redirigen a un destino que se cambia desde el Admin (sin reimprimir el QR).
 *   GET    /api/q/:slug              (público) redirección 302 inmediata + conteo de escaneos
 *   GET    /api/admin/qr             (PIN) lista con escaneos (total / hoy / 7 días)
 *   POST   /api/admin/qr             (PIN) crea
 *   PUT    /api/admin/qr/:id         (PIN) cambia nombre, destino, enlace corto o activo
 *   DELETE /api/admin/qr/:id         (PIN) elimina
 *   GET    /api/admin/qr/:id/stats   (PIN) escaneos por día (30 días)
 */
const { pool } = require('../config/db');

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const BOT_RE = /bot|crawler|spider|preview|facebookexternalhit|whatsapp|slackbot|telegram|skype|curl|wget/i;

function missingTable(res) {
  return res.status(503).json({ success: false, code: 'MISSING_TABLE', message: 'Falta ejecutar la migración 013 (tablas qr_links y qr_scans).' });
}

/** Día actual en hora de Ecuador (UTC-5, sin horario de verano): YYYY-MM-DD. */
function quitoDay(offsetDays = 0) {
  return new Date(Date.now() - 5 * 3600 * 1000 - offsetDays * 86400 * 1000).toISOString().slice(0, 10);
}

function slugify(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
}

function randomSlug() {
  return Math.random().toString(36).slice(2, 8);
}

function cleanTarget(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 1000) return null;
  let url;
  try { url = new URL(raw); } catch (_) { return null; }
  if (url.protocol !== 'https:') return null;
  if (url.pathname.startsWith('/api/q/')) return null; // evita bucles con otro QR dinámico
  return url.toString();
}

// ---------------------------------------------------------------------------------------------------------------
// Público: redirección. Siempre 302 y sin caché (el destino puede cambiar en cualquier momento).
// Si el enlace no existe, está desactivado o falta la tabla, manda al inicio del sitio (nunca muestra un error).
// ---------------------------------------------------------------------------------------------------------------
async function redirect(req, res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  const slug = String(req.params.slug || '').toLowerCase();
  let target = '/';
  try {
    if (SLUG_RE.test(slug)) {
      const [rows] = await pool.query('SELECT id, target_url, active FROM qr_links WHERE slug = ?', [slug]);
      if (rows.length && rows[0].active) {
        target = rows[0].target_url;
        const ua = String(req.headers['user-agent'] || '');
        if (req.method === 'GET' && !BOT_RE.test(ua)) {
          // Un escaneo = una persona abriendo el enlace (se ignoran vistas previas de WhatsApp, rastreadores, HEAD)
          await pool.query(
            'INSERT INTO qr_scans (link_id, day, total) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE total = total + 1',
            [rows[0].id, quitoDay()]
          ).catch((e) => console.warn('[QR] No se pudo contar el escaneo:', e.code || e.message));
        }
      }
    }
  } catch (error) {
    if (error.code !== 'ER_NO_SUCH_TABLE') console.error('[QR] Error en la redirección:', error);
  }
  return res.redirect(302, target);
}

// ---------------------------------------------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------------------------------------------
async function list(req, res) {
  res.set('Cache-Control', 'no-store');
  try {
    const today = quitoDay();
    const from7 = quitoDay(6);
    const [rows] = await pool.query(
      `SELECT l.id, l.slug, l.name, l.target_url, l.active, l.created_at, l.updated_at,
              COALESCE(SUM(s.total), 0) AS scans_total,
              COALESCE(SUM(CASE WHEN s.day = ? THEN s.total ELSE 0 END), 0) AS scans_today,
              COALESCE(SUM(CASE WHEN s.day >= ? THEN s.total ELSE 0 END), 0) AS scans_7d
         FROM qr_links l LEFT JOIN qr_scans s ON s.link_id = l.id
        GROUP BY l.id ORDER BY l.created_at DESC, l.id DESC`,
      [today, from7]
    );
    return res.json({
      success: true,
      data: rows.map((r) => ({ ...r, active: Boolean(r.active), scans_total: Number(r.scans_total), scans_today: Number(r.scans_today), scans_7d: Number(r.scans_7d) }))
    });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return missingTable(res);
    console.error('[QR] Error listando:', error);
    return res.status(500).json({ success: false, message: 'No se pudieron cargar los QR.' });
  }
}

async function create(req, res) {
  const body = req.body || {};
  const name = String(body.name || '').trim().slice(0, 80);
  const target = cleanTarget(body.target_url);
  if (!name) return res.status(400).json({ success: false, message: 'Escribe un nombre para el QR.' });
  if (!target) return res.status(400).json({ success: false, message: 'El destino debe ser un enlace que empiece con https://' });
  let slug = String(body.slug || '').trim().toLowerCase();
  if (slug && !SLUG_RE.test(slug)) return res.status(400).json({ success: false, message: 'El enlace corto usa 3 a 40 letras minúsculas, números o guiones.' });
  const auto = !slug;
  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (auto) slug = (slugify(name) || 'qr').padEnd(3, 'x') + (attempt === 0 ? '' : `-${randomSlug().slice(0, 3)}`);
      if (!SLUG_RE.test(slug)) slug = `qr-${randomSlug()}`;
      try {
        const [result] = await pool.query('INSERT INTO qr_links (slug, name, target_url, active) VALUES (?, ?, ?, ?)', [slug, name, target, body.active === false ? 0 : 1]);
        return res.json({ success: true, id: result.insertId, slug });
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          if (!auto) return res.status(409).json({ success: false, message: `El enlace corto "${slug}" ya existe. Elige otro.` });
          continue;
        }
        throw error;
      }
    }
    return res.status(409).json({ success: false, message: 'No se pudo generar un enlace corto libre. Escribe uno propio.' });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return missingTable(res);
    console.error('[QR] Error creando:', error);
    return res.status(500).json({ success: false, message: 'No se pudo crear el QR.' });
  }
}

async function update(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'QR no válido.' });
  const body = req.body || {};
  const sets = []; const params = [];
  if (body.name !== undefined) {
    const name = String(body.name).trim().slice(0, 80);
    if (!name) return res.status(400).json({ success: false, message: 'El nombre no puede quedar vacío.' });
    sets.push('name = ?'); params.push(name);
  }
  if (body.target_url !== undefined) {
    const target = cleanTarget(body.target_url);
    if (!target) return res.status(400).json({ success: false, message: 'El destino debe ser un enlace que empiece con https://' });
    sets.push('target_url = ?'); params.push(target);
  }
  if (body.slug !== undefined) {
    const slug = String(body.slug).trim().toLowerCase();
    if (!SLUG_RE.test(slug)) return res.status(400).json({ success: false, message: 'El enlace corto usa 3 a 40 letras minúsculas, números o guiones.' });
    sets.push('slug = ?'); params.push(slug);
  }
  if (body.active !== undefined) { sets.push('active = ?'); params.push(body.active ? 1 : 0); }
  if (!sets.length) return res.status(400).json({ success: false, message: 'No hay nada que cambiar.' });
  try {
    const [result] = await pool.query(`UPDATE qr_links SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Ese QR ya no existe.' });
    return res.json({ success: true });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return missingTable(res);
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Ese enlace corto ya lo usa otro QR.' });
    console.error('[QR] Error actualizando:', error);
    return res.status(500).json({ success: false, message: 'No se pudo guardar el QR.' });
  }
}

async function remove(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'QR no válido.' });
  try {
    const [result] = await pool.query('DELETE FROM qr_links WHERE id = ?', [id]);
    await pool.query('DELETE FROM qr_scans WHERE link_id = ?', [id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Ese QR ya no existe.' });
    return res.json({ success: true });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return missingTable(res);
    console.error('[QR] Error eliminando:', error);
    return res.status(500).json({ success: false, message: 'No se pudo eliminar el QR.' });
  }
}

async function stats(req, res) {
  res.set('Cache-Control', 'no-store');
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'QR no válido.' });
  try {
    const [rows] = await pool.query('SELECT DATE_FORMAT(day, "%Y-%m-%d") AS day, total FROM qr_scans WHERE link_id = ? AND day >= ? ORDER BY day', [id, quitoDay(29)]);
    const byDay = new Map(rows.map((r) => [r.day, Number(r.total)]));
    const days = [];
    for (let i = 29; i >= 0; i -= 1) { const d = quitoDay(i); days.push({ day: d, total: byDay.get(d) || 0 }); }
    return res.json({ success: true, data: days });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return missingTable(res);
    return res.status(500).json({ success: false, message: 'No se pudieron cargar los escaneos.' });
  }
}

module.exports = { redirect, list, create, update, remove, stats };
