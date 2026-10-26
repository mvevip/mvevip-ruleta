export function detectScreenBrand() {
  if (typeof window === 'undefined') return 'autos';
  const pathname = window.location.pathname || '/';
  const params = new URLSearchParams(window.location.search);
  const screenParam = (params.get('screen') || '').toUpperCase();
  const standParam = (params.get('stand') || '').toLowerCase();

  if (
    pathname.startsWith('/pantalla2') ||
    pathname.includes('/pantalla2') ||
    standParam === 'ford' ||
    screenParam === 'STAND_02' ||
    screenParam === 'STAND_LOCAL_2' ||
    screenParam === 'PANTALLA_2'
  ) {
    return 'ford';
  }

  // Kiosco de 2 pantallas (arriba: ruleta / abajo: botón): /pantalla/?screen=KIOSK_01
  if (standParam === 'kiosk' || screenParam === 'KIOSK_01') {
    return 'kiosk';
  }
  return 'autos';
}

export function getScreenBrandConfig() {
  const brand = detectScreenBrand();
  const isFord = brand === 'ford';
  const isKiosk = brand === 'kiosk';

  const isProduction = typeof window !== 'undefined' && (
    window.location.hostname === 'autos.mvevip.com' ||
    window.location.hostname.endsWith('.mvevip.com') ||
    window.location.hostname.endsWith('.cloudfront.net')
  );

  const defaultScreenId = isKiosk
    ? 'KIOSK_01'
    : isFord
      ? (isProduction ? 'STAND_02' : 'STAND_LOCAL_2')
      : (isProduction ? 'STAND_01' : 'STAND_LOCAL');

  const baseMobileOrigin = isProduction
    ? (typeof window !== 'undefined' ? `${window.location.origin}` : 'https://autos.mvevip.com')
    : (import.meta.env.VITE_MOBILE_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5503` : 'http://localhost:5503'));

  const cleanOrigin = baseMobileOrigin.replace(/\/+$/, '');
  const mobileUrl = isFord ? `${cleanOrigin}/formulario2` : `${cleanOrigin}/`;

  return {
    brand,
    isFord,
    isKiosk,
    stand: isKiosk ? 'kiosk' : isFord ? 'ford' : 'autos',
    screenId: defaultScreenId,
    mobileUrl,
    name: isFord ? 'Ford | Quito Motors' : 'Marketing VIP',
    tagline: isFord ? 'Quito Motors • Stand Oficial' : 'Especialistas en Sueños',
    subTagline: isFord ? 'Feria Automotriz • Ford Oficial' : 'Feria Automotriz Oficial',
    logoSrc: isFord ? '/logo_ford.jpeg' : '/logotipo.png',
    logoFallbackSrc: isFord ? '/pantalla/logo_ford.jpeg' : '/pantalla/logotipo.png',
    logoAlt: isFord ? 'Ford | Quito Motors' : 'Marketing VIP',
    accent: isFord ? '#212650' : '#9AC31C',
    accentLight: isFord ? '#3b82f6' : '#9AC31C',
    onAccent: isFord ? '#ffffff' : '#000000',
    footerTitle: isFord
      ? 'Ford • Quito Motors — Edición Feria Automotriz 2026'
      : 'Marketing VIP • Edición Feria Automotriz 2026',
    footerSub: isFord
      ? 'Premios Oficiales • Experiencias • Souvenirs Ford'
      : 'Viajes • Bonos • Experiencias All-Inclusive • Souvenirs'
  };
}
