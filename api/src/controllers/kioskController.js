/**
 * Kiosco de 2 pantallas (stand 'kiosk', screen_id KIOSK_01; ferias: RIO_KIOSK y AMB_KIOSK).
 * El kiosco concreto se indica con `screen_id` (query o cuerpo); sin él, KIOSK_01 (comportamiento histórico).
 * Cada kiosco tiene su clave (config.SECURITY.kioskKeys), su catálogo de premios (el de su ciudad, compartido con
 * pantalla y correo) y, en las ferias, su regla de una participación por ciudad y su hora de cierre.
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
const { STANDS, standFromScreenId, prizePoolOf, eventOf, screenIdsOfEvent } = require('../config/stands');
const { getEventInfo, isEventClosed, publicEventInfo } = require('../config/events');

const KIOSK_SCREEN_ID = 'KIOSK_01'; // kiosco histórico (valor por defecto cuando la petición no indica screen_id)
const REGISTER_TTL_SEC = 120;   // el botón se bloquea de nuevo si no se pulsa en 2 minutos
const REVEAL_AFTER_SEC = 25;    // RESPALDO: normalmente la pantalla de arriba avisa (POST /revealed) cuando la ruleta se detiene
const REVEAL_HOLD_SEC = 25;     // tras revelar, el kiosco se libera solo si la impresión no confirma
const KIOSK_DESTINATION = 'Kiosco';

function sendError(res, status, code, message, extra = {}) {
  return res.status(status).json({ success: false, code, message, ...extra });
}

/**
 * Kiosco de la petición: screen_id (query o cuerpo) validado contra el registro (debe ser un stand de tipo kiosco).
 * Devuelve { screenId, stand, event, pool, eventInfo, destination } o null si el screen_id no es un kiosco.
 */
function resolveKiosk(req) {
  const raw = String((req.query && req.query.screen_id) || (req.body && req.body.screen_id) || KIOSK_SCREEN_ID).trim().toUpperCase();
  const standKey = standFromScreenId(raw);
  if (!standKey || !STANDS[standKey] || STANDS[standKey].front !== 'kiosk') return null;
  const event = eventOf(standKey);
  const eventInfo = getEventInfo(event);
  return {
    screenId: raw,
    stand: standKey,
    event,
    pool: prizePoolOf(standKey),
    eventInfo,
    destination: eventInfo ? `Feria ${eventInfo.city} · Kiosco` : KIOSK_DESTINATION
  };
}

function keyMatches(req, screenId) {
  const expected = config.SECURITY.kioskKeys[screenId];
  if (!expected) return false;
  const provided = String(req.headers['x-kiosk-key'] || (req.query && req.query.k) || '');
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Protege las rutas de la pantalla del botón (iniciar giro, confirmar impresión) con la clave de ESE kiosco. */
function requireKioskKey(req, res, next) {
  const kiosk = resolveKiosk(req);
  if (!kiosk) return sendError(res, 400, 'INVALID_KIOSK', 'Kiosco no válido.');
  if (!config.SECURITY.kioskKeys[kiosk.screenId]) {
    return sendError(res, 503, 'KIOSK_NOT_CONFIGURED', 'El kiosco no está configurado (falta su clave).');
  }
  if (!keyMatches(req, kiosk.screenId)) {
    return sendError(res, 401, 'KIOSK_UNAUTHORIZED', 'Clave de kiosco no válida.');
  }
  req.kiosk = kiosk;
  next();
}

/** screen_id de todos los kioscos del registro (histórico + ferias). */
function kioskScreenIds() {
  return Object.values(STANDS).filter((st) => st.front === 'kiosk').flatMap((st) => st.screenIds);
}

function isKioskKeyValid(req, screenId) {
  return keyMatches(req, screenId);
}

/** Transiciones por tiempo (idempotentes y seguras ante peticiones concurrentes). */
async function advanceSessions(conn, screenId) {
  await conn.query(
    `UPDATE kiosk_sessions SET status = 'EXPIRED', finished_at = NOW()
     WHERE screen_id = ? AND status = 'REGISTERED' AND expires_at < NOW()`,
    [screenId]
  );
  await conn.query(
    `UPDATE kiosk_sessions SET status = 'REVEALED', revealed_at = NOW()
     WHERE screen_id = ? AND status = 'SPINNING' AND started_at < DATE_SUB(NOW(), INTERVAL ? SECOND)`,
    [screenId, REVEAL_AFTER_SEC]
  );
  await conn.query(
    `UPDATE kiosk_sessions SET status = 'DONE', finished_at = NOW(), print_status = COALESCE(print_status, 'TIMEOUT')
     WHERE screen_id = ? AND status = 'REVEALED' AND revealed_at < DATE_SUB(NOW(), INTERVAL ? SECOND)`,
    [screenId, REVEAL_HOLD_SEC]
  );
}

const SESSION_SELECT = `
  SELECT ks.id, ks.screen_id, ks.status, ks.phone_token, ks.ticket_code, ks.is_test, ks.print_status,
         ks.created_at, ks.expires_at, ks.started_at, ks.revealed_at,
         GREATEST(TIMESTAMPDIFF(SECOND, NOW(), ks.expires_at), 0) AS seconds_left,
         l.name AS lead_name, l.phone AS lead_phone,
         p.id AS prize_id, p.name AS prize_name, p.description AS prize_description,
         p.category AS prize_category, p.icon AS prize_icon,
         COALESCE(ks.revealed_at, ks.started_at, ks.created_at) AS played_at
  FROM kiosk_sessions ks
  JOIN leads l ON l.id = ks.lead_id
  LEFT JOIN prizes p ON p.id = ks.prize_id`;

async function findActiveSession(conn, screenId) {
  const [rows] = await conn.query(
    `${SESSION_SELECT} WHERE ks.screen_id = ? AND ks.status IN ('REGISTERED','SPINNING','REVEALED') ORDER BY ks.id DESC LIMIT 1`,
    [screenId]
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
    // Ferias: nombre, lugar, fechas y stand para el ticket del celular y la impresión (null en el kiosco histórico)
    event: publicEventInfo(eventOf(standFromScreenId(row.screen_id) || 'kiosk')),
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
  const kiosk = resolveKiosk(req);
  if (!kiosk) return sendError(res, 400, 'INVALID_KIOSK', 'Kiosco no válido.');
  const KIOSK_ID = kiosk.screenId;

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
  const lockName = `kiosk_register_${KIOSK_ID}`;

  const conn = await pool.getConnection();
  let lockAcquired = false;
  try {
    const [[lockRow]] = await conn.query('SELECT GET_LOCK(?, 5) AS got', [lockName]);
    lockAcquired = Boolean(lockRow && lockRow.got === 1);
    if (!lockAcquired) return sendError(res, 429, 'KIOSK_BUSY', 'El kiosco está ocupado, intenta en unos segundos.');

    await advanceSessions(conn, KIOSK_ID);

    const [testUsers] = await conn.query(
      'SELECT id FROM test_users WHERE active = TRUE AND (phone = ? OR email = ?)',
      [cleanPhone, cleanEmail]
    );
    const isTestUser = testUsers.length > 0;

    // ¿Ya jugó? Se le muestra su premio anterior y NO se activa el botón. En las ferias cuenta CUALQUIER frente de la
    // ciudad (pantalla, kiosco o correo): una participación por ciudad. El kiosco histórico solo mira su propio screen_id.
    if (!isTestUser) {
      const [previous] = await conn.query(
        `SELECT s.ticket_code, l.name AS lead_name, l.screen_id AS lead_screen_id,
                p.id AS prize_id, p.name AS prize_name, p.description AS prize_description, p.category AS prize_category, p.icon AS prize_icon,
                s.created_at AS played_at
         FROM leads l
         JOIN spins s ON s.lead_id = l.id
         JOIN prizes p ON p.id = s.prize_id
         WHERE (l.phone = ? OR l.email = ?) AND l.screen_id IN (?)
         ORDER BY s.id DESC LIMIT 1`,
        [cleanPhone, cleanEmail, screenIdsOfEvent(kiosk.event)]
      );
      if (previous.length > 0) {
        const prev = previous[0];
        return res.json({
          success: true,
          already_played: true,
          message: kiosk.eventInfo ? '¡Ya participaste en esta feria! Aquí tienes tu ticket.' : '¡Ya participaste en este kiosco! Aquí tienes tu ticket.',
          data: ticketPayload({
            id: null,
            screen_id: prev.lead_screen_id,
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

    // Feria cerrada (domingo 15-nov 22:00 hora Ecuador): no se aceptan registros nuevos (usuarios de prueba sí)
    if (!isTestUser && isEventClosed(kiosk.event)) {
      return sendError(res, 403, 'EVENT_CLOSED', 'La feria ya terminó. ¡Gracias por participar!', { event: publicEventInfo(kiosk.event) });
    }

    // Un solo jugador por turno: si hay una sesión activa se pide esperar
    const active = await findActiveSession(conn, KIOSK_ID);
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
       WHERE (l.phone = ? OR l.email = ?) AND l.screen_id = ?
         AND NOT EXISTS (SELECT 1 FROM spins s WHERE s.lead_id = l.id)
       ORDER BY l.id DESC LIMIT 1`,
      [cleanPhone, cleanEmail, KIOSK_ID]
    );
    if (existingLead.length > 0) {
      leadId = existingLead[0].id;
      await conn.query('UPDATE leads SET name = ?, phone = ?, email = ?, device_id = ?, is_test = ? WHERE id = ?',
        [cleanName, cleanPhone, cleanEmail, device_id, isTestUser ? 1 : 0, leadId]);
    } else {
      const [leadResult] = await conn.query(
        `INSERT INTO leads (name, email, phone, dream_destination, screen_id, device_id, ip_address, user_agent, is_test)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [cleanName, cleanEmail, cleanPhone, kiosk.destination, KIOSK_ID, device_id, req.ip, req.headers['user-agent'], isTestUser ? 1 : 0]
      );
      leadId = leadResult.insertId;
    }

    const phoneToken = crypto.randomBytes(18).toString('hex');
    const [sessionResult] = await conn.query(
      `INSERT INTO kiosk_sessions (screen_id, lead_id, status, phone_token, is_test, expires_at)
       VALUES (?, ?, 'REGISTERED', ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))`,
      [KIOSK_ID, leadId, phoneToken, isTestUser ? 1 : 0, REGISTER_TTL_SEC]
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
//   - Pantalla del botón (clave de ESE kiosco + screen_id): estado completo + datos de impresión cuando toca imprimir
//   - Celular (session + token): su propio estado y, al revelarse, su premio
async function getState(req, res) {
  const kiosk = resolveKiosk(req);
  if (!kiosk) return sendError(res, 400, 'INVALID_KIOSK', 'Kiosco no válido.');
  const conn = await pool.getConnection();
  try {
    res.set('Cache-Control', 'no-store');

    const sessionParam = Number(req.query.session) || 0;
    const tokenParam = String(req.query.token || '');

    // ---- Celular ---- (la sesión y su token identifican el kiosco; no hace falta screen_id)
    if (sessionParam && tokenParam) {
      const [owner] = await conn.query('SELECT screen_id FROM kiosk_sessions WHERE id = ?', [sessionParam]);
      if (owner[0]) await advanceSessions(conn, owner[0].screen_id);
      const [rows] = await conn.query(`${SESSION_SELECT} WHERE ks.id = ?`, [sessionParam]);
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

    await advanceSessions(conn, kiosk.screenId);

    // ---- Pantalla del botón ----
    if (isKioskKeyValid(req, kiosk.screenId)) {
      const active = await findActiveSession(conn, kiosk.screenId);
      const out = { success: true, status: active ? active.status : 'IDLE', session: null, print: null, reprint: null, event: publicEventInfo(kiosk.event) };
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
        [kiosk.screenId]
      );
      if (reprintRows[0]) out.reprint = ticketPayload(reprintRows[0]);

      return res.json(out);
    }

    // ---- Público: solo si el kiosco está libre u ocupado (sin datos personales) ----
    const active = await findActiveSession(conn, kiosk.screenId);
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
  const kiosk = req.kiosk || resolveKiosk(req); // requireKioskKey ya lo resolvió
  const KIOSK_ID = kiosk.screenId;
  const lockName = `kiosk_register_${KIOSK_ID}`;
  const conn = await pool.getConnection();
  let lockAcquired = false;
  try {
    const [[lockRow]] = await conn.query('SELECT GET_LOCK(?, 5) AS got', [lockName]);
    lockAcquired = Boolean(lockRow && lockRow.got === 1);
    if (!lockAcquired) return sendError(res, 429, 'KIOSK_BUSY', 'Procesando, intenta de nuevo.');

    await advanceSessions(conn, KIOSK_ID);
    const active = await findActiveSession(conn, KIOSK_ID);
    if (!active || active.status !== 'REGISTERED') {
      return sendError(res, 409, 'NO_REGISTERED_SESSION', 'No hay un participante registrado esperando jugar.');
    }

    await conn.beginTransaction();

    const [prizes] = await conn.query(
      `SELECT id, name, description, category, color_hex, text_color, icon, weight, stock, max_daily_wins, active
       FROM prizes WHERE active = 1 AND stand = ? ORDER BY id ASC FOR UPDATE`,
      [kiosk.pool] // catálogo del kiosco; en las ferias, el de la ciudad (compartido con pantalla y correo)
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
      [sessionLead.lead_id, winningPrize.id, ticketCode, KIOSK_ID, isTest ? 1 : 0]
    );
    if (!isTest) {
      await conn.query('UPDATE prizes SET stock = GREATEST(stock - 1, 0) WHERE id = ?', [winningPrize.id]);
    }

    // Misma fila que usa la pantalla de arriba (/api/spin/latest) para animar la ruleta
    await conn.query(
      `UPDATE spin_queue SET status = 'EXPIRED', completed_at = NOW() WHERE screen_id = ? AND status IN ('SPINNING','WAITING')`,
      [KIOSK_ID]
    );
    await conn.query(
      `INSERT INTO spin_queue (lead_id, prize_id, ticket_code, screen_id, status, started_at)
       VALUES (?, ?, ?, ?, 'SPINNING', NOW())`,
      [sessionLead.lead_id, winningPrize.id, ticketCode, KIOSK_ID]
    );

    await conn.query(
      `UPDATE kiosk_sessions SET status = 'SPINNING', prize_id = ?, ticket_code = ?, started_at = NOW() WHERE id = ?`,
      [winningPrize.id, ticketCode, active.id]
    );
    await conn.commit();

    // Local/WebSocket (opcional): en producción la pantalla de arriba lo recoge por polling
    if (req.io) {
      req.io.to(KIOSK_ID).emit('TRIGGER_SPIN', {
        screenId: KIOSK_ID,
        leadName: active.lead_name,
        prize: winningPrize,
        sliceIndex: winningIndex,
        totalSlices: prizes.length,
        ticketCode,
        destination: kiosk.destination
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
       WHERE ticket_code = ? AND status = 'SPINNING' AND started_at < DATE_SUB(NOW(), INTERVAL 4 SECOND)`,
      [ticketCode]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[Kiosk] Error marcando revelación:', error);
    return sendError(res, 500, 'KIOSK_ERROR', 'Error registrando la revelación.');
  }
}

// POST /api/kiosk/printed  — la pantalla del botón informa el resultado de la impresión
async function reportPrinted(req, res) {
  const KIOSK_ID = (req.kiosk || resolveKiosk(req)).screenId;
  const sessionId = Number(req.body && req.body.session_id) || 0;
  const ok = Boolean(req.body && req.body.ok);
  if (!sessionId) return sendError(res, 400, 'INVALID_SESSION', 'Falta session_id.');
  const printStatus = ok ? 'OK' : 'FAILED';
  try {
    // Una reimpresión (print_status = 'REPRINT') solo actualiza el resultado
    const [reprint] = await pool.query(
      `UPDATE kiosk_sessions SET print_status = ? WHERE id = ? AND screen_id = ? AND print_status = 'REPRINT'`,
      [printStatus, sessionId, KIOSK_ID]
    );
    if (reprint.affectedRows === 0) {
      // Impresión normal: libera el kiosco para el siguiente participante
      await pool.query(
        `UPDATE kiosk_sessions SET print_status = ?, status = 'DONE', finished_at = NOW()
         WHERE id = ? AND screen_id = ? AND status IN ('REVEALED','SPINNING')`,
        [printStatus, sessionId, KIOSK_ID]
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
      `UPDATE kiosk_sessions SET print_status = 'REPRINT' WHERE screen_id IN (?) AND ticket_code = ? AND status IN ('REVEALED','DONE')`,
      [kioskScreenIds(), code]
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
