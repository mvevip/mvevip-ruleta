/**
 * Detección de marca / stand en el formulario móvil.
 *  - Ruta `/formulario2` (o ?screen=STAND_02 / STAND_LOCAL_2) -> marca 'ford'
 *  - Ruta `/` (por defecto) -> marca 'autos' (comportamiento actual intacto)
 */

const isProduction = typeof window !== 'undefined' && (
  window.location.hostname === 'autos.mvevip.com' ||
  window.location.hostname.endsWith('.mvevip.com')
);

export function detectMobileBrand() {
  if (typeof window === 'undefined') return 'autos';
  const path = (window.location.pathname || '').toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const screenParam = (params.get('screen') || '').toUpperCase();
  const brandParam = (params.get('brand') || params.get('stand') || '').toLowerCase();

  if (
    path.startsWith('/formulario2') ||
    screenParam === 'STAND_02' ||
    screenParam === 'STAND_LOCAL_2' ||
    brandParam === 'ford'
  ) {
    return 'ford';
  }
  return 'autos';
}

/**
 * Evento del canal Correo. Misma regla que el servidor (api/src/services/mailLookup.js, resolveMailEvent):
 *  - ?ev=riobamba | ambato | cuotas manda;
 *  - sin ev, la clave del enlace decide: campana_cuotas (el enlace ya enviado a los clientes de Riobamba) y
 *    feria_riobamba -> Riobamba, feria_ambato -> Ambato;
 *  - sin clave -> cuotas (enlace "pelado" /?view=mail).
 * Se calcula UNA sola vez al abrir la página: después la app quita `c` de la URL (y fija `ev`), y recalcularlo
 * cambiaría el evento a mitad de la sesión.
 */
const MAIL_EVENTS = {
  cuotas: { screenId: 'MAIL_01', stand: 'mail', label: 'Cuotas' },
  riobamba: { screenId: 'RIO_MAIL', stand: 'rio_mail', label: 'Riobamba' },
  ambato: { screenId: 'AMB_MAIL', stand: 'amb_mail', label: 'Ambato' }
};
const KEY_DEFAULT_EVENT = { campana_cuotas: 'riobamba', feria_riobamba: 'riobamba', feria_ambato: 'ambato' };
let cachedMailEvent = null;

export function resolveMailEvent() {
  if (cachedMailEvent) return cachedMailEvent;
  let event = 'cuotas';
  try {
    const params = new URLSearchParams(window.location.search);
    const ev = (params.get('ev') || '').trim().toLowerCase();
    const key = (params.get('c') || '').trim();
    if (MAIL_EVENTS[ev]) event = ev;
    else if (KEY_DEFAULT_EVENT[key]) event = KEY_DEFAULT_EVENT[key];
  } catch (e) {
    event = 'cuotas';
  }
  cachedMailEvent = event;
  return event;
}

/**
 * Canal que pide la URL actual, para decidir si se puede entrar o hay que ir al canal por defecto:
 *  - 'mail'  -> ?view=mail
 *  - 'ford'  -> /formulario2, ?screen=STAND_02 / STAND_LOCAL_2, ?stand=ford
 *  - 'autos' -> acceso EXPLÍCITO al stand Autos: ?screen=STAND_01 / STAND_LOCAL (el QR de la pantalla lo incluye siempre) o ?stand=autos
 *  - null    -> enlace "pelado" (sin parámetros): se resuelve con el canal por defecto del admin
 */
export function detectRequestedChannel() {
  if (typeof window === 'undefined') return null;
  const path = (window.location.pathname || '').toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const view = (params.get('view') || '').toLowerCase();
  const screenParam = (params.get('screen') || '').toUpperCase();
  const stand = (params.get('stand') || params.get('brand') || '').toLowerCase();

  // Correo: cuotas es el canal 'mail' (se puede habilitar/deshabilitar en el admin); las ferias tienen el suyo
  if (view === 'mail') return MAIL_EVENTS[resolveMailEvent()].stand;
  if (screenParam === 'KIOSK_01' || stand === 'kiosk') return 'kiosk';
  if (path.startsWith('/formulario2') || screenParam === 'STAND_02' || screenParam === 'STAND_LOCAL_2' || stand === 'ford') return 'ford';
  if (screenParam === 'STAND_01' || screenParam === 'STAND_LOCAL' || stand === 'autos') return 'autos';
  return null;
}

/** URL EXPLÍCITA de cada canal (nunca "pelada", para que el destino no vuelva a resolverse por defecto). */
export function channelUrl(channel) {
  if (channel === 'mail') return '/?view=mail';
  if (channel === 'ford') return '/formulario2';
  return `/?screen=${isProduction ? 'STAND_01' : 'STAND_LOCAL'}`;
}

/**
 * Canal Correo (campaña Brevo): `/?view=mail`. Misma marca Autos, pero el cliente juega desde su
 * propio dispositivo (ruleta incluida en el celular, sin pantalla de stand, sin cola, sin sockets).
 */
export function detectMailView() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return (params.get('view') || '').toLowerCase() === 'mail';
}

/**
 * Kiosco de 2 pantallas: `/?screen=KIOSK_01` (el QR de la pantalla de arriba lo incluye siempre).
 * El celular solo se registra; el giro lo dispara el botón de la pantalla de abajo.
 */
export function detectKioskView() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const screenParam = (params.get('screen') || '').toUpperCase();
  const stand = (params.get('stand') || params.get('brand') || '').toLowerCase();
  return screenParam === 'KIOSK_01' || stand === 'kiosk';
}

export function getMobileBrandConfig() {
  const brand = detectMobileBrand();
  const isFord = brand === 'ford';
  const isKiosk = !isFord && detectKioskView();
  const isMail = !isFord && !isKiosk && detectMailView();

  // Si es /formulario2, SIEMPRE apunta a la pantalla 2 (STAND_02 / STAND_LOCAL_2)
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const rawScreen = params.get('screen');

  let screenId;
  if (isKiosk) {
    screenId = 'KIOSK_01';
  } else if (isMail) {
    screenId = MAIL_EVENTS[resolveMailEvent()].screenId;
  } else if (isFord) {
    screenId = (rawScreen === 'STAND_02' || rawScreen === 'STAND_LOCAL_2')
      ? rawScreen
      : (isProduction ? 'STAND_02' : 'STAND_LOCAL_2');
  } else {
    screenId = rawScreen || (isProduction ? 'STAND_01' : 'STAND_LOCAL');
  }

  const mailEvent = isMail ? resolveMailEvent() : null; // 'cuotas' | 'riobamba' | 'ambato'

  return {
    key: isKiosk ? 'kiosk' : isMail ? 'mail' : brand,
    isFord,
    isKiosk,
    isMail,
    mailEvent,
    isFair: Boolean(mailEvent) && mailEvent !== 'cuotas', // feria de Riobamba / Ambato (no cuotas)
    mailStand: isMail ? MAIL_EVENTS[mailEvent].stand : null, // stand del API: 'mail' | 'rio_mail' | 'amb_mail'
    screenId,
    logoSrc: isFord ? '/logo_ford.jpeg' : '/logotipo.png',
    logoAlt: isFord ? 'Ford | Quito Motors' : 'Marketing VIP',
    accent: isFord ? '#212650' : '#9AC31C',
    accentDark: isFord ? '#171b3a' : '#7A9E14',
    onAccent: isFord ? '#ffffff' : '#000000',
    footerText: isFord
      ? 'Ford • Quito Motors • Stand Feria Automotriz 2026'
      : isMail
        ? 'Marketing VIP • Especialistas en sueños'
        : 'Marketing VIP • Especialistas en sueños • Stand Feria Automotriz 2026'
  };
}

export function applyMobileBrandAttribute() {
  if (typeof document === 'undefined') return;
  const cfg = getMobileBrandConfig();
  if (cfg.isFord) {
    document.documentElement.setAttribute('data-brand', 'ford');
    document.title = 'Ford | Quito Motors - Ruleta de Premios';
  } else {
    document.documentElement.removeAttribute('data-brand');
  }
}
