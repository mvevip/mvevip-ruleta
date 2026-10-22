/**
 * Búsqueda de clientes para el flujo del correo de Brevo (?view=mail&correo=...&t=...).
 *  - El enlace lleva el correo y un token firmado (HMAC) para que nadie pueda consultar datos de un cliente
 *    solo adivinando su correo.
 *  - Los datos salen del CRM (esquema `mve`, mismo servidor RDS) en SOLO LECTURA.
 */
const crypto = require('crypto');
const { pool } = require('../config/db');
const config = require('../config/env');
const { validateAndFormatEcuadorPhone, validateEmail } = require('./rouletteLogic');

const TOKEN_LENGTH = 16; // 16 hex = 64 bits de la firma HMAC-SHA256

/**
 * Claves de campaña: texto fijo que va en el enlace del correo (`&c=<clave>`) y que cualquier persona de
 * Brevo puede reutilizar copiando la campaña, sin generar nada por contacto. Cada clave vence en una fecha.
 * Se pueden redefinir sin tocar el código con la variable MAIL_CAMPAIGN_KEYS ("clave:AAAA-MM-DD,clave2:AAAA-MM-DD").
 */
const DEFAULT_CAMPAIGN_KEYS = [{ key: 'campana_cuotas', until: '2026-12-31T23:59:59-05:00' }];

function loadCampaignKeys() {
  const raw = process.env.MAIL_CAMPAIGN_KEYS;
  if (!raw) return DEFAULT_CAMPAIGN_KEYS;
  const parsed = raw.split(',').map((item) => {
    const [key, day] = item.split(':').map((v) => (v || '').trim());
    return key && /^\d{4}-\d{2}-\d{2}$/.test(day || '') ? { key, until: `${day}T23:59:59-05:00` } : null;
  }).filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_CAMPAIGN_KEYS;
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function isCampaignKeyValid(candidate, now = new Date()) {
  if (typeof candidate !== 'string' || candidate.length === 0 || candidate.length > 64) return false;
  return loadCampaignKeys().some(({ key, until }) => safeEqual(candidate, key) && now <= new Date(until));
}

/** El enlace es válido si trae una clave de campaña vigente O el token firmado del correo. */
function isMailLinkAuthorized(email, { c, t } = {}) {
  return isCampaignKeyValid(typeof c === 'string' ? c.trim() : '') ||
    verifyToken(email, typeof t === 'string' ? t.trim() : '');
}

/** "0991234567" -> "09******67" (nunca se devuelve el celular completo al navegador). */
function maskPhone(raw) {
  const digits = String(raw == null ? '' : raw).replace(/\D/g, '');
  if (digits.length < 7) return '';
  return digits.slice(0, 2) + '*'.repeat(digits.length - 4) + digits.slice(-2);
}

/**
 * Normaliza el correo recibido en la URL. Brevo inserta el valor sin codificar, así que un "+" llega como
 * espacio al decodificar la query: como un correo no puede llevar espacios, se restituye el "+".
 */
function normalizeEmailParam(raw) {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().replace(/ /g, '+').toLowerCase();
  if (email.length === 0 || email.length > 150) return null;
  return validateEmail(email).valid ? email : null;
}

function makeToken(email) {
  const secret = config.SECURITY.mailTokenSecret;
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(email).digest('hex').slice(0, TOKEN_LENGTH);
}

function verifyToken(email, token) {
  const expected = makeToken(email);
  if (!expected || typeof token !== 'string' || token.length !== TOKEN_LENGTH) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token.toLowerCase()));
}

const NAME_PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'van', 'von']);

/** "PEREZ GOMEZ" -> "Perez Gomez" (conserva partículas como "de", "del"). */
function titleCase(text) {
  return text
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && NAME_PARTICLES.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/** Nombre para el formulario: "Nombre Apellido" (el CRM guarda apellido y nombre por separado; pueden venir NULL). */
function composeName(nombre, apellido) {
  const clean = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const full = [clean(nombre), clean(apellido)].filter(Boolean).join(' ');
  return full ? titleCase(full) : '';
}

/**
 * Consulta de solo lectura al CRM. Parametrizada (sin concatenar el correo). Si hay varias filas con el
 * mismo correo se prefiere la que tenga celular. Requiere que `cli_email` tenga índice.
 */
async function findCrmClient(email) {
  const [rows] = await pool.query(
    `SELECT C.cli_nombre AS nombre, C.cli_apellido AS apellido, C.cli_celular AS whatsapp, C.cli_email AS correo
     FROM mve.mve_clientes C
     WHERE C.cli_email = ?
     ORDER BY (C.cli_celular IS NULL OR C.cli_celular = '') ASC
     LIMIT 1`,
    [email]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Valida los datos del CRM con las mismas reglas del formulario y devuelve qué campos hay que corregir. */
function evaluateClient(row, fallbackEmail) {
  const name = composeName(row.nombre, row.apellido);
  const issues = [];

  // Nombre y apellido completos: al menos 2 palabras y 3 caracteres
  if (name.length < 3 || name.split(' ').length < 2) issues.push('name');

  const rawPhone = row.whatsapp == null ? '' : String(row.whatsapp).trim();
  const phoneCheck = validateAndFormatEcuadorPhone(rawPhone);
  if (!phoneCheck.valid) issues.push('phone');

  const emailCheck = validateEmail(row.correo || fallbackEmail);
  if (!emailCheck.valid) issues.push('email');

  return {
    complete: issues.length === 0,
    issues,
    phoneHint: maskPhone(rawPhone),
    data: {
      name,
      // Si el celular es inválido se devuelve tal cual (solo dígitos) para que el cliente lo corrija
      phone: phoneCheck.valid ? phoneCheck.phone : rawPhone.replace(/\D/g, '').slice(0, 10),
      email: emailCheck.valid ? emailCheck.email : String(row.correo || fallbackEmail || '').trim().toLowerCase()
    }
  };
}

/** ¿Ya participó en el canal Correo (por celular o correo)? Los usuarios de prueba activos nunca cuentan. */
async function hasPlayedMail({ phone, email }) {
  const [testRows] = await pool.query(
    'SELECT 1 FROM test_users WHERE active = TRUE AND (phone = ? OR email = ?) LIMIT 1',
    [phone || '', email]
  );
  if (testRows.length > 0) return false;

  const [rows] = await pool.query(
    `SELECT 1 FROM leads l JOIN spins s ON s.lead_id = l.id
     WHERE (l.phone = ? OR l.email = ?) AND l.screen_id = 'MAIL_01' AND (l.is_test = 0 OR l.is_test IS NULL)
     LIMIT 1`,
    [phone || '', email]
  );
  return rows.length > 0;
}

/**
 * Participación previa de este cliente del CRM, buscada por el correo con el que se identificó en el enlace
 * (leads.crm_email). Sirve para que quien ya jugó y corrigió sus datos no vuelva a ver el formulario, aunque el
 * CRM siga con el dato antiguo. Devuelve los datos GUARDADOS en el lead (los corregidos) o null.
 */
async function findPreviousMailPlay(email) {
  const [testRows] = await pool.query('SELECT 1 FROM test_users WHERE active = TRUE AND email = ? LIMIT 1', [email]);
  if (testRows.length > 0) return null; // los usuarios de prueba pueden jugar varias veces

  try {
    const [rows] = await pool.query(
      `SELECT l.name, l.phone, l.email
       FROM leads l JOIN spins s ON s.lead_id = l.id
       WHERE l.crm_email = ? AND l.screen_id = 'MAIL_01' AND (l.is_test = 0 OR l.is_test IS NULL)
       ORDER BY l.id DESC LIMIT 1`,
      [email]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    if (error.code === 'ER_BAD_FIELD_ERROR') return null; // falta la migración 005: sin vínculo no hay detección
    throw error;
  }
}

module.exports = {
  normalizeEmailParam,
  findPreviousMailPlay,
  makeToken,
  verifyToken,
  isMailLinkAuthorized,
  isCampaignKeyValid,
  maskPhone,
  composeName,
  findCrmClient,
  evaluateClient,
  hasPlayedMail
};
