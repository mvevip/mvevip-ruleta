/**
 * Pantallas de las ferias (Riobamba / Ambato): se reconocen por ?screen=RIO_STAND | RIO_KIOSK | AMB_STAND | AMB_KIOSK
 * (o ?stand=rio_stand, etc.). Se ven con la marca Marketing VIP (como Autos); lo único que cambia es el stand del API
 * (catálogo y configuración de pantalla propios) y el screen_id (sala, cola y QR).
 */
const FAIR_SCREENS = {
  RIO_STAND: { stand: 'rio_stand', event: 'riobamba', city: 'Riobamba', fairName: 'Primera feria del camión y la camioneta', kiosk: false },
  RIO_KIOSK: { stand: 'rio_kiosk', event: 'riobamba', city: 'Riobamba', fairName: 'Primera feria del camión y la camioneta', kiosk: true },
  AMB_STAND: { stand: 'amb_stand', event: 'ambato', city: 'Ambato', fairName: 'Autovitrina Comercial 2026', kiosk: false },
  AMB_KIOSK: { stand: 'amb_kiosk', event: 'ambato', city: 'Ambato', fairName: 'Autovitrina Comercial 2026', kiosk: true }
};

function detectFairScreen() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const screenParam = (params.get('screen') || '').toUpperCase();
  const standParam = (params.get('stand') || '').toLowerCase();
  if (FAIR_SCREENS[screenParam]) return { screenId: screenParam, ...FAIR_SCREENS[screenParam] };
  const found = Object.entries(FAIR_SCREENS).find(([, v]) => v.stand === standParam);
  return found ? { screenId: found[0], ...found[1] } : null;
}

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
  // Ferias: misma marca Marketing VIP que Autos
  return 'autos';
}

export function getScreenBrandConfig() {
  const brand = detectScreenBrand();
  const isFord = brand === 'ford';
  const fair = brand === 'autos' ? detectFairScreen() : null; // feria de Riobamba / Ambato (o null)
  const isKiosk = brand === 'kiosk' || Boolean(fair && fair.kiosk);

  const isProduction = typeof window !== 'undefined' && (
    window.location.hostname === 'autos.mvevip.com' ||
    window.location.hostname.endsWith('.mvevip.com') ||
    window.location.hostname.endsWith('.cloudfront.net')
  );

  const defaultScreenId = fair
    ? fair.screenId
    : isKiosk
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
    stand: fair ? fair.stand : isKiosk ? 'kiosk' : isFord ? 'ford' : 'autos',
    // Fase de imágenes entre el video y la ruleta: pantallas gigantes de las ferias (RIO_STAND, AMB_STAND). ?images=1|0 fuerza (pruebas)
    imageInterlude: (() => {
      const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('images') : null;
      if (q === '1') return true;
      if (q === '0') return false;
      return Boolean(fair && !fair.kiosk);
    })(),
    fairEvent: fair ? fair.event : null, // 'riobamba' | 'ambato' | null
    fairCity: fair ? fair.city : null,
    fairName: fair ? fair.fairName : null,
    screenId: defaultScreenId,
    mobileUrl,
    name: isFord ? 'Ford | Quito Motors' : 'Marketing VIP',
    tagline: isFord ? 'Quito Motors • Stand Oficial' : 'Especialistas en Sueños',
    subTagline: isFord ? 'Feria Automotriz • Ford Oficial' : fair ? fair.fairName : 'Feria Automotriz Oficial',
    logoSrc: isFord ? '/logo_ford.jpeg' : '/logotipo.png',
    logoFallbackSrc: isFord ? '/pantalla/logo_ford.jpeg' : '/pantalla/logotipo.png',
    logoAlt: isFord ? 'Ford | Quito Motors' : 'Marketing VIP',
    accent: isFord ? '#212650' : '#9AC31C',
    accentLight: isFord ? '#3b82f6' : '#9AC31C',
    onAccent: isFord ? '#ffffff' : '#000000',
    footerTitle: isFord
      ? 'Ford • Quito Motors — Edición Feria Automotriz 2026'
      : fair
        ? `Marketing VIP • ${fair.fairName}`
        : 'Marketing VIP • Edición Feria Automotriz 2026',
    footerSub: isFord
      ? 'Premios Oficiales • Experiencias • Souvenirs Ford'
      : 'Viajes • Bonos • Experiencias All-Inclusive • Souvenirs'
  };
}
