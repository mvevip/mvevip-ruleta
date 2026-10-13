const { pool } = require('../config/db');
const { touchSystemSync } = require('./displaysController');

// Obtener destinos activos (Público - para la App Móvil)
async function getDestinations(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, is_default FROM destinations WHERE active = 1 ORDER BY is_default DESC, id ASC'
    );
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error obteniendo destinos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al consultar destinos disponibles'
    });
  }
}

// Obtener todos los destinos (Admin - para PWA Asesores)
async function getAdminDestinations(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, is_default, active, created_at FROM destinations ORDER BY id ASC'
    );
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error obteniendo destinos admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error al consultar destinos'
    });
  }
}

// Crear nuevo destino (Admin)
async function createDestination(req, res) {
  const { name, is_default = false, active = true } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'El nombre del destino es requerido'
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Si se marca como default, desmarcar los demás
    if (is_default) {
      await connection.query('UPDATE destinations SET is_default = 0');
    }

    const [result] = await connection.query(
      'INSERT INTO destinations (name, is_default, active) VALUES (?, ?, ?)',
      [name.trim(), Boolean(is_default), Boolean(active)]
    );

    await connection.commit();
    await touchSystemSync('DESTINATIONS_UPDATED', req.io);

    res.json({
      success: true,
      message: 'Destino creado exitosamente',
      data: {
        id: result.insertId,
        name: name.trim(),
        is_default: Boolean(is_default),
        active: Boolean(active)
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creando destino:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear destino'
    });
  } finally {
    connection.release();
  }
}

// Actualizar destino existente (Admin)
async function updateDestination(req, res) {
  const { id } = req.params;
  const { name, is_default, active } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (is_default) {
      await connection.query('UPDATE destinations SET is_default = 0 WHERE id != ?', [id]);
    }

    const [result] = await connection.query(
      `UPDATE destinations SET 
        name = COALESCE(?, name),
        is_default = COALESCE(?, is_default),
        active = COALESCE(?, active)
       WHERE id = ?`,
      [
        name !== undefined ? name.trim() : null,
        is_default !== undefined ? Boolean(is_default) : null,
        active !== undefined ? Boolean(active) : null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Destino no encontrado' });
    }

    await connection.commit();
    await touchSystemSync('DESTINATIONS_UPDATED', req.io);

    res.json({
      success: true,
      message: 'Destino actualizado exitosamente'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error actualizando destino:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar destino'
    });
  } finally {
    connection.release();
  }
}

// Eliminar destino (Admin)
async function deleteDestination(req, res) {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM destinations WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Destino no encontrado' });
    }

    await touchSystemSync('DESTINATIONS_UPDATED', req.io);

    res.json({
      success: true,
      message: 'Destino eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando destino:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar destino'
    });
  }
}

module.exports = {
  getDestinations,
  getAdminDestinations,
  createDestination,
  updateDestination,
  deleteDestination
};
