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
 * Canal Correo (campaña Brevo): `/?view=mail`. Misma marca Autos, pero el cliente juega desde su
 * propio dispositivo (ruleta incluida en el celular, sin pantalla de stand, sin cola, sin sockets).
 */
export function detectMailView() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return (params.get('view') || '').toLowerCase() === 'mail';
}

export function getMobileBrandConfig() {
  const brand = detectMobileBrand();
  const isFord = brand === 'ford';
  const isMail = !isFord && detectMailView();

  // Si es /formulario2, SIEMPRE apunta a la pantalla 2 (STAND_02 / STAND_LOCAL_2)
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const rawScreen = params.get('screen');

  let screenId;
  if (isMail) {
    screenId = 'MAIL_01';
  } else if (isFord) {
    screenId = (rawScreen === 'STAND_02' || rawScreen === 'STAND_LOCAL_2')
      ? rawScreen
      : (isProduction ? 'STAND_02' : 'STAND_LOCAL_2');
  } else {
    screenId = rawScreen || (isProduction ? 'STAND_01' : 'STAND_LOCAL');
  }

  return {
    key: isMail ? 'mail' : brand,
    isFord,
    isMail,
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
