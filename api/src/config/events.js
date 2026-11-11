/**
 * Eventos (ferias) con datos propios: nombre, lugar, mapa, fechas, texto del stand y cierre automático.
 * Los usan el canal Correo, el celular, el kiosco y el ticket. El evento "cuotas" no figura aquí: conserva su
 * comportamiento histórico (cita el próximo sábado 10:00 y WhatsApp) y nunca se cierra.
 *
 * Mismos datos para los 3 frentes (pantalla gigante, kiosco, correo) de una ciudad.
 */

const EVENTS = {
  riobamba: {
    key: 'riobamba',
    city: 'Riobamba',
    standPrefix: 'rio',
    fairName: 'Primera feria del camión y la camioneta',
    venue: 'Quinta Macaji, Riobamba',
    mapsUrl: 'https://maps.app.goo.gl/85vgYb32eUSGj3CJ6',
    datesText: 'Viernes 13 al domingo 15 de noviembre de 2026',
    standText: 'Acércate al stand de Marketing VIP',
    closesAt: '2026-11-15T22:00:00-05:00'
  },
  ambato: {
    key: 'ambato',
    city: 'Ambato',
    standPrefix: 'amb',
    fairName: 'Autovitrina Comercial 2026',
    venue: 'Cámara de Comercio de Ambato',
    mapsUrl: 'https://maps.app.goo.gl/C3yG93gTgHzipK6MA',
    datesText: 'Viernes 13 al domingo 15 de noviembre de 2026',
    standText: 'Acércate al stand de Marketing VIP',
    closesAt: '2026-11-15T22:00:00-05:00'
  }
};

/** Evento histórico de la campaña de cuotas (correo con cita de sábado). */
const CUOTAS_EVENT = 'cuotas';

/**
 * Evento que corresponde a un enlace de correo SIN parámetro `ev` y con la clave `campana_cuotas`:
 * el correo ya enviado a los clientes de Riobamba (equivocadamente con el enlace de cuotas) debe mostrar la feria de Riobamba.
 */
const LEGACY_LINK_EVENT = 'riobamba';

function isFairEvent(event) {
  return typeof event === 'string' && Object.prototype.hasOwnProperty.call(EVENTS, event);
}

/**
 * Datos editados desde el Admin (tabla `event_settings`, migración 010), por evento. Los carga
 * services/eventSettings.js (con caché corta) y pisan a los valores por defecto de este archivo.
 * Sin tabla o sin fila, rigen los valores por defecto.
 */
let overrides = {};
function setEventOverrides(map) {
  overrides = map && typeof map === 'object' ? map : {};
}

/** Datos de la feria (por defecto + lo editado en el Admin), o null si el evento no es una feria. */
function getEventInfo(event) {
  if (!isFairEvent(event)) return null;
  return { ...EVENTS[event], ...(overrides[event] || {}) };
}

/** Feria cerrada: pasó la hora de cierre o el Admin la cerró manualmente (isOpen = false). */
function isEventClosed(event, now = new Date()) {
  const info = getEventInfo(event);
  if (!info) return false;
  if (info.isOpen === false) return true;
  return Boolean(info.closesAt && now > new Date(info.closesAt));
}

/** Versión segura para enviar al navegador. */
function publicEventInfo(event) {
  const info = getEventInfo(event);
  if (!info) return null;
  return {
    key: info.key,
    city: info.city,
    fairName: info.fairName,
    venue: info.venue,
    mapsUrl: info.mapsUrl,
    datesText: info.datesText,
    standText: info.standText,
    closesAt: info.closesAt
  };
}

module.exports = {
  EVENTS,
  CUOTAS_EVENT,
  LEGACY_LINK_EVENT,
  isFairEvent,
  getEventInfo,
  isEventClosed,
  publicEventInfo,
  setEventOverrides
};
