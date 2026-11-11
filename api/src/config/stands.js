/**
 * Catálogo de stands. Un "stand" agrupa un formulario + una pantalla.
 *  - autos: Formulario `/` + Pantalla `/pantalla`   (screen_id STAND_01 / STAND_LOCAL)
 *  - ford:  Formulario `/formulario2` + Pantalla `/pantalla2` (screen_id STAND_02 / STAND_LOCAL_2)
 *  - mail:  Campaña por correo `/?view=mail` (screen_id MAIL_01). Sin pantalla física, sin cola ni sockets.
 *  - kiosk: Kiosco de 2 pantallas (screen_id KIOSK_01): arriba ruleta (`/pantalla/?screen=KIOSK_01`), abajo botón (`?view=kiosk-button`),
 *           celular `/?screen=KIOSK_01`. El giro lo dispara el botón del kiosco, no el celular.
 *  - general: campaña de correo para clientes normales (`/?view=mail&ev=general`, screen_id GEN_MAIL, pool de premios `gen`).
 *  - Ferias (Riobamba / Ambato, 13-15 nov 2026): cada ciudad tiene 3 frentes (pantalla gigante, kiosco, correo) que
 *    COMPARTEN un mismo catálogo de premios (`prizePool`) y una sola participación por persona (`event`).
 *      rio_stand / rio_kiosk / rio_mail  -> screen_id RIO_STAND / RIO_KIOSK / RIO_MAIL (pool `rio`)
 *      amb_stand / amb_kiosk / amb_mail  -> screen_id AMB_STAND / AMB_KIOSK / AMB_MAIL (pool `amb`)
 * Cada stand declara: `event` (grupo con una sola participación por persona), `front` (stand | kiosk | mail) y
 * `prizePool` (valor de prizes.stand del que descuenta). Para los stands históricos event = su propia clave.
 * El servidor deriva siempre el stand desde valores validados (lista blanca).
 */

const DEFAULT_STAND = 'autos';

const SCREEN_TO_STAND = {
  STAND_01: 'autos',
  STAND_LOCAL: 'autos',
  STAND_02: 'ford',
  STAND_LOCAL_2: 'ford',
  MAIL_01: 'mail',
  KIOSK_01: 'kiosk',
  RIO_STAND: 'rio_stand',
  RIO_KIOSK: 'rio_kiosk',
  RIO_MAIL: 'rio_mail',
  AMB_STAND: 'amb_stand',
  AMB_KIOSK: 'amb_kiosk',
  AMB_MAIL: 'amb_mail',
  GEN_MAIL: 'gen_mail'
};

const STANDS = {
  autos: {
    key: 'autos',
    event: 'autos',
    front: 'stand',
    label: 'Autos',
    screenIds: ['STAND_01', 'STAND_LOCAL'],
    displayPrefix: '',
    syncKey: 'global_displays'
  },
  ford: {
    key: 'ford',
    event: 'ford',
    front: 'stand',
    label: 'Ford',
    screenIds: ['STAND_02', 'STAND_LOCAL_2'],
    displayPrefix: 'ford_',
    syncKey: 'displays_ford'
  },
  mail: {
    key: 'mail',
    event: 'cuotas',
    front: 'mail',
    label: 'Correo',
    screenIds: ['MAIL_01'],
    displayPrefix: 'mail_',
    syncKey: 'displays_mail'
  },
  kiosk: {
    key: 'kiosk',
    event: 'kiosk',
    front: 'kiosk',
    label: 'Kiosco',
    screenIds: ['KIOSK_01'],
    displayPrefix: 'kiosk_',
    syncKey: 'displays_kiosk'
  }
};

// Campaña de correo GENERAL (clientes normales): solo frente de correo, catálogo propio (pool 'gen'), sin pantalla ni kiosco.
STANDS.gen_mail = {
  key: 'gen_mail',
  event: 'general',
  front: 'mail',
  prizePool: 'gen',
  label: 'General · Correo',
  screenIds: ['GEN_MAIL'],
  displayPrefix: 'gen_mail_',
  syncKey: 'displays_gen_mail'
};

// Ferias: 3 frentes por ciudad. prizePool = catálogo compartido por ciudad; event = una participación por ciudad.
[
  { event: 'riobamba', prefix: 'rio', city: 'Riobamba', id: 'RIO' },
  { event: 'ambato', prefix: 'amb', city: 'Ambato', id: 'AMB' }
].forEach(({ event, prefix, city, id }) => {
  [
    { front: 'stand', suffix: 'STAND', label: 'Pantalla' },
    { front: 'kiosk', suffix: 'KIOSK', label: 'Kiosco' },
    { front: 'mail', suffix: 'MAIL', label: 'Correo' }
  ].forEach(({ front, suffix, label }) => {
    const key = `${prefix}_${front}`;
    STANDS[key] = {
      key,
      event,
      front,
      prizePool: prefix,
      label: `${city} · ${label}`,
      screenIds: [`${id}_${suffix}`],
      displayPrefix: `${key}_`,
      syncKey: `displays_${key}`
    };
  });
});

/** Catálogo de premios del que descuenta un stand (compartido por ciudad en las ferias; por defecto, el propio). */
function prizePoolOf(stand) {
  return STANDS[stand] && STANDS[stand].prizePool ? STANDS[stand].prizePool : (STANDS[stand] ? stand : DEFAULT_STAND);
}

/** Stands que comparten un catálogo de premios (p. ej. 'rio' -> rio_stand, rio_kiosk, rio_mail). */
function standsOfPrizePool(pool) {
  const keys = Object.values(STANDS).filter((st) => prizePoolOf(st.key) === pool).map((st) => st.key);
  return keys.length > 0 ? keys : [pool];
}

/** Evento (grupo con una sola participación por persona) de un stand. */
function eventOf(stand) {
  return STANDS[stand] ? STANDS[stand].event : DEFAULT_STAND;
}

/** screen_id de TODOS los frentes de un evento (p. ej. riobamba -> RIO_STAND, RIO_KIOSK, RIO_MAIL). */
function screenIdsOfEvent(event) {
  return Object.values(STANDS).filter((st) => st.event === event).flatMap((st) => st.screenIds);
}

/** ¿El stand es el frente de correo? (cuotas o feria) */
function isMailStand(stand) {
  return Boolean(STANDS[stand]) && STANDS[stand].front === 'mail';
}

/** Stand de correo de un evento (cuotas -> mail, riobamba -> rio_mail, ambato -> amb_mail) o null. */
function mailStandOfEvent(event) {
  const found = Object.values(STANDS).find((st) => st.event === event && st.front === 'mail');
  return found ? found.key : null;
}

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
  prizePoolOf,
  standsOfPrizePool,
  eventOf,
  screenIdsOfEvent,
  isMailStand,
  mailStandOfEvent,
  displayKey,
  syncKeyOf
};
