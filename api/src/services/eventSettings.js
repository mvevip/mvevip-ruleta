/**
 * Datos de las ferias editables desde el Admin (tabla `event_settings`, migración 010).
 *  - Los valores por defecto viven en config/events.js; lo guardado en la BD los pisa campo por campo.
 *  - Si la tabla aún no existe (migración sin ejecutar) todo sigue con los valores por defecto y el Admin avisa al guardar.
 *  - Caché corta (10 s): un cambio en el Admin llega a todas las instancias del Lambda en pocos segundos.
 */
const { pool } = require('../config/db');
const { EVENTS, setEventOverrides } = require('../config/events');

const CACHE_TTL_MS = 10 * 1000;
let lastRefresh = 0;
let missingTable = false;
let inFlight = null;

function rowToOverride(row) {
  const o = {};
  if (row.fair_name) o.fairName = row.fair_name;
  if (row.venue) o.venue = row.venue;
  if (row.maps_url) o.mapsUrl = row.maps_url;
  if (row.dates_text) o.datesText = row.dates_text;
  if (row.stand_text) o.standText = row.stand_text;
  if (row.closes_at) o.closesAt = row.closes_at;
  o.isOpen = row.is_open === null || row.is_open === undefined ? true : Boolean(row.is_open);
  return o;
}

async function refresh({ force = false } = {}) {
  if (!force && Date.now() - lastRefresh < CACHE_TTL_MS) return;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const [rows] = await pool.query('SELECT event, fair_name, venue, maps_url, dates_text, stand_text, closes_at, is_open FROM event_settings');
      const map = {};
      rows.forEach((r) => { if (EVENTS[r.event]) map[r.event] = rowToOverride(r); });
      setEventOverrides(map);
      missingTable = false;
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        setEventOverrides({});
        missingTable = true;
      } else {
        // Fallo transitorio de la BD: se conserva lo último cargado (no se vuelve a los valores por defecto)
        console.error('[EventSettings] Error leyendo event_settings:', error.code || error.message);
      }
    } finally {
      lastRefresh = Date.now();
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Middleware de /api: deja los datos de las ferias al día antes de atender la petición (nunca bloquea el acceso). */
async function eventSettingsMiddleware(req, res, next) {
  try {
    await refresh();
  } catch (e) {
    // sin efecto: rigen los datos ya cargados o los de por defecto
  }
  next();
}

function isMissingTable() {
  return missingTable;
}

module.exports = { refresh, eventSettingsMiddleware, isMissingTable };
