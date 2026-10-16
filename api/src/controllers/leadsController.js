const { pool } = require('../config/db');
const { OFFICIAL_ADVISORS } = require('../config/advisorsList');

async function getLeads(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT l.id, l.name, l.email, l.phone, l.dream_destination, l.screen_id, l.device_id, l.created_at,
              l.assigned_to,
              COALESCE(l.is_test, 0) AS is_test,
              s.ticket_code, s.redeemed, p.name AS prize_name,
              (SELECT COUNT(*) FROM leads l2 WHERE l2.device_id = l.device_id AND l.device_id != 'unknown') AS device_leads_count
       FROM leads l
       LEFT JOIN spins s ON s.lead_id = l.id
       LEFT JOIN prizes p ON s.prize_id = p.id
       ORDER BY l.created_at DESC LIMIT 500`
    );
    res.json({
      success: true,
      count: rows.length,
      advisors: OFFICIAL_ADVISORS,
      data: rows
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
    const [[leadCount]] = await pool.query('SELECT COUNT(*) AS total_leads FROM leads WHERE is_test = 0 OR is_test IS NULL');
    const [[spinCount]] = await pool.query('SELECT COUNT(*) AS total_spins FROM spins WHERE is_test = 0 OR is_test IS NULL');
    const [[testSpinCount]] = await pool.query('SELECT COUNT(*) AS total_test_spins FROM spins WHERE is_test = 1');
    const [[redeemedCount]] = await pool.query('SELECT COUNT(*) AS total_redeemed FROM spins WHERE redeemed = 1 AND (is_test = 0 OR is_test IS NULL)');
    const [[deviceCount]] = await pool.query('SELECT COUNT(DISTINCT device_id) AS total_devices FROM leads WHERE device_id != "unknown" AND (is_test = 0 OR is_test IS NULL)');

    const [topDestinations] = await pool.query(
      'SELECT dream_destination, COUNT(*) AS count FROM leads WHERE is_test = 0 OR is_test IS NULL GROUP BY dream_destination ORDER BY count DESC LIMIT 5'
    );

    const [recentPrizes] = await pool.query(
      `SELECT p.name AS prize, COUNT(s.id) AS count 
       FROM spins s 
       JOIN prizes p ON s.prize_id = p.id 
       WHERE s.is_test = 0 OR s.is_test IS NULL
       GROUP BY p.name 
       ORDER BY count DESC`
    );

    // Detección de dispositivos sospechosos (más de 1 lead por dispositivo, excluyendo pruebas)
    const [suspiciousDevices] = await pool.query(
      `SELECT device_id, COUNT(*) AS leads_count, GROUP_CONCAT(name SEPARATOR ', ') AS names
       FROM leads
       WHERE device_id != 'unknown' AND (is_test = 0 OR is_test IS NULL)
       GROUP BY device_id
       HAVING COUNT(*) > 1
       ORDER BY leads_count DESC LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        totalLeads: leadCount.total_leads,
        totalSpins: spinCount.total_spins,
        totalTestSpins: testSpinCount.total_test_spins,
        totalRedeemed: redeemedCount.total_redeemed,
        totalDevices: deviceCount.total_devices,
        topDestinations,
        recentPrizes,
        suspiciousDevices
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
