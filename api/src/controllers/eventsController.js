/**
 * Datos de las ferias para el Admin: GET /api/admin/events y PUT /api/admin/events/:event.
 * Lo guardado se aplica en pocos segundos a los 3 frentes de la ciudad (correo, celular, kiosco y ticket impreso).
 */
const { pool } = require('../config/db');
const { EVENTS, CAMPAIGNS, getEventInfo, getCampaignInfo, isEventClosed, isFairEvent, isCampaignEvent } = require('../config/events');
const { screenIdsOfEvent } = require('../config/stands');
const eventSettings = require('../services/eventSettings');

const LIMITS = { fairName: 150, venue: 200, datesText: 150, standText: 150, mapsUrl: 500 };

function describe(event) {
  const info = getEventInfo(event);
  return {
    event,
    city: info.city,
    fairName: info.fairName,
    venue: info.venue,
    mapsUrl: info.mapsUrl,
    datesText: info.datesText,
    standText: info.standText,
    closesAt: info.closesAt,
    isOpen: info.isOpen !== false,
    closed: isEventClosed(event),
    defaults: {
      fairName: EVENTS[event].fairName,
      venue: EVENTS[event].venue,
      mapsUrl: EVENTS[event].mapsUrl,
      datesText: EVENTS[event].datesText,
      standText: EVENTS[event].standText,
      closesAt: EVENTS[event].closesAt
    },
    screenIds: screenIdsOfEvent(event)
  };
}

/** Campañas de correo sin feria (general): solo vigencia y apertura. */
function describeCampaign(event) {
  const info = getCampaignInfo(event);
  return {
    event,
    kind: 'campaign',
    city: info.label,
    closesAt: info.closesAt,
    isOpen: info.isOpen !== false,
    closed: isEventClosed(event),
    defaults: { closesAt: CAMPAIGNS[event].closesAt },
    screenIds: screenIdsOfEvent(event)
  };
}

async function getAdminEvents(req, res) {
  await eventSettings.refresh({ force: true });
  res.set('Cache-Control', 'no-store');
  return res.json({
    success: true,
    missingTable: eventSettings.isMissingTable(),
    data: [...Object.keys(EVENTS).map((e) => ({ kind: 'fair', ...describe(e) })), ...Object.keys(CAMPAIGNS).map(describeCampaign)]
  });
}

/** Cierre / apertura de una campaña de correo (general). */
async function updateCampaign(req, res, event) {
  const body = req.body || {};
  const current = getCampaignInfo(event);
  try {
    const closesAt = String(body.closesAt !== undefined ? body.closesAt : current.closesAt || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?[+-]\d{2}:\d{2}$/.test(closesAt) || Number.isNaN(Date.parse(closesAt))) {
      throw new Error('La hora de cierre no es válida.');
    }
    const isOpen = body.isOpen === undefined ? current.isOpen !== false : Boolean(body.isOpen);
    await pool.query(
      `INSERT INTO event_settings (event, closes_at, is_open) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE closes_at = VALUES(closes_at), is_open = VALUES(is_open)`,
      [event, closesAt, isOpen ? 1 : 0]
    );
    await eventSettings.refresh({ force: true });
    return res.json({ success: true, message: 'Campaña actualizada.', data: describeCampaign(event) });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ success: false, code: 'MISSING_TABLE', message: 'Falta ejecutar la migración 010 (tabla event_settings).' });
    }
    if (error.code) {
      console.error('[Events] Error guardando la campaña:', error);
      return res.status(500).json({ success: false, message: 'No se pudieron guardar los datos de la campaña.' });
    }
    return res.status(400).json({ success: false, message: error.message });
  }
}

function cleanText(value, max, label) {
  const text = String(value == null ? '' : value).trim();
  if (!text) throw new Error(`${label} no puede estar vacío.`);
  if (text.length > max) throw new Error(`${label} es demasiado largo (máx. ${max} caracteres).`);
  return text;
}

async function updateEvent(req, res) {
  const event = String(req.params.event || '').toLowerCase();
  if (isCampaignEvent(event)) return updateCampaign(req, res, event);
  if (!isFairEvent(event)) return res.status(404).json({ success: false, message: 'Evento no encontrado.' });
  const body = req.body || {};
  const current = getEventInfo(event);

  try {
    const fairName = cleanText(body.fairName !== undefined ? body.fairName : current.fairName, LIMITS.fairName, 'El nombre de la feria');
    const venue = cleanText(body.venue !== undefined ? body.venue : current.venue, LIMITS.venue, 'El lugar');
    const datesText = cleanText(body.datesText !== undefined ? body.datesText : current.datesText, LIMITS.datesText, 'Las fechas');
    const standText = cleanText(body.standText !== undefined ? body.standText : current.standText, LIMITS.standText, 'El texto del stand');

    const mapsUrl = cleanText(body.mapsUrl !== undefined ? body.mapsUrl : current.mapsUrl, LIMITS.mapsUrl, 'El enlace del mapa');
    if (!/^https:\/\/[^\s]+$/i.test(mapsUrl)) throw new Error('El enlace del mapa debe empezar con https://');

    const closesAt = String(body.closesAt !== undefined ? body.closesAt : current.closesAt || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?[+-]\d{2}:\d{2}$/.test(closesAt) || Number.isNaN(Date.parse(closesAt))) {
      throw new Error('La hora de cierre no es válida.');
    }
    const isOpen = body.isOpen === undefined ? current.isOpen !== false : Boolean(body.isOpen);

    await pool.query(
      `INSERT INTO event_settings (event, fair_name, venue, maps_url, dates_text, stand_text, closes_at, is_open)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE fair_name = VALUES(fair_name), venue = VALUES(venue), maps_url = VALUES(maps_url),
         dates_text = VALUES(dates_text), stand_text = VALUES(stand_text), closes_at = VALUES(closes_at), is_open = VALUES(is_open)`,
      [event, fairName, venue, mapsUrl, datesText, standText, closesAt, isOpen ? 1 : 0]
    );
    await eventSettings.refresh({ force: true });
    return res.json({ success: true, message: 'Datos de la feria actualizados.', data: describe(event) });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ success: false, code: 'MISSING_TABLE', message: 'Falta ejecutar la migración 010 (tabla event_settings).' });
    }
    if (error.code) {
      console.error('[Events] Error guardando datos de la feria:', error);
      return res.status(500).json({ success: false, message: 'No se pudieron guardar los datos de la feria.' });
    }
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = { getAdminEvents, updateEvent };
