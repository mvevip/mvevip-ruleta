/**
 * Catálogo de stands. Un "stand" agrupa un formulario + una pantalla.
 *  - autos: Formulario `/` + Pantalla `/pantalla`   (screen_id STAND_01 / STAND_LOCAL)
 *  - ford:  Formulario `/formulario2` + Pantalla `/pantalla2` (screen_id STAND_02 / STAND_LOCAL_2)
 *  - mail:  Campaña por correo `/?view=mail` (screen_id MAIL_01). Sin pantalla física, sin cola ni sockets.
 * El servidor deriva siempre el stand desde valores validados (lista blanca).
 */

const DEFAULT_STAND = 'autos';

const SCREEN_TO_STAND = {
  STAND_01: 'autos',
  STAND_LOCAL: 'autos',
  STAND_02: 'ford',
  STAND_LOCAL_2: 'ford',
  MAIL_01: 'mail'
};

const STANDS = {
  autos: {
    key: 'autos',
    label: 'Autos',
    screenIds: ['STAND_01', 'STAND_LOCAL'],
    displayPrefix: '',
    syncKey: 'global_displays'
  },
  ford: {
    key: 'ford',
    label: 'Ford',
    screenIds: ['STAND_02', 'STAND_LOCAL_2'],
    displayPrefix: 'ford_',
    syncKey: 'displays_ford'
  },
  mail: {
    key: 'mail',
    label: 'Correo',
    screenIds: ['MAIL_01'],
    displayPrefix: 'mail_',
    syncKey: 'displays_mail'
  }
};

function isValidStand(stand) {
  return typeof stand === 'string' && Object.prototype.hasOwnProperty.call(STANDS, stand);
}

function standFromScreenId(screenId) {
  return SCREEN_TO_STAND[screenId] || null;
}

/**
 * Resuelve el stand de una petición:
 *  1. ?stand= / body.stand / header x-stand (válido)
 *  2. screen_id (query/body) mapeado
 *  3. 'autos' (comportamiento histórico)
 */
function resolveStand(req) {
  const explicit = (req.query && req.query.stand) || (req.body && req.body.stand) || req.headers['x-stand'];
  if (isValidStand(explicit)) return explicit;
  const screenId = (req.query && req.query.screen_id) || (req.body && req.body.screen_id);
  const fromScreen = standFromScreenId(screenId);
  return fromScreen || DEFAULT_STAND;
}

/** Valida un screen_id recibido; si es desconocido devuelve el fallback. */
function normalizeScreenId(screenId, fallback) {
  return SCREEN_TO_STAND[screenId] ? screenId : fallback;
}

function screenIdsOf(stand) {
  return STANDS[stand] ? STANDS[stand].screenIds : STANDS[DEFAULT_STAND].screenIds;
}

/**
 * screen_id de todos los stands que NO son 'autos'. 'autos' es el stand histórico:
 * se define por exclusión (todo lo que no pertenece a otro stand).
 */
function nonAutosScreenIds() {
  return Object.values(STANDS)
    .filter((st) => st.key !== DEFAULT_STAND)
    .flatMap((st) => st.screenIds);
}

function displayKey(stand, key) {
  return `${STANDS[stand] ? STANDS[stand].displayPrefix : ''}${key}`;
}

function syncKeyOf(stand) {
  return STANDS[stand] ? STANDS[stand].syncKey : STANDS[DEFAULT_STAND].syncKey;
}

module.exports = {
  DEFAULT_STAND,
  STANDS,
  isValidStand,
  standFromScreenId,
  resolveStand,
  normalizeScreenId,
  screenIdsOf,
  nonAutosScreenIds,
  displayKey,
  syncKeyOf
};
