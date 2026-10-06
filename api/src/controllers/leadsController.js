const { pool } = require('../config/db');

async function getLeads(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT l.id, l.name, l.email, l.phone, l.dream_destination, l.screen_id, l.device_id, l.created_at,
              s.ticket_code, s.redeemed, p.name AS prize_name,
              (SELECT COUNT(*) FROM leads l2 WHERE l2.device_id = l.device_id AND l.device_id != 'unknown') AS device_leads_count
       FROM leads l
       LEFT JOIN spins s ON s.lead_id = l.id
       LEFT JOIN prizes p ON s.prize_id = p.id
       ORDER BY l.created_at DESC LIMIT 500`
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Error al listar leads:', error);
    res.status(500).json({ success: false, message: 'Error interno al consultar leads' });
  }
}

async function getMetrics(req, res) {
  try {
    const [[leadCount]] = await pool.query('SELECT COUNT(*) AS total_leads FROM leads');
    const [[spinCount]] = await pool.query('SELECT COUNT(*) AS total_spins FROM spins');
    const [[redeemedCount]] = await pool.query('SELECT COUNT(*) AS total_redeemed FROM spins WHERE redeemed = 1');
    const [[deviceCount]] = await pool.query('SELECT COUNT(DISTINCT device_id) AS total_devices FROM leads WHERE device_id != "unknown"');

    const [topDestinations] = await pool.query(
      'SELECT dream_destination, COUNT(*) AS count FROM leads GROUP BY dream_destination ORDER BY count DESC LIMIT 5'
    );

    const [recentPrizes] = await pool.query(
      `SELECT p.name AS prize, COUNT(s.id) AS count 
       FROM spins s 
       JOIN prizes p ON s.prize_id = p.id 
       GROUP BY p.name 
       ORDER BY count DESC`
    );

    // Detección de dispositivos sospechosos (más de 1 lead por dispositivo)
    const [suspiciousDevices] = await pool.query(
      `SELECT device_id, COUNT(*) AS leads_count, GROUP_CONCAT(name SEPARATOR ', ') AS names
       FROM leads
       WHERE device_id != 'unknown'
       GROUP BY device_id
       HAVING COUNT(*) > 1
       ORDER BY leads_count DESC LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        totalLeads: leadCount.total_leads,
        totalSpins: spinCount.total_spins,
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
  getMetrics
};
