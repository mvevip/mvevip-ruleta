const { getChannelSettings, saveChannelSettings } = require('../services/channelSettings');

/** GET /api/channels (público): qué canales están habilitados y cuál es el por defecto. Sin datos sensibles. */
async function getPublicChannels(req, res) {
  res.set('Cache-Control', 'no-store');
  const settings = await getChannelSettings();
  res.json({
    success: true,
    channels: {
      autos: { enabled: settings.channels.autos.enabled },
      ford: { enabled: settings.channels.ford.enabled },
      mail: { enabled: settings.channels.mail.enabled }
    },
    default: settings.default
  });
}

/** GET /api/admin/channels: igual que el público, con aviso si falta la migración. */
async function getAdminChannels(req, res) {
  res.set('Cache-Control', 'no-store');
  const settings = await getChannelSettings({ fresh: true });
  res.json({ success: true, channels: settings.channels, default: settings.default, missingTable: settings.missingTable });
}

/** PUT /api/admin/channels  { channels: { autos, ford, mail }, default: 'mail' } */
async function updateChannels(req, res) {
  try {
    const { channels, default: defaultChannel } = req.body || {};
    const result = await saveChannelSettings({ channels, defaultChannel });
    if (!result.ok) {
      return res.status(result.missingTable ? 500 : 400).json({ success: false, message: result.message, missingTable: Boolean(result.missingTable) });
    }
    return res.json({
      success: true,
      message: 'Canales actualizados.',
      channels: result.settings.channels,
      default: result.settings.default
    });
  } catch (error) {
    console.error('[Channels] Error guardando configuración:', error.code || error.message);
    return res.status(500).json({ success: false, message: 'No se pudo guardar la configuración.' });
  }
}

module.exports = { getPublicChannels, getAdminChannels, updateChannels };
