const { pool } = require('../config/db');
const { OFFICIAL_ADVISORS } = require('../config/advisorsList');
const {
  standFromScreenId,
  screenIdsOf,
  nonAutosScreenIds,
  STANDS,
  isValidStand
} = require('../config/stands');

function deriveLeadStand(screenId) {
  const mapped = standFromScreenId(screenId);
  return mapped || 'autos';
}

async function getLeads(req, res) {
  try {
    const requestedStand = (req.query && req.query.stand) ? String(req.query.stand).toLowerCase() : 'all';
    const filterByStand = isValidStand(requestedStand) ? requestedStand : null;

    let whereSql = '';
    let params = [];
    if (filterByStand === 'autos') {
      whereSql = 'WHERE (l.screen_id IS NULL OR l.screen_id NOT IN (?))';
      params = [nonAutosScreenIds()];
    } else if (filterByStand) {
      whereSql = 'WHERE l.screen_id IN (?)';
      params = [screenIdsOf(filterByStand)];
    }

    // Tope de filas por consulta (el admin pide un solo canal a la vez); el total real viaja aparte
    const requestedLimit = parseInt(req.query && req.query.limit, 10);
    const rowLimit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 2000) : 500;

    const [rows] = await pool.query(
      `SELECT l.id, l.name, l.email, l.phone, l.dream_destination, l.screen_id, l.device_id, l.created_at,
              l.assigned_to,
              COALESCE(l.is_test, 0) AS is_test,
              s.ticket_code, s.redeemed, p.name AS prize_name,
              (SELECT COUNT(*) FROM leads l2 WHERE l2.device_id = l.device_id AND l.device_id != 'unknown') AS device_leads_count
       FROM leads l
       LEFT JOIN spins s ON s.lead_id = l.id
       LEFT JOIN prizes p ON s.prize_id = p.id
       ${whereSql}
       ORDER BY l.created_at DESC LIMIT ${rowLimit}`,
      params
    );

    // Totales reales por canal (no dependen del filtro ni del tope de filas)
    const [countRows] = await pool.query('SELECT screen_id, COUNT(*) AS n FROM leads GROUP BY screen_id');
    const totals = { autos: 0, ford: 0, mail: 0, all: 0 };
    countRows.forEach((r) => {
      const st = deriveLeadStand(r.screen_id);
      totals[st] = (totals[st] || 0) + Number(r.n);
      totals.all += Number(r.n);
    });

    const enriched = rows.map(r => {
      const st = deriveLeadStand(r.screen_id);
      return {
        ...r,
        stand: st,
        stand_label: STANDS[st]?.label || 'Autos'
      };
    });

    res.json({
      success: true,
      stand: filterByStand || 'all',
      count: enriched.length,
      totals,
      advisors: OFFICIAL_ADVISORS,
      data: enriched
    });
  } catch (error) {
    console.error('Error al listar leads:', error);
    res.status(500).json({ success: false, message: 'Error interno al consultar leads' });
  }
}

async function assignAdvisorToLead(req, res) {
  try {
    const leadId = parseInt(req.params.id, 10);
    if (!leadId || Number.isNaN(leadId)) {
      return res.status(400).json({ success: false, message: 'ID de lead inválido' });
    }

    const rawAdvisor = req.body?.assigned_to;
    const cleanInput = typeof rawAdvisor === 'string' ? rawAdvisor.trim().toUpperCase() : '';

    let canonicalAdvisor = null;
    if (cleanInput !== '') {
      const matched = OFFICIAL_ADVISORS.find((adv) => adv.toUpperCase() === cleanInput);
      if (!matched) {
        return res.status(400).json({
          success: false,
          message: 'El nombre ingresado no pertenece a la lista oficial de asesores.'
        });
      }
      canonicalAdvisor = matched;
    }

    await pool.query('UPDATE leads SET assigned_to = ? WHERE id = ?', [canonicalAdvisor, leadId]);

    return res.json({
      success: true,
      lead_id: leadId,
      assigned_to: canonicalAdvisor,
      data: {
        lead_id: leadId,
        assigned_to: canonicalAdvisor
      },
      message: canonicalAdvisor ? `Asignado a ${canonicalAdvisor}` : 'Asignación removida'
    });
  } catch (error) {
    console.error('Error al asignar asesor al lead:', error);
    return res.status(500).json({ success: false, message: 'Error interno al asignar asesor' });
  }
}

async function getMetrics(req, res) {
  try {
    const requestedStand = (req.query && req.query.stand) ? String(req.query.stand).toLowerCase() : 'all';
    const filterByStand = isValidStand(requestedStand) ? requestedStand : null;
    const fordScreens = screenIdsOf('ford');
    const mailScreens = screenIdsOf('mail');
    const nonAutosScreens = nonAutosScreenIds();

    let leadStandClause = '';
    let spinStandClause = '';
    let standParams = [];

    if (filterByStand === 'autos') {
      leadStandClause = ' AND (screen_id IS NULL OR screen_id NOT IN (?))';
      spinStandClause = ' AND (s.screen_id IS NULL OR s.screen_id NOT IN (?))';
      standParams = [nonAutosScreens];
    } else if (filterByStand) {
      leadStandClause = ' AND screen_id IN (?)';
      spinStandClause = ' AND s.screen_id IN (?)';
      standParams = [screenIdsOf(filterByStand)];
    }

    const [[leadCount]] = await pool.query(
      `SELECT COUNT(*) AS total_leads FROM leads WHERE (is_test = 0 OR is_test IS NULL)${leadStandClause}`,
      standParams
    );
    const [[spinCount]] = await pool.query(
      `SELECT COUNT(*) AS total_spins FROM spins s WHERE (s.is_test = 0 OR s.is_test IS NULL)${spinStandClause}`,
      standParams
    );
    const [[testSpinCount]] = await pool.query(
      `SELECT COUNT(*) AS total_test_spins FROM spins s WHERE s.is_test = 1${spinStandClause}`,
      standParams
    );
    const [[redeemedCount]] = await pool.query(
      `SELECT COUNT(*) AS total_redeemed FROM spins s WHERE s.redeemed = 1 AND (s.is_test = 0 OR s.is_test IS NULL)${spinStandClause}`,
      standParams
    );
    const [[deviceCount]] = await pool.query(
      `SELECT COUNT(DISTINCT device_id) AS total_devices FROM leads WHERE device_id != "unknown" AND (is_test = 0 OR is_test IS NULL)${leadStandClause}`,
      standParams
    );

    const [topDestinations] = await pool.query(
      `SELECT dream_destination, COUNT(*) AS count FROM leads WHERE (is_test = 0 OR is_test IS NULL)${leadStandClause} GROUP BY dream_destination ORDER BY count DESC LIMIT 5`,
      standParams
    );

    const [recentPrizes] = await pool.query(
      `SELECT p.name AS prize, COUNT(s.id) AS count 
       FROM spins s 
       JOIN prizes p ON s.prize_id = p.id 
       WHERE (s.is_test = 0 OR s.is_test IS NULL)${spinStandClause}
       GROUP BY p.name 
       ORDER BY count DESC`,
      standParams
    );

    // Detección de dispositivos sospechosos (más de 1 lead por dispositivo, excluyendo pruebas)
    const [suspiciousDevices] = await pool.query(
      `SELECT device_id, COUNT(*) AS leads_count, GROUP_CONCAT(name SEPARATOR ', ') AS names
       FROM leads
       WHERE device_id != 'unknown' AND (is_test = 0 OR is_test IS NULL)${leadStandClause}
       GROUP BY device_id
       HAVING COUNT(*) > 1
       ORDER BY leads_count DESC LIMIT 10`,
      standParams
    );

    // Desglose por stand (siempre disponible para mostrar comparativa en Admin)
    const [[autosLeadsRow]] = await pool.query(
      'SELECT COUNT(*) AS count FROM leads WHERE (is_test = 0 OR is_test IS NULL) AND (screen_id IS NULL OR screen_id NOT IN (?))',
      [nonAutosScreens]
    );
    const [[fordLeadsRow]] = await pool.query(
      'SELECT COUNT(*) AS count FROM leads WHERE (is_test = 0 OR is_test IS NULL) AND screen_id IN (?)',
      [fordScreens]
    );
    const [[autosSpinsRow]] = await pool.query(
      'SELECT COUNT(*) AS count FROM spins WHERE (is_test = 0 OR is_test IS NULL) AND (screen_id IS NULL OR screen_id NOT IN (?))',
      [nonAutosScreens]
    );
    const [[fordSpinsRow]] = await pool.query(
      'SELECT COUNT(*) AS count FROM spins WHERE (is_test = 0 OR is_test IS NULL) AND screen_id IN (?)',
      [fordScreens]
    );

    const [[mailLeadsRow]] = await pool.query(
      'SELECT COUNT(*) AS count FROM leads WHERE (is_test = 0 OR is_test IS NULL) AND screen_id IN (?)',
      [mailScreens]
    );
    const [[mailSpinsRow]] = await pool.query(
      'SELECT COUNT(*) AS count FROM spins WHERE (is_test = 0 OR is_test IS NULL) AND screen_id IN (?)',
      [mailScreens]
    );

    res.json({
      success: true,
      stand: filterByStand || 'all',
      data: {
        totalLeads: leadCount.total_leads,
        totalSpins: spinCount.total_spins,
        totalTestSpins: testSpinCount.total_test_spins,
        totalRedeemed: redeemedCount.total_redeemed,
        totalDevices: deviceCount.total_devices,
        topDestinations,
        recentPrizes,
        suspiciousDevices,
        byStand: {
          autos: {
            leads: autosLeadsRow.count,
            spins: autosSpinsRow.count
          },
          ford: {
            leads: fordLeadsRow.count,
            spins: fordSpinsRow.count
          },
          mail: {
            leads: mailLeadsRow.count,
            spins: mailSpinsRow.count
          }
        }
      }
    });
  } catch (error) {
    console.error('Error al consultar métricas:', error);
    res.status(500).json({ success: false, message: 'Error interno al calcular métricas' });
  }
}

module.exports = {
  getLeads,
  assignAdvisorToLead,
  getMetrics
};

