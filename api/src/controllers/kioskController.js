/**
 * Kiosco de 2 pantallas (stand 'kiosk', screen_id KIOSK_01).
 *
 *   celular: registro  ->  pantalla de abajo: botón JUGAR AHORA  ->  pantalla de arriba: ruleta  ->  premio + impresión
 *
 * Máquina de estados de `kiosk_sessions` (una sesión activa por kiosco):
 *   REGISTERED  registro hecho, botón habilitado (caduca a los REGISTER_TTL_SEC)
 *   SPINNING    el botón inició el giro (el premio ya está decidido, NO se revela al celular todavía)
 *   REVEALED    la ruleta terminó (la pantalla de arriba lo avisa; si no, a los REVEAL_AFTER_SEC): premio visible en el celular
 *               y datos de impresión en la pantalla de abajo
 *   DONE        impreso (o vencido el tiempo de gracia): el kiosco queda libre para el siguiente
 *   EXPIRED     el botón no se pulsó a tiempo
 *
 * Todo es por polling (GET /api/kiosk/state): en producción el API corre en Lambda y no hay WebSockets.
 * Las transiciones por tiempo se resuelven "perezosamente" con la hora de la BD en cada petición, sin timers.
 * El giro de la pantalla de arriba reutiliza el mecanismo existente (spin_queue en SPINNING -> /api/spin/latest).
 */

const crypto = require('crypto');
const { pool } = require('../config/db');
const config = require('../config/env');
const {
  validateAndFormatEcuadorPhone,
  validateEmail,
  selectWeightedPrize,
  generateTicketCode
} = require('../services/rouletteLogic');
const { screenIdsOf } = require('../config/stands');

const KIOSK_SCREEN_ID = 'KIOSK_01';
const REGISTER_TTL_SEC = 120;   // el botón se bloquea de nuevo si no se pulsa en 2 minutos
const REVEAL_AFTER_SEC = 25;    // RESPALDO: normalmente la pantalla de arriba avisa (POST /revealed) cuando la ruleta se detiene
const REVEAL_HOLD_SEC = 25;     // tras revelar, el kiosco se libera solo si la impresión no confirma
const KIOSK_DESTINATION = 'Kiosco';

function sendError(res, status, code, message, extra = {}) {
  return res.status(status).json({ success: false, code, message, ...extra });
}

/** Protege las rutas de la pantalla del botón (iniciar giro, confirmar impresión). */
function requireKioskKey(req, res, next) {
  const expected = config.SECURITY.kioskKey;
  if (!expected) return sendError(res, 503, 'KIOSK_NOT_CONFIGURED', 'El kiosco no está configurado (falta KIOSK_KEY).');
  const provided = String(req.headers['x-kiosk-key'] || (req.query && req.query.k) || '');
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return sendError(res, 401, 'KIOSK_UNAUTHORIZED', 'Clave de kiosco no válida.');
  }
  next();
}

function isKioskKeyValid(req) {
  const expected = config.SECURITY.kioskKey;
  if (!expected) return false;
  const provided = String(req.headers['x-kiosk-key'] || (req.query && req.query.k) || '');
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Transiciones por tiempo (idempotentes y seguras ante peticiones concurrentes). */
async function advanceSessions(conn) {
  await conn.query(
    `UPDATE kiosk_sessions SET status = 'EXPIRED', finished_at = NOW()
     WHERE screen_id = ? AND status = 'REGISTERED' AND expires_at < NOW()`,
    [KIOSK_SCREEN_ID]
  );
  await conn.query(
    `UPDATE kiosk_sessions SET status = 'REVEALED', revealed_at = NOW()
     WHERE screen_id = ? AND status = 'SPINNING' AND started_at < DATE_SUB(NOW(), INTERVAL ? SECOND)`,
    [KIOSK_SCREEN_ID, REVEAL_AFTER_SEC]
  );
  await conn.query(
    `UPDATE kiosk_sessions SET status = 'DONE', finished_at = NOW(), print_status = COALESCE(print_status, 'TIMEOUT')
     WHERE screen_id = ? AND status = 'REVEALED' AND revealed_at < DATE_SUB(NOW(), INTERVAL ? SECOND)`,
    [KIOSK_SCREEN_ID, REVEAL_HOLD_SEC]
  );
}

const SESSION_SELECT = `
  SELECT ks.id, ks.status, ks.phone_token, ks.ticket_code, ks.is_test, ks.print_status,
         ks.created_at, ks.expires_at, ks.started_at, ks.revealed_at,
         GREATEST(TIMESTAMPDIFF(SECOND, NOW(), ks.expires_at), 0) AS seconds_left,
         l.name AS lead_name, l.phone AS lead_phone,
         p.id AS prize_id, p.name AS prize_name, p.description AS prize_description,
         p.category AS prize_category, p.icon AS prize_icon,
         COALESCE(ks.revealed_at, ks.started_at, ks.created_at) AS played_at
  FROM kiosk_sessions ks
  JOIN leads l ON l.id = ks.lead_id
  LEFT JOIN prizes p ON p.id = ks.prize_id`;

async function findActiveSession(conn) {
  const [rows] = await conn.query(
    `${SESSION_SELECT} WHERE ks.screen_id = ? AND ks.status IN ('REGISTERED','SPINNING','REVEALED') ORDER BY ks.id DESC LIMIT 1`,
    [KIOSK_SCREEN_ID]
  );
  return rows[0] || null;
}

/** Datos del ticket: sirven para el celular y para la impresión (el QR codifica el código de canje). */
function ticketPayload(row) {
  return {
    sessionId: row.id,
    ticketCode: row.ticket_code,
    qrText: row.ticket_code,
    leadName: row.lead_name,
    playedAt: formatQuito(row.played_at),
    winner: {
      id: row.prize_id,
      name: row.prize_name,
      description: row.prize_description,
      category: row.prize_category,
      icon: row.prize_icon || null
    }
  };
}

/** Fecha y hora en Quito (UTC-5, sin horario de verano): dd/mm/aaaa HH:mm. La BD y el Lambda trabajan en UTC. */
function formatQuito(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Guayaquil',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(d).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

function maskPhone(phone) {
  const p = String(phone || '');
  return p.length >= 6 ? `${p.slice(0, 2)}${'*'.repeat(p.length - 4)}${p.slice(-2)}` : '';
}

// POST /api/kiosk/register  — lo llama el celular tras el formulario
async function registerParticipant(req, res) {
  const { name, email: rawEmail, phone: rawPhone, device_id = 'unknown' } = req.body || {};

  if (!name || String(name).trim().length < 3) {
    return sendError(res, 400, 'INVALID_NAME', 'Por favor ingresa tu nombre y apellido completos.');
  }
  const phoneValidation = validateAndFormatEcuadorPhone(rawPhone);
  if (!phoneValidation.valid) return sendError(res, 400, 'INVALID_PHONE', phoneValidation.message);
  const emailValidation = validateEmail(rawEmail);
  if (!emailValidation.valid) return sendError(res, 400, 'INVALID_EMAIL', emailValidation.message);

  const cleanName = String(name).trim().slice(0, 150);
  const cleanPhone = phoneValidation.phone;
  const cleanEmail = emailValidation.email;
  const lockName = `kiosk_register_${KIOSK_SCREEN_ID}`;

  const conn = await pool.getConnection();
  let lockAcquired = false;
  try {
    const [[lockRow]] = await conn.query('SELECT GET_LOCK(?, 5) AS got', [lockName]);
    lockAcquired = Boolean(lockRow && lockRow.got === 1);
    if (!lockAcquired) return sendError(res, 429, 'KIOSK_BUSY', 'El kiosco está ocupado, intenta en unos segundos.');

    await advanceSessions(conn);

    const [testUsers] = await conn.query(
      'SELECT id FROM test_users WHERE active = TRUE AND (phone = ? OR email = ?)',
      [cleanPhone, cleanEmail]
    );
    const isTestUser = testUsers.length > 0;

    // ¿Ya jugó en el kiosco? Se le muestra su premio anterior y NO se activa el botón
    if (!isTestUser) {
      const [previous] = await conn.query(
        `SELECT s.ticket_code, l.name AS lead_name,
                p.id AS prize_id, p.name AS prize_name, p.description AS prize_description, p.category AS prize_category, p.icon AS prize_icon,
                s.created_at AS played_at
         FROM leads l
         JOIN spins s ON s.lead_id = l.id
         JOIN prizes p ON p.id = s.prize_id
         WHERE (l.phone = ? OR l.email = ?) AND l.screen_id IN (?)
         ORDER BY s.id DESC LIMIT 1`,
        [cleanPhone, cleanEmail, screenIdsOf('kiosk')]
      );
      if (previous.length > 0) {
        const prev = previous[0];
        return res.json({
          success: true,
          already_played: true,
          message: '¡Ya participaste en este kiosco! Aquí tienes tu ticket.',
          data: ticketPayload({
            id: null,
            ticket_code: prev.ticket_code,
            lead_name: prev.lead_name,
            played_at: prev.played_at,
            prize_id: prev.prize_id,
            prize_name: prev.prize_name,
            prize_description: prev.prize_description,
            prize_category: prev.prize_category,
            prize_icon: prev.prize_icon
          })
        });
      }
    }

    // Un solo jugador por turno: si hay una sesión activa se pide esperar
    const active = await findActiveSession(conn);
    if (active) {
      return sendError(res, 409, 'KIOSK_BUSY', 'El kiosco está ocupado con otro participante. Espera unos segundos e inténtalo de nuevo.', {
        retryAfterSeconds: active.status === 'REGISTERED' ? Math.max(Number(active.seconds_left) || 5, 5) : 15
      });
    }

    await conn.beginTransaction();

    // Reutiliza el lead si ya se registró antes en el kiosco sin llegar a jugar (evita duplicados)
    let leadId;
    const [existingLead] = await conn.query(
      `SELECT l.id FROM leads l
       WHERE (l.phone = ? OR l.email = ?) AND l.screen_id IN (?)
         AND NOT EXISTS (SELECT 1 FROM spins s WHERE s.lead_id = l.id)
       ORDER BY l.id DESC LIMIT 1`,
      [cleanPhone, cleanEmail, screenIdsOf('kiosk')]
    );
    if (existingLead.length > 0) {
      leadId = existingLead[0].id;
      await conn.query('UPDATE leads SET name = ?, phone = ?, email = ?, device_id = ?, is_test = ? WHERE id = ?',
        [cleanName, cleanPhone, cleanEmail, device_id, isTestUser ? 1 : 0, leadId]);
    } else {
      const [leadResult] = await conn.query(
        `INSERT INTO leads (name, email, phone, dream_destination, screen_id, device_id, ip_address, user_agent, is_test)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [cleanName, cleanEmail, cleanPhone, KIOSK_DESTINATION, KIOSK_SCREEN_ID, device_id, req.ip, req.headers['user-agent'], isTestUser ? 1 : 0]
      );
      leadId = leadResult.insertId;
    }

    const phoneToken = crypto.randomBytes(18).toString('hex');
    const [sessionResult] = await conn.query(
      `INSERT INTO kiosk_sessions (screen_id, lead_id, status, phone_token, is_test, expires_at)
       VALUES (?, ?, 'REGISTERED', ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))`,
      [KIOSK_SCREEN_ID, leadId, phoneToken, isTestUser ? 1 : 0, REGISTER_TTL_SEC]
    );
    await conn.commit();

    return res.json({
      success: true,
      already_played: false,
      data: {
        sessionId: sessionResult.insertId,
        token: phoneToken,
        expiresInSeconds: REGISTER_TTL_SEC
      }
    });
  } catch (error) {
    await conn.rollback().catch(() => {});
    console.error('[Kiosk] Error registrando participante:', error);
    return sendError(res, 500, 'KIOSK_ERROR', 'Ocurrió un error al registrarte. Intenta de nuevo.');
  } finally {
    if (lockAcquired) await conn.query('SELECT RELEASE_LOCK(?)', [lockName]).catch(() => {});
    conn.release();
  }
}

// GET /api/kiosk/state
//   - Pantalla del botón (clave de kiosco): estado completo + datos de impresión cuando toca imprimir
//   - Celular (session + token): su propio estado y, al revelarse, su premio
async function getState(req, res) {
  const conn = await pool.getConnection();
  try {
    await advanceSessions(conn);
    res.set('Cache-Control', 'no-store');

    const sessionParam = Number(req.query.session) || 0;
    const tokenParam = String(req.query.token || '');

    // ---- Celular ----
    if (sessionParam && tokenParam) {
      const [rows] = await conn.query(`${SESSION_SELECT} WHERE ks.id = ? AND ks.screen_id = ?`, [sessionParam, KIOSK_SCREEN_ID]);
      const row = rows[0];
      const stored = row ? Buffer.from(row.phone_token) : null;
      const given = Buffer.from(tokenParam);
      if (!row || stored.length !== given.length || !crypto.timingSafeEqual(stored, given)) {
        return sendError(res, 404, 'SESSION_NOT_FOUND', 'Sesión no encontrada.');
      }
      const out = { success: true, status: row.status, secondsLeft: Number(row.seconds_left) || 0 };
      if (row.status === 'REVEALED' || row.status === 'DONE') out.data = ticketPayload(row);
      return res.json(out);
    }

    // ---- Pantalla del botón ----
    if (isKioskKeyValid(req)) {
      const active = await findActiveSession(conn);
      const out = { success: true, status: active ? active.status : 'IDLE', session: null, print: null, reprint: null };
      if (active) {
        out.session = {
          id: active.id,
          leadName: active.lead_name,
          phoneMasked: maskPhone(active.lead_phone),
          secondsLeft: Number(active.seconds_left) || 0,
          isTest: Boolean(active.is_test)
        };
        // Datos para imprimir: solo cuando el premio ya se reveló y aún no se confirmó la impresión
        if (active.status === 'REVEALED' && !active.print_status) out.print = ticketPayload(active);
      }

      // Reimpresión pedida desde el admin
      const [reprintRows] = await conn.query(
        `${SESSION_SELECT} WHERE ks.screen_id = ? AND ks.print_status = 'REPRINT' ORDER BY ks.id DESC LIMIT 1`,
        [KIOSK_SCREEN_ID]
      );
      if (reprintRows[0]) out.reprint = ticketPayload(reprintRows[0]);

      return res.json(out);
    }

    // ---- Público: solo si el kiosco está libre u ocupado (sin datos personales) ----
    const active = await findActiveSession(conn);
    return res.json({ success: true, status: active ? 'BUSY' : 'IDLE' });
  } catch (error) {
    console.error('[Kiosk] Error consultando estado:', error);
    return sendError(res, 500, 'KIOSK_ERROR', 'Error consultando el estado del kiosco.');
  } finally {
    conn.release();
  }
}

// POST /api/kiosk/start  — lo llama el botón JUGAR AHORA (pantalla de abajo)
async function startSpin(req, res) {
  const lockName = `kiosk_register_${KIOSK_SCREEN_ID}`;
  const conn = await pool.getConnection();
  let lockAcquired = false;
  try {
    const [[lockRow]] = await conn.query('SELECT GET_LOCK(?, 5) AS got', [lockName]);
    lockAcquired = Boolean(lockRow && lockRow.got === 1);
    if (!lockAcquired) return sendError(res, 429, 'KIOSK_BUSY', 'Procesando, intenta de nuevo.');

    await advanceSessions(conn);
    const active = await findActiveSession(conn);
    if (!active || active.status !== 'REGISTERED') {
      return sendError(res, 409, 'NO_REGISTERED_SESSION', 'No hay un participante registrado esperando jugar.');
    }

    await conn.beginTransaction();

    const [prizes] = await conn.query(
      `SELECT id, name, description, category, color_hex, text_color, icon, weight, stock, max_daily_wins, active
       FROM prizes WHERE active = 1 AND stand = 'kiosk' ORDER BY id ASC FOR UPDATE`
    );
    if (prizes.length === 0) {
      await conn.rollback();
      return sendError(res, 400, 'NO_PRIZES', 'No hay premios disponibles en el kiosco.');
    }

    const [todaySpins] = await conn.query(
      'SELECT prize_id, COUNT(*) AS count_today FROM spins WHERE DATE(created_at) = CURDATE() GROUP BY prize_id'
    );
    const todayPrizesMap = {};
    todaySpins.forEach((row) => { todayPrizesMap[row.prize_id] = row.count_today; });

    const winningPrize = selectWeightedPrize(prizes, todayPrizesMap);
    const winningIndex = prizes.findIndex((p) => p.id === winningPrize.id);
    const isTest = Boolean(active.is_test);

    const [[sessionLead]] = await conn.query('SELECT lead_id FROM kiosk_sessions WHERE id = ?', [active.id]);

    // Ticket único (reintenta ante una colisión improbable del código aleatorio)
    let ticketCode = null;
    for (let attempt = 0; attempt < 8 && !ticketCode; attempt += 1) {
      const candidate = generateTicketCode();
      const [dup] = await conn.query('SELECT 1 FROM spins WHERE ticket_code = ? LIMIT 1', [candidate]);
      if (dup.length === 0) ticketCode = candidate;
    }
    if (!ticketCode) {
      await conn.rollback();
      return sendError(res, 500, 'KIOSK_ERROR', 'No se pudo generar el ticket. Intenta de nuevo.');
    }

    await conn.query(
      'INSERT INTO spins (lead_id, prize_id, ticket_code, screen_id, is_test) VALUES (?, ?, ?, ?, ?)',
      [sessionLead.lead_id, winningPrize.id, ticketCode, KIOSK_SCREEN_ID, isTest ? 1 : 0]
    );
    if (!isTest) {
      await conn.query('UPDATE prizes SET stock = GREATEST(stock - 1, 0) WHERE id = ?', [winningPrize.id]);
    }

    // Misma fila que usa la pantalla de arriba (/api/spin/latest) para animar la ruleta
    await conn.query(
      `UPDATE spin_queue SET status = 'EXPIRED', completed_at = NOW() WHERE screen_id = ? AND status IN ('SPINNING','WAITING')`,
      [KIOSK_SCREEN_ID]
    );
    await conn.query(
      `INSERT INTO spin_queue (lead_id, prize_id, ticket_code, screen_id, status, started_at)
       VALUES (?, ?, ?, ?, 'SPINNING', NOW())`,
      [sessionLead.lead_id, winningPrize.id, ticketCode, KIOSK_SCREEN_ID]
    );

    await conn.query(
      `UPDATE kiosk_sessions SET status = 'SPINNING', prize_id = ?, ticket_code = ?, started_at = NOW() WHERE id = ?`,
      [winningPrize.id, ticketCode, active.id]
    );
    await conn.commit();

    // Local/WebSocket (opcional): en producción la pantalla de arriba lo recoge por polling
    if (req.io) {
      req.io.to(KIOSK_SCREEN_ID).emit('TRIGGER_SPIN', {
        screenId: KIOSK_SCREEN_ID,
        leadName: active.lead_name,
        prize: winningPrize,
        sliceIndex: winningIndex,
        totalSlices: prizes.length,
        ticketCode,
        destination: KIOSK_DESTINATION
      });
    }

    return res.json({ success: true, data: { sessionId: active.id, revealInSeconds: REVEAL_AFTER_SEC } });
  } catch (error) {
    await conn.rollback().catch(() => {});
    console.error('[Kiosk] Error iniciando el giro:', error);
    return sendError(res, 500, 'KIOSK_ERROR', 'Ocurrió un error al iniciar el giro.');
  } finally {
    if (lockAcquired) await conn.query('SELECT RELEASE_LOCK(?)', [lockName]).catch(() => {});
    conn.release();
  }
}

// POST /api/kiosk/revealed  — la pantalla de arriba avisa que la ruleta ya se detuvo y mostró el premio (lazo cerrado)
async function markRevealed(req, res) {
  const ticketCode = String((req.body && req.body.ticket_code) || '').trim().toUpperCase();
  if (!ticketCode) return sendError(res, 400, 'INVALID_TICKET', 'Falta ticket_code.');
  try {
    // Solo avanza una sesión que está girando (y no antes de 4 s desde el inicio: evita adelantos por error)
    await pool.query(
      `UPDATE kiosk_sessions SET status = 'REVEALED', revealed_at = NOW()
       WHERE screen_id = ? AND ticket_code = ? AND status = 'SPINNING' AND started_at < DATE_SUB(NOW(), INTERVAL 4 SECOND)`,
      [KIOSK_SCREEN_ID, ticketCode]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[Kiosk] Error marcando revelación:', error);
    return sendError(res, 500, 'KIOSK_ERROR', 'Error registrando la revelación.');
  }
}

// POST /api/kiosk/printed  — la pantalla del botón informa el resultado de la impresión
async function reportPrinted(req, res) {
  const sessionId = Number(req.body && req.body.session_id) || 0;
  const ok = Boolean(req.body && req.body.ok);
  if (!sessionId) return sendError(res, 400, 'INVALID_SESSION', 'Falta session_id.');
  const printStatus = ok ? 'OK' : 'FAILED';
  try {
    // Una reimpresión (print_status = 'REPRINT') solo actualiza el resultado
    const [reprint] = await pool.query(
      `UPDATE kiosk_sessions SET print_status = ? WHERE id = ? AND screen_id = ? AND print_status = 'REPRINT'`,
      [printStatus, sessionId, KIOSK_SCREEN_ID]
    );
    if (reprint.affectedRows === 0) {
      // Impresión normal: libera el kiosco para el siguiente participante
      await pool.query(
        `UPDATE kiosk_sessions SET print_status = ?, status = 'DONE', finished_at = NOW()
         WHERE id = ? AND screen_id = ? AND status IN ('REVEALED','SPINNING')`,
        [printStatus, sessionId, KIOSK_SCREEN_ID]
      );
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('[Kiosk] Error registrando la impresión:', error);
    return sendError(res, 500, 'KIOSK_ERROR', 'Error registrando la impresión.');
  }
}

// POST /api/admin/kiosk/reprint/:code  — el admin pide reimprimir un ticket (la pantalla del botón lo recoge por polling)
async function requestReprint(req, res) {
  const code = String(req.params.code || '').trim().toUpperCase();
  try {
    const [result] = await pool.query(
      `UPDATE kiosk_sessions SET print_status = 'REPRINT' WHERE screen_id = ? AND ticket_code = ? AND status IN ('REVEALED','DONE')`,
      [KIOSK_SCREEN_ID, code]
    );
    if (result.affectedRows === 0) {
      return sendError(res, 404, 'TICKET_NOT_FOUND', 'No se encontró un ticket del kiosco con ese código.');
    }
    return res.json({ success: true, message: 'Reimpresión solicitada. Saldrá en la impresora del kiosco en unos segundos.' });
  } catch (error) {
    console.error('[Kiosk] Error solicitando reimpresión:', error);
    return sendError(res, 500, 'KIOSK_ERROR', 'Error solicitando la reimpresión.');
  }
}

module.exports = {
  KIOSK_SCREEN_ID,
  requireKioskKey,
  registerParticipant,
  getState,
  startSpin,
  markRevealed,
  reportPrinted,
  requestReprint
};
