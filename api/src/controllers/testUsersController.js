const { pool } = require('../config/db');

/**
 * Listar todos los usuarios de prueba con el conteo de giros realizados
 */
async function getTestUsers(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.phone, u.email, u.notes, u.active, u.created_at,
              (SELECT COUNT(*) FROM spins s JOIN leads l ON s.lead_id = l.id WHERE (l.phone = u.phone OR l.email = u.email)) AS spins_count
       FROM test_users u
       ORDER BY u.id ASC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error al listar test_users:', error);
    res.status(500).json({ success: false, message: 'Error interno al consultar usuarios de prueba' });
  }
}

/**
 * Crear o actualizar un usuario de prueba
 */
async function createTestUser(req, res) {
  try {
    const { name, phone, email, notes } = req.body;
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'El número de celular es obligatorio.' });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || 'Asesor Demo').trim();
    const cleanNotes = (notes || '').trim();

    // Validar formato de celular Ecuador
    if (!/^09\d{8}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'El teléfono debe tener 10 dígitos iniciando con 09 (ej: 0990000001).'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO test_users (name, phone, email, notes, active)
       VALUES (?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), notes=VALUES(notes), active=TRUE`,
      [cleanName, cleanPhone, cleanEmail, cleanNotes]
    );

    res.json({
      success: true,
      message: 'Usuario de prueba registrado con éxito.',
      data: { id: result.insertId, name: cleanName, phone: cleanPhone, email: cleanEmail }
    });
  } catch (error) {
    console.error('Error al crear test_user:', error);
    res.status(500).json({ success: false, message: 'Error al registrar usuario de prueba: ' + error.message });
  }
}

/**
 * Cambiar estado activo/inactivo de un usuario de prueba
 */
async function toggleTestUser(req, res) {
  try {
    const { id } = req.params;
    const { active } = req.body;

    await pool.query('UPDATE test_users SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
    res.json({ success: true, message: 'Estado de usuario de prueba actualizado correctamente.' });
  } catch (error) {
    console.error('Error al actualizar test_user:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar usuario de prueba' });
  }
}

/**
 * Eliminar un usuario de prueba
 */
async function deleteTestUser(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM test_users WHERE id = ?', [id]);
    res.json({ success: true, message: 'Usuario de prueba eliminado del sistema.' });
  } catch (error) {
    console.error('Error al eliminar test_user:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar usuario de prueba' });
  }
}

module.exports = {
  getTestUsers,
  createTestUser,
  toggleTestUser,
  deleteTestUser
};
