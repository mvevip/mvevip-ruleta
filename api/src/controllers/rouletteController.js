const { pool } = require('../config/db');
const {
  validateAndFormatEcuadorPhone,
  validateEmail,
  selectWeightedPrize,
  generateTicketCode
} = require('../services/rouletteLogic');
const config = require('../config/env');

// Obtener lista de premios activos para la ruleta visual
async function getPrizes(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, description, category, color_hex, text_color, weight, stock, max_daily_wins FROM prizes WHERE active = 1 ORDER BY id ASC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error al obtener premios:', error);
    res.status(500).json({ success: false, message: 'Error interno al consultar premios' });
  }
}

// Obtener lista completa de premios para el Panel Administrativo (con % de probabilidad)
async function getAdminPrizes(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, description, category, color_hex, text_color, weight, stock, max_daily_wins, active, created_at FROM prizes ORDER BY id ASC'
    );

    // Calcular suma total de pesos de premios activos con stock
    const totalActiveWeight = rows
      .filter(p => p.active && p.stock > 0)
      .reduce((sum, p) => sum + (Number(p.weight) || 0), 0);

    const enriched = rows.map(p => {
      const isEligible = p.active && p.stock > 0;
      const pct = (isEligible && totalActiveWeight > 0)
        ? ((Number(p.weight) / totalActiveWeight) * 100).toFixed(2)
        : '0.00';
      return {
        ...p,
        probability_percentage: Number(pct)
      };
    });

    res.json({ success: true, totalActiveWeight, data: enriched });
  } catch (error) {
    console.error('Error al obtener premios para admin:', error);
    res.status(500).json({ success: false, message: 'Error al consultar premios administrativos' });
  }
}

// Crear nuevo premio (Admin)
async function createPrize(req, res) {
  const { name, description, category = 'DESCUENTO', color_hex = '#DC2626', text_color = '#FFFFFF', weight = 100, stock = 100, max_daily_wins = 0 } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'El nombre del premio es obligatorio.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO prizes (name, description, category, color_hex, text_color, weight, stock, max_daily_wins, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [name, description || '', category, color_hex, text_color, Number(weight), Number(stock), Number(max_daily_wins)]
    );
    res.json({ success: true, message: 'Premio creado exitosamente', id: result.insertId });
  } catch (error) {
    console.error('Error creando premio:', error);
    res.status(500).json({ success: false, message: 'Error al crear premio' });
  }
}

// Actualizar premio existente (Admin)
async function updatePrize(req, res) {
  const { id } = req.params;
  const { name, description, category, color_hex, text_color, weight, stock, max_daily_wins, active } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE prizes SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        color_hex = COALESCE(?, color_hex),
        text_color = COALESCE(?, text_color),
        weight = COALESCE(?, weight),
        stock = COALESCE(?, stock),
        max_daily_wins = COALESCE(?, max_daily_wins),
        active = COALESCE(?, active)
       WHERE id = ?`,
      [name, description, category, color_hex, text_color, weight, stock, max_daily_wins, active, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Premio no encontrado' });
    }

    res.json({ success: true, message: 'Premio actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando premio:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar premio' });
  }
}

// Procesar tiro de ruleta con validaciones estrictas y control de duplicados
async function processSpin(req, res) {
  const {
    name,
    email: rawEmail,
    phone: rawPhone,
    dream_destination = '🌴 Cancún',
    screen_id = 'STAND_01',
    device_id = 'unknown'
  } = req.body;

  // 1. Validar nombre
  if (!name || name.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Por favor ingresa tu nombre y apellido completos.'
    });
  }

  // 2. Validar celular formato Ecuador (10 dígitos empezando con 09)
  const phoneValidation = validateAndFormatEcuadorPhone(rawPhone);
  if (!phoneValidation.valid) {
    return res.status(400).json({
      success: false,
      message: phoneValidation.message
    });
  }
  const cleanPhone = phoneValidation.phone;

  // 3. Validar email formato válido
  const emailValidation = validateEmail(rawEmail);
  if (!emailValidation.valid) {
    return res.status(400).json({
      success: false,
      message: emailValidation.message
    });
  }
  const cleanEmail = emailValidation.email;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 4. VERIFICAR SI EL LEAD YA PARTICIPÓ Y TIENE PREMIO
    const [existingSpins] = await connection.query(
      `SELECT s.id AS spin_id, s.ticket_code, s.redeemed, s.created_at,
              l.id AS lead_id, l.name AS lead_name, l.phone AS lead_phone, l.dream_destination,
              p.id AS prize_id, p.name AS prize_name, p.description AS prize_description, p.category AS prize_category
       FROM leads l
       JOIN spins s ON s.lead_id = l.id
       JOIN prizes p ON s.prize_id = p.id
       WHERE l.phone = ? OR l.email = ?
       ORDER BY s.id DESC LIMIT 1`,
      [cleanPhone, cleanEmail]
    );

    if (existingSpins.length > 0) {
      await connection.rollback();
      const prev = existingSpins[0];

      // Construir mensaje de WhatsApp para el premio existente
      const rawWaNumber = config.COMPANY.whatsapp.replace(/[^0-9]/g, '');
      const waText = encodeURIComponent(
        `¡Hola ${config.COMPANY.name}! Ya participé en la ruleta de la Feria de Autos 🏎️\n\n` +
        `👤 Nombre: ${prev.lead_name}\n` +
        `🎟️ Código VIP: ${prev.ticket_code}\n` +
        `🎁 Premio: ${prev.prize_name}\n` +
        `🌴 Destino: ${prev.dream_destination}\n\n` +
        `¡Quiero consultar cómo canjear mi premio!`
      );
      const whatsappUrl = `https://wa.me/${rawWaNumber}?text=${waText}`;

      return res.json({
        success: true,
        already_played: true,
        message: '¡Ya registraste tu participación previamente!',
        data: {
          ticketCode: prev.ticket_code,
          winner: {
            id: prev.prize_id,
            name: prev.prize_name,
            description: prev.prize_description,
            category: prev.prize_category
          },
          lead: {
            name: prev.lead_name,
            phone: prev.lead_phone,
            dream_destination: prev.dream_destination
          },
          whatsappUrl,
          redeemed: Boolean(prev.redeemed)
        }
      });
    }

    // 5. Verificar cuántos leads se han registrado con este mismo device_id (Auditoría)
    const [[deviceCheck]] = await connection.query(
      'SELECT COUNT(*) AS count_device FROM leads WHERE device_id = ? AND device_id != "unknown"',
      [device_id]
    );
    const leadsFromThisDevice = deviceCheck ? deviceCheck.count_device : 0;
    if (leadsFromThisDevice > 0) {
      console.warn(`[Audit Warning] El dispositivo ${device_id} ya ha registrado ${leadsFromThisDevice} leads previamente.`);
    }

    // 6. Obtener premios activos y verificar cuántos premios se han entregado hoy (para límite diario)
    const [prizes] = await connection.query(
      'SELECT id, name, description, category, color_hex, text_color, weight, stock, max_daily_wins FROM prizes WHERE active = 1 ORDER BY id ASC'
    );

    if (prizes.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'No hay premios disponibles actualmente.' });
    }

    // Mapeo de premios entregados hoy
    const [todaySpins] = await connection.query(
      'SELECT prize_id, COUNT(*) AS count_today FROM spins WHERE DATE(created_at) = CURDATE() GROUP BY prize_id'
    );
    const todayPrizesMap = {};
    todaySpins.forEach(row => {
      todayPrizesMap[row.prize_id] = row.count_today;
    });

    // 7. Seleccionar premio con algoritmo ponderado y control de límites diarios
    const winningPrize = selectWeightedPrize(prizes, todayPrizesMap);
    const winningIndex = prizes.findIndex(p => p.id === winningPrize.id);

    // 8. Determinar destino soñado (usar por defecto de base de datos si viene vacío u opcional)
    let finalDestination = (dream_destination && dream_destination.trim()) ? dream_destination.trim() : null;
    if (!finalDestination) {
      try {
        const [defRows] = await connection.query('SELECT name FROM destinations WHERE is_default = 1 AND active = 1 LIMIT 1');
        finalDestination = (defRows && defRows.length > 0) ? defRows[0].name : '🌴 Cancún';
      } catch (e) {
        finalDestination = '🌴 Cancún';
      }
    }

    // Registrar Lead con device_id
    const [leadResult] = await connection.query(
      `INSERT INTO leads (name, email, phone, dream_destination, screen_id, device_id, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), cleanEmail, cleanPhone, finalDestination, screen_id, device_id, req.ip, req.headers['user-agent']]
    );
    const leadId = leadResult.insertId;

    // 9. Generar Ticket de canje
    const ticketCode = generateTicketCode();

    // 10. Registrar Spin
    await connection.query(
      'INSERT INTO spins (lead_id, prize_id, ticket_code, screen_id) VALUES (?, ?, ?, ?)',
      [leadId, winningPrize.id, ticketCode, screen_id]
    );

    // 11. Descontar stock del premio
    await connection.query(
      'UPDATE prizes SET stock = GREATEST(stock - 1, 0) WHERE id = ?',
      [winningPrize.id]
    );

    // 12. GESTIÓN DE COLA (QUEUE SYSTEM)
    // Expirar automáticamente cualquier turno en SPINNING que lleve más de 60 segundos para evitar bloqueos
    await connection.query(
      `UPDATE spin_queue 
       SET status = 'EXPIRED', completed_at = NOW() 
       WHERE screen_id = ? AND status = 'SPINNING' AND TIMESTAMPDIFF(SECOND, started_at, NOW()) > 60`,
      [screen_id]
    );

    // Verificar atómicamente si hay algún tiro actualmente en progreso ('SPINNING') o en espera ('WAITING') con bloqueo FOR UPDATE
    const [activeQueue] = await connection.query(
      `SELECT id, status FROM spin_queue 
       WHERE screen_id = ? AND status IN ('SPINNING', 'WAITING')
       ORDER BY id ASC LIMIT 1 FOR UPDATE`,
      [screen_id]
    );

    const isStandBusy = activeQueue.length > 0;
    let queueStatus = 'SPINNING';
    let queuePosition = 0;

    if (isStandBusy) {
      // Si el stand está ocupado, entrar a la cola en estado WAITING
      queueStatus = 'WAITING';
      const [insertQueue] = await connection.query(
        `INSERT INTO spin_queue (lead_id, prize_id, ticket_code, screen_id, status)
         VALUES (?, ?, ?, ?, 'WAITING')`,
        [leadId, winningPrize.id, ticketCode, screen_id]
      );
      const queueId = insertQueue.insertId;

      // Calcular posición en la fila
      const [[posRow]] = await connection.query(
        `SELECT COUNT(*) AS pos FROM spin_queue WHERE screen_id = ? AND status = 'WAITING' AND id <= ?`,
        [screen_id, queueId]
      );
      queuePosition = posRow ? posRow.pos : 1;

      await connection.commit();

      // Construir WhatsApp URL
      const rawWaNumber = config.COMPANY.whatsapp.replace(/[^0-9]/g, '');
      const waText = encodeURIComponent(
        `¡Hola ${config.COMPANY.name}! Acabo de ganar *${winningPrize.name}* en la ruleta de la Feria de Autos 🏎️\n\n` +
        `👤 Mi Nombre: ${name.trim()}\n` +
        `🎟️ Código VIP: ${ticketCode}\n` +
        `🌴 Mi destino soñado: ${finalDestination}\n\n` +
        `¡Quiero reclamar mi premio y asesoría para mi viaje!`
      );
      const whatsappUrl = `https://wa.me/${rawWaNumber}?text=${waText}`;

      return res.json({
        success: true,
        already_played: false,
        in_queue: true,
        queue_id: queueId,
        queue_position: queuePosition,
        message: `¡Estás en la fila de salida! Turno #${queuePosition}. Espera tu turno...`,
        data: {
          ticketCode,
          winner: {
            id: winningPrize.id,
            name: winningPrize.name,
            description: winningPrize.description,
            category: winningPrize.category,
            sliceIndex: winningIndex,
            totalSlices: prizes.length
          },
          lead: {
            name: name.trim(),
            phone: cleanPhone,
            dream_destination: finalDestination
          },
          whatsappUrl,
          expiresInMinutes: 60
        }
      });
    } else {
      // La ruleta está LIBRE: jugar inmediatamente
      const [insertQueue] = await connection.query(
        `INSERT INTO spin_queue (lead_id, prize_id, ticket_code, screen_id, status, started_at)
         VALUES (?, ?, ?, ?, 'SPINNING', NOW())`,
        [leadId, winningPrize.id, ticketCode, screen_id]
      );
      const queueId = insertQueue.insertId;

      await connection.commit();

      // Construir WhatsApp URL
      const rawWaNumber = config.COMPANY.whatsapp.replace(/[^0-9]/g, '');
      const waText = encodeURIComponent(
        `¡Hola ${config.COMPANY.name}! Acabo de ganar *${winningPrize.name}* en la ruleta de la Feria de Autos 🏎️\n\n` +
        `👤 Mi Nombre: ${name.trim()}\n` +
        `🎟️ Código VIP: ${ticketCode}\n` +
        `🌴 Mi destino soñado: ${finalDestination}\n\n` +
        `¡Quiero reclamar mi premio y asesoría para mi viaje!`
      );
      const whatsappUrl = `https://wa.me/${rawWaNumber}?text=${waText}`;

      // Emitir evento Socket a la pantalla gigante
      if (req.io) {
        const payload = {
          queueId: queueId,
          screenId: screen_id,
          leadName: name.trim(),
          prize: winningPrize,
          sliceIndex: winningIndex,
          totalSlices: prizes.length,
          ticketCode: ticketCode,
          destination: finalDestination
        };
        req.io.to(screen_id).emit('TRIGGER_SPIN', payload);
        req.io.emit('TRIGGER_SPIN', payload);
      }

      return res.json({
        success: true,
        already_played: false,
        in_queue: false,
        queue_id: queueId,
        queue_position: 0,
        data: {
          ticketCode,
          winner: {
            id: winningPrize.id,
            name: winningPrize.name,
            description: winningPrize.description,
            category: winningPrize.category,
            sliceIndex: winningIndex,
            totalSlices: prizes.length
          },
          lead: {
            name: name.trim(),
            phone: cleanPhone,
            dream_destination: finalDestination
          },
          whatsappUrl,
          expiresInMinutes: 60
        }
      });
    }

  } catch (error) {
    await connection.rollback();
    console.error('Error procesando el giro de ruleta:', error);
    res.status(500).json({ success: false, message: 'Ocurrió un error al procesar el tiro.' });
  } finally {
    connection.release();
  }
}

// Consultar estado de la cola para un usuario en espera (Polling / Sockets)
async function getQueueStatus(req, res) {
  const { queue_id, ticket_code, screen_id = 'STAND_01' } = req.query;

  try {
    // 1. Auto-expirar turnos atascados en SPINNING > 60s
    await pool.query(
      `UPDATE spin_queue 
       SET status = 'EXPIRED', completed_at = NOW() 
       WHERE screen_id = ? AND status = 'SPINNING' AND TIMESTAMPDIFF(SECOND, started_at, NOW()) > 60`,
      [screen_id]
    );

    let query = 'SELECT * FROM spin_queue WHERE ';
    let params = [];
    if (queue_id) {
      query += 'id = ?';
      params.push(queue_id);
    } else if (ticket_code) {
      query += 'ticket_code = ?';
      params.push(ticket_code);
    } else {
      return res.status(400).json({ success: false, message: 'Falta queue_id o ticket_code' });
    }

    const [rows] = await pool.query(query, params);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Registro de cola no encontrado.' });
    }

    const item = rows[0];

    // Si sigue en espera (WAITING), calcular posición actual
    let position = 0;
    if (item.status === 'WAITING') {
      const [[posRow]] = await pool.query(
        `SELECT COUNT(*) AS pos FROM spin_queue WHERE screen_id = ? AND status = 'WAITING' AND id <= ?`,
        [item.screen_id, item.id]
      );
      position = posRow ? posRow.pos : 1;
    }

    res.json({
      success: true,
      data: {
        queueId: item.id,
        ticketCode: item.ticket_code,
        status: item.status, // 'WAITING' | 'SPINNING' | 'COMPLETED' | 'EXPIRED'
        position: position,
        startedAt: item.started_at,
        completedAt: item.completed_at
      }
    });
  } catch (error) {
    console.error('Error al consultar estado de cola:', error);
    res.status(500).json({ success: false, message: 'Error interno consultando cola' });
  }
}

// Despachar el siguiente participante de la cola cuando la pantalla termina
async function nextInQueue(req, res) {
  const { screen_id = 'STAND_01', ticket_code } = req.body || {};

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Marcar el tiro previo como COMPLETED
    if (ticket_code) {
      await connection.query(
        `UPDATE spin_queue SET status = 'COMPLETED', completed_at = NOW() WHERE ticket_code = ? AND status = 'SPINNING'`,
        [ticket_code]
      );
    } else {
      await connection.query(
        `UPDATE spin_queue SET status = 'COMPLETED', completed_at = NOW() 
         WHERE screen_id = ? AND status = 'SPINNING'`,
        [screen_id]
      );
    }

    // 2. Verificar atómicamente si aún hay alguien en estado 'SPINNING'
    const [currentlySpinning] = await connection.query(
      `SELECT q.id, q.ticket_code FROM spin_queue q 
       WHERE q.screen_id = ? AND q.status = 'SPINNING' 
       LIMIT 1 FOR UPDATE`,
      [screen_id]
    );

    if (currentlySpinning.length > 0) {
      // Ya hay un turno activo en ejecución, evitar doble despacho concurrente
      await connection.commit();
      return res.json({
        success: true,
        message: 'Ya hay un participante girando actualmente.',
        currentlySpinning: currentlySpinning[0],
        next: null
      });
    }

    // 3. Buscar el siguiente participante en espera (el más antiguo en WAITING)
    const [nextRows] = await connection.query(
      `SELECT q.id AS queue_id, q.ticket_code, q.screen_id,
              l.name AS leadName, l.dream_destination AS destination,
              p.id AS prize_id, p.name AS prize_name, p.color_hex, p.text_color, p.category, p.description
       FROM spin_queue q
       JOIN leads l ON q.lead_id = l.id
       JOIN prizes p ON q.prize_id = p.id
       WHERE q.screen_id = ? AND q.status = 'WAITING'
       ORDER BY q.id ASC
       LIMIT 1
       FOR UPDATE`,
      [screen_id]
    );

    if (nextRows.length === 0) {
      await connection.commit();
      return res.json({ success: true, message: 'No hay participantes en espera.', next: null });
    }

    const nextParticipant = nextRows[0];

    // 3. Pasar su estado a SPINNING con timestamp de inicio
    await connection.query(
      `UPDATE spin_queue SET status = 'SPINNING', started_at = NOW() WHERE id = ?`,
      [nextParticipant.queue_id]
    );

    // Obtener premios activos para conocer sliceIndex
    const [allPrizes] = await connection.query(
      'SELECT id FROM prizes WHERE active = 1 ORDER BY id ASC'
    );
    const sliceIndex = allPrizes.findIndex(p => p.id === nextParticipant.prize_id);

    await connection.commit();

    const payload = {
      queueId: nextParticipant.queue_id,
      screenId: screen_id,
      leadName: nextParticipant.leadName,
      prize: {
        id: nextParticipant.prize_id,
        name: nextParticipant.prize_name,
        color_hex: nextParticipant.color_hex,
        text_color: nextParticipant.text_color,
        category: nextParticipant.category,
        description: nextParticipant.prize_description
      },
      sliceIndex: sliceIndex >= 0 ? sliceIndex : 0,
      totalSlices: allPrizes.length || 8,
      ticketCode: nextParticipant.ticket_code,
      destination: nextParticipant.destination
    };

    // 4. Emitir eventos a pantalla y móviles
    if (req.io) {
      req.io.to(screen_id).emit('TRIGGER_SPIN', payload);
      req.io.emit('TRIGGER_SPIN', payload);

      // Notificar al móvil específico que llegó su turno
      req.io.emit('QUEUE_YOUR_TURN', {
        ticketCode: nextParticipant.ticket_code,
        queueId: nextParticipant.queue_id,
        payload
      });
    }

    res.json({ success: true, message: 'Siguiente participante despachado.', next: payload });
  } catch (error) {
    await connection.rollback();
    console.error('Error al avanzar cola:', error);
    res.status(500).json({ success: false, message: 'Error interno al avanzar cola' });
  } finally {
    connection.release();
  }
}

// Verificar ticket
async function verifyTicket(req, res) {
  const { code } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.ticket_code, s.redeemed, s.redeemed_at, s.created_at,
              l.name AS lead_name, l.phone AS lead_phone, l.email AS lead_email, l.dream_destination, l.device_id,
              p.name AS prize_name, p.description AS prize_description
       FROM spins s
       JOIN leads l ON s.lead_id = l.id
       JOIN prizes p ON s.prize_id = p.id
       WHERE s.ticket_code = ?`,
      [code]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error al verificar ticket:', error);
    res.status(500).json({ success: false, message: 'Error interno al consultar el ticket' });
  }
}

// Canjear ticket
async function redeemTicket(req, res) {
  const { code } = req.params;
  try {
    const [result] = await pool.query(
      'UPDATE spins SET redeemed = 1, redeemed_at = NOW() WHERE ticket_code = ? AND redeemed = 0',
      [code]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ success: false, message: 'Ticket inexistente o ya canjeado previamente.' });
    }

    res.json({ success: true, message: 'Ticket canjeado con éxito.' });
  } catch (error) {
    console.error('Error al canjear ticket:', error);
    res.status(500).json({ success: false, message: 'Error al marcar el ticket como canjeado' });
  }
}

// Mapa en memoria para registrar actividad reciente de leads por pantalla
const screenActivityMap = new Map();

// Registrar actividad de un lead (escaneo de QR o llenado de formulario)
function recordScreenActivity(req, res) {
  const screenId = req.query.screen_id || (req.body && req.body.screen_id) || 'STAND_01';
  screenActivityMap.set(screenId, Date.now());

  if (req.io) {
    req.io.to(screenId).emit('USER_ENGAGED', { screenId, timestamp: Date.now() });
    req.io.emit('USER_ENGAGED', { screenId, timestamp: Date.now() });
  }

  res.json({ success: true, timestamp: Date.now() });
}

// Obtener último tiro registrado para una pantalla específica (Sincronización en vivo / Polling)
async function getLatestSpin(req, res) {
  const { screen_id = 'STAND_01' } = req.query;
  const lastActivityAt = screenActivityMap.get(screen_id) || 0;

  try {
    // Consultar si hay un tiro actualmente en ejecución en la cola ('SPINNING')
    const [rows] = await pool.query(
      `SELECT q.id, q.ticket_code, q.screen_id, q.created_at, q.started_at,
              l.name AS leadName, l.dream_destination AS destination,
              p.id AS prize_id, p.name AS prize_name, p.color_hex, p.text_color, p.category, p.description
       FROM spin_queue q
       JOIN leads l ON q.lead_id = l.id
       JOIN prizes p ON q.prize_id = p.id
       WHERE q.screen_id = ? AND q.status = 'SPINNING'
       ORDER BY q.id DESC
       LIMIT 1`,
      [screen_id]
    );

    if (rows.length === 0) {
      return res.json({ success: true, data: null, lastActivityAt });
    }

    res.json({ success: true, data: rows[0], lastActivityAt });
  } catch (error) {
    console.error('Error al consultar último tiro:', error);
    res.status(500).json({ success: false, message: 'Error interno consultando estado del stand' });
  }
}

module.exports = {
  getPrizes,
  getAdminPrizes,
  createPrize,
  updatePrize,
  processSpin,
  verifyTicket,
  redeemTicket,
  getLatestSpin,
  recordScreenActivity,
  getQueueStatus,
  nextInQueue
};
