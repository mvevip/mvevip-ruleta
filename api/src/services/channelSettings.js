/**
 * Canales de acceso (autos / ford / mail): cuáles están habilitados y cuál es el "por defecto".
 *  - El enlace sin parámetros (autos.mvevip.com/) lleva al canal por defecto.
 *  - Un acceso explícito (QR de stand, /formulario2, ?view=mail) a un canal deshabilitado lleva al por defecto.
 * La configuración vive en la tabla `channel_settings` (migración 006). Si la tabla aún no existe se usan los
 * valores históricos (todos habilitados, por defecto Autos) para no romper nada.
 */
const { pool } = require('../config/db');

const CHANNELS = ['autos', 'ford', 'mail'];
const FALLBACK_DEFAULT = 'autos';
const CACHE_TTL_MS = 10 * 1000;

let cache = null; // { value, at }

function defaults(missingTable = false) {
  return {
    channels: { autos: { enabled: true }, ford: { enabled: true }, mail: { enabled: true } },
    default: FALLBACK_DEFAULT,
    missingTable
  };
}

/** Garantiza coherencia: al menos un canal habilitado y el por defecto siempre habilitado. */
function normalize(settings) {
  const enabledKeys = CHANNELS.filter((c) => settings.channels[c].enabled);
  if (enabledKeys.length === 0) {
    settings.channels[FALLBACK_DEFAULT].enabled = true;
    enabledKeys.push(FALLBACK_DEFAULT);
  }
  if (!settings.channels[settings.default] || !settings.channels[settings.default].enabled) {
    settings.default = enabledKeys.includes(FALLBACK_DEFAULT) ? FALLBACK_DEFAULT : enabledKeys[0];
  }
  return settings;
}

async function getChannelSettings({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;

  let value;
  try {
    const [rows] = await pool.query('SELECT channel, enabled, is_default FROM channel_settings');
    const settings = defaults(false);
    let foundDefault = null;
    rows.forEach((r) => {
      if (!CHANNELS.includes(r.channel)) return;
      settings.channels[r.channel].enabled = Boolean(r.enabled);
      if (r.is_default) foundDefault = r.channel;
    });
    if (foundDefault) settings.default = foundDefault;
    value = normalize(settings);
  } catch (error) {
    if (error.code !== 'ER_NO_SUCH_TABLE') console.error('[Channels] Error leyendo configuración:', error.code || error.message);
    value = defaults(error.code === 'ER_NO_SUCH_TABLE');
  }

  cache = { value, at: Date.now() };
  return value;
}

async function isChannelEnabled(channel) {
  const settings = await getChannelSettings();
  return !settings.channels[channel] || settings.channels[channel].enabled;
}

/** Valida y guarda. `channels` = { autos: bool, ford: bool, mail: bool }, `defaultChannel` = clave. */
async function saveChannelSettings({ channels, defaultChannel }) {
  if (!channels || typeof channels !== 'object') return { ok: false, message: 'Faltan los canales.' };
  const enabled = {};
  for (const c of CHANNELS) {
    if (typeof channels[c] !== 'boolean') return { ok: false, message: `Valor inválido para el canal "${c}".` };
    enabled[c] = channels[c];
  }
  if (!CHANNELS.some((c) => enabled[c])) {
    return { ok: false, message: 'Debe quedar al menos un canal habilitado.' };
  }
  if (!CHANNELS.includes(defaultChannel) || !enabled[defaultChannel]) {
    return { ok: false, message: 'El canal por defecto debe ser uno de los canales habilitados.' };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const c of CHANNELS) {
      await connection.query(
        `INSERT INTO channel_settings (channel, enabled, is_default) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), is_default = VALUES(is_default)`,
        [c, enabled[c] ? 1 : 0, c === defaultChannel ? 1 : 0]
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return { ok: false, message: 'Falta crear la tabla channel_settings (migración 006).', missingTable: true };
    }
    throw error;
  } finally {
    connection.release();
  }

  cache = null;
  return { ok: true, settings: await getChannelSettings({ fresh: true }) };
}

module.exports = { CHANNELS, getChannelSettings, isChannelEnabled, saveChannelSettings };
