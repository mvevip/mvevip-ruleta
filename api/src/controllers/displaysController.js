const { pool } = require('../config/db');

/**
 * Actualiza la versión de sincronización del sistema y emite eventos en tiempo real
 */
async function touchSystemSync(action = 'CONFIG_UPDATED', io = null) {
  const version = Date.now();
  try {
    await pool.query(
      `INSERT INTO system_sync (sync_key, version_timestamp, action)
       VALUES ('global_displays', ?, ?)
       ON DUPLICATE KEY UPDATE version_timestamp = VALUES(version_timestamp), action = VALUES(action)`,
      [version, action]
    );

    const socketInstance = io || global.io;
    if (socketInstance) {
      socketInstance.emit('ADMIN_REMOTE_RELOAD', {
        action,
        version,
        timestamp: new Date().toISOString()
      });
      console.log(`[RemoteSync] Emitido ADMIN_REMOTE_RELOAD (${action}) con versión ${version}`);
    }
  } catch (err) {
    console.warn('[RemoteSync] Error al actualizar system_sync:', err.message);
  }
  return version;
}

function extractYouTubeId(urlOrId) {
  if (!urlOrId) return 'AzQlHkHx6HI';
  const clean = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }
  const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match && match[1]) {
    return match[1];
  }
  return clean;
}

/**
 * Consulta la configuración de todas las pantallas
 */
async function getDisplaysConfig(req, res) {
  try {
    const [configs] = await pool.query('SELECT * FROM display_configs');
    const [syncRows] = await pool.query("SELECT * FROM system_sync WHERE sync_key = 'global_displays'");
    const currentVersion = syncRows[0]?.version_timestamp || Date.now();

    const configMap = {};
    configs.forEach(row => {
      configMap[row.screen_key] = {
        orientation: row.orientation || 'auto',
        slide_duration: row.slide_duration || 8,
        layout_ratio: row.layout_ratio || '55/45',
        video_url: row.video_url || 'AzQlHkHx6HI',
        qr_scale_percent: row.qr_scale_percent ? Number(row.qr_scale_percent) : 55,
        wheel_scale_x: row.wheel_scale_x ? Number(row.wheel_scale_x) : 100,
        wheel_font_size: row.wheel_font_size ? Number(row.wheel_font_size) : 100,
        updated_at: row.updated_at
      };
    });

    return res.json({
      success: true,
      configs: configMap,
      version: currentVersion
    });
  } catch (error) {
    console.error('[Displays] Error obteniendo configuraciones:', error);
    return res.status(500).json({ success: false, error: 'Error al consultar configuración de pantallas' });
  }
}

/**
 * Actualiza la configuración de una pantalla (orientación, duración, proporción, video, escala de QR, ensanchamiento de ruleta, tamaño de letras)
 */
async function updateDisplayConfig(req, res) {
  try {
    const { screen_key, orientation, slide_duration, layout_ratio, video_url, qr_scale_percent, wheel_scale_x, wheel_font_size } = req.body;
    if (!screen_key) {
      return res.status(400).json({ success: false, error: 'screen_key es requerido' });
    }

    const cleanOrientation = ['auto', 'portrait', 'landscape'].includes(orientation) ? orientation : 'auto';
    const cleanDuration = Number(slide_duration) > 0 ? Number(slide_duration) : 8;
    const cleanRatio = layout_ratio || '55/45';
    const cleanVideo = video_url !== undefined ? extractYouTubeId(video_url) : null;
    const cleanScale = qr_scale_percent !== undefined && Number(qr_scale_percent) >= 20 && Number(qr_scale_percent) <= 100
      ? Number(qr_scale_percent)
      : null;
    const cleanWheelScale = wheel_scale_x !== undefined && Number(wheel_scale_x) >= 80 && Number(wheel_scale_x) <= 160
      ? Number(wheel_scale_x)
      : null;
    const cleanWheelFontSize = wheel_font_size !== undefined && Number(wheel_font_size) >= 70 && Number(wheel_font_size) <= 160
      ? Number(wheel_font_size)
      : null;

    try {
      await pool.query(
        `INSERT INTO display_configs (screen_key, orientation, slide_duration, layout_ratio, video_url, qr_scale_percent, wheel_scale_x, wheel_font_size)
         VALUES (?, ?, ?, ?, COALESCE(?, 'AzQlHkHx6HI'), COALESCE(?, 55), COALESCE(?, 100), COALESCE(?, 100))
         ON DUPLICATE KEY UPDATE 
           orientation = VALUES(orientation), 
           slide_duration = VALUES(slide_duration), 
           layout_ratio = VALUES(layout_ratio),
           video_url = IF(VALUES(video_url) IS NOT NULL AND VALUES(video_url) != '', VALUES(video_url), video_url),
           qr_scale_percent = IF(VALUES(qr_scale_percent) IS NOT NULL, VALUES(qr_scale_percent), qr_scale_percent),
           wheel_scale_x = IF(VALUES(wheel_scale_x) IS NOT NULL, VALUES(wheel_scale_x), wheel_scale_x),
           wheel_font_size = IF(VALUES(wheel_font_size) IS NOT NULL, VALUES(wheel_font_size), wheel_font_size)`,
        [screen_key, cleanOrientation, cleanDuration, cleanRatio, cleanVideo, cleanScale, cleanWheelScale, cleanWheelFontSize]
      );
    } catch (sqlErr) {
      console.warn('[Displays] Error SQL en updateDisplayConfig, intentando auto-migración de columnas:', sqlErr.message);
      await pool.query('ALTER TABLE display_configs ADD COLUMN video_url VARCHAR(255) NOT NULL DEFAULT "AzQlHkHx6HI"').catch(() => {});
      await pool.query('ALTER TABLE display_configs ADD COLUMN qr_scale_percent INT NOT NULL DEFAULT 55').catch(() => {});
      await pool.query('ALTER TABLE display_configs ADD COLUMN wheel_scale_x INT NOT NULL DEFAULT 100').catch(() => {});
      await pool.query('ALTER TABLE display_configs ADD COLUMN wheel_font_size INT NOT NULL DEFAULT 100').catch(() => {});
      // Reintentar
      await pool.query(
        `INSERT INTO display_configs (screen_key, orientation, slide_duration, layout_ratio, video_url, qr_scale_percent, wheel_scale_x, wheel_font_size)
         VALUES (?, ?, ?, ?, COALESCE(?, 'AzQlHkHx6HI'), COALESCE(?, 55), COALESCE(?, 100), COALESCE(?, 100))
         ON DUPLICATE KEY UPDATE 
           orientation = VALUES(orientation), 
           slide_duration = VALUES(slide_duration), 
           layout_ratio = VALUES(layout_ratio),
           video_url = IF(VALUES(video_url) IS NOT NULL AND VALUES(video_url) != '', VALUES(video_url), video_url),
           qr_scale_percent = IF(VALUES(qr_scale_percent) IS NOT NULL, VALUES(qr_scale_percent), qr_scale_percent),
           wheel_scale_x = IF(VALUES(wheel_scale_x) IS NOT NULL, VALUES(wheel_scale_x), wheel_scale_x),
           wheel_font_size = IF(VALUES(wheel_font_size) IS NOT NULL, VALUES(wheel_font_size), wheel_font_size)`,
        [screen_key, cleanOrientation, cleanDuration, cleanRatio, cleanVideo, cleanScale, cleanWheelScale, cleanWheelFontSize]
      );
    }

    const version = await touchSystemSync(`DISPLAY_CONFIG_${screen_key.toUpperCase()}`, req.io);

    return res.json({
      success: true,
      message: `Configuración de ${screen_key} actualizada correctamente`,
      video_url: cleanVideo,
      qr_scale_percent: cleanScale,
      wheel_scale_x: cleanWheelScale,
      wheel_font_size: cleanWheelFontSize,
      version
    });
  } catch (error) {
    console.error('[Displays] Error actualizando configuración:', error);
    return res.status(500).json({ success: false, error: 'Error al guardar configuración de pantalla: ' + error.message });
  }
}

/**
 * Obtener imágenes activas del slider (para las pantallas públicas)
 */
async function getSliderImages(req, res) {
  try {
    const [images] = await pool.query(
      'SELECT id, title, image_url, duration_seconds, sort_order FROM slider_images WHERE active = TRUE ORDER BY sort_order ASC, id ASC'
    );
    const [syncRows] = await pool.query("SELECT * FROM system_sync WHERE sync_key = 'global_displays'");
    const currentVersion = syncRows[0]?.version_timestamp || Date.now();

    return res.json({
      success: true,
      images,
      version: currentVersion
    });
  } catch (error) {
    console.error('[Displays] Error obteniendo imágenes activas:', error);
    return res.status(500).json({ success: false, error: 'Error al consultar imágenes' });
  }
}

/**
 * Obtener todas las imágenes del slider (para panel administrativo)
 */
async function getAdminSliderImages(req, res) {
  try {
    const [images] = await pool.query(
      'SELECT * FROM slider_images ORDER BY sort_order ASC, id ASC'
    );
    return res.json({
      success: true,
      images
    });
  } catch (error) {
    console.error('[Displays Admin] Error obteniendo imágenes:', error);
    return res.status(500).json({ success: false, error: 'Error al consultar imágenes de administración' });
  }
}

/**
 * Crear nueva imagen de slider
 */
async function createSliderImage(req, res) {
  try {
    const { title, image_url, duration_seconds, sort_order, active } = req.body;
    if (!image_url) {
      return res.status(400).json({ success: false, error: 'image_url es requerido' });
    }

    const duration = Number(duration_seconds) > 0 ? Number(duration_seconds) : 8;
    const order = Number(sort_order) >= 0 ? Number(sort_order) : 0;
    const isActive = active !== undefined ? Boolean(active) : true;

    const [result] = await pool.query(
      'INSERT INTO slider_images (title, image_url, duration_seconds, sort_order, active) VALUES (?, ?, ?, ?, ?)',
      [title || '', image_url, duration, order, isActive]
    );

    const version = await touchSystemSync('SLIDER_IMAGE_CREATED', req.io);

    return res.status(201).json({
      success: true,
      id: result.insertId,
      message: 'Imagen agregada exitosamente',
      version
    });
  } catch (error) {
    console.error('[Displays Admin] Error creando imagen:', error);
    return res.status(500).json({ success: false, error: 'Error al guardar la imagen' });
  }
}

/**
 * Actualizar datos de una imagen de slider
 */
async function updateSliderImage(req, res) {
  try {
    const { id } = req.params;
    const { title, duration_seconds, sort_order, active } = req.body;

    const [existing] = await pool.query('SELECT * FROM slider_images WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Imagen no encontrada' });
    }

    const duration = duration_seconds !== undefined ? Number(duration_seconds) : existing[0].duration_seconds;
    const order = sort_order !== undefined ? Number(sort_order) : existing[0].sort_order;
    const isActive = active !== undefined ? Boolean(active) : existing[0].active;
    const imageTitle = title !== undefined ? title : existing[0].title;

    await pool.query(
      'UPDATE slider_images SET title = ?, duration_seconds = ?, sort_order = ?, active = ? WHERE id = ?',
      [imageTitle, duration, order, isActive, id]
    );

    const version = await touchSystemSync('SLIDER_IMAGE_UPDATED', req.io);

    return res.json({
      success: true,
      message: 'Imagen actualizada exitosamente',
      version
    });
  } catch (error) {
    console.error('[Displays Admin] Error actualizando imagen:', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar la imagen' });
  }
}

/**
 * Reordenar imágenes en bloque
 */
async function reorderSliderImages(req, res) {
  try {
    const { items } = req.body; // Array de { id, sort_order }
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'items debe ser un array de objetos' });
    }

    for (const item of items) {
      if (item.id && typeof item.sort_order === 'number') {
        await pool.query('UPDATE slider_images SET sort_order = ? WHERE id = ?', [item.sort_order, item.id]);
      }
    }

    const version = await touchSystemSync('SLIDER_REORDERED', req.io);

    return res.json({
      success: true,
      message: 'Orden de imágenes actualizado',
      version
    });
  } catch (error) {
    console.error('[Displays Admin] Error reordenando imágenes:', error);
    return res.status(500).json({ success: false, error: 'Error al reordenar imágenes' });
  }
}

/**
 * Eliminar imagen de slider
 */
async function deleteSliderImage(req, res) {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM slider_images WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Imagen no encontrada' });
    }

    const version = await touchSystemSync('SLIDER_IMAGE_DELETED', req.io);

    return res.json({
      success: true,
      message: 'Imagen eliminada exitosamente',
      version
    });
  } catch (error) {
    console.error('[Displays Admin] Error eliminando imagen:', error);
    return res.status(500).json({ success: false, error: 'Error al eliminar la imagen' });
  }
}

/**
 * Consulta de estado de sincronización (Polling ligero de pantallas)
 */
async function getSyncStatus(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM system_sync WHERE sync_key = 'global_displays'");
    const currentVersion = rows[0]?.version_timestamp || 0;
    const currentAction = rows[0]?.action || 'NONE';

    return res.json({
      success: true,
      version: currentVersion,
      action: currentAction
    });
  } catch (error) {
    return res.json({
      success: true,
      version: 0,
      action: 'NONE'
    });
  }
}

/**
 * Disparar recarga remota forzada desde Admin
 */
async function triggerRemoteReload(req, res) {
  try {
    const { action = 'FORCE_RELOAD' } = req.body || {};
    const version = await touchSystemSync(action, req.io);

    return res.json({
      success: true,
      message: 'Comando de recarga y sincronización enviado a todas las pantallas',
      version
    });
  } catch (error) {
    console.error('[Displays Admin] Error en recarga remota:', error);
    return res.status(500).json({ success: false, error: 'Error al enviar comando de recarga' });
  }
}

module.exports = {
  touchSystemSync,
  getDisplaysConfig,
  updateDisplayConfig,
  getSliderImages,
  getAdminSliderImages,
  createSliderImage,
  updateSliderImage,
  reorderSliderImages,
  deleteSliderImage,
  getSyncStatus,
  triggerRemoteReload
};
