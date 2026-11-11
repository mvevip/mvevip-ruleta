/**
 * Catálogo de stands del Admin (espejo de api/src/config/stands.js).
 * Un "evento" agrupa frentes: la feria de Autos histórica (autos, ford, kiosco), cuotas (correo) y, por cada ciudad
 * (Riobamba y Ambato), la pantalla gigante, el kiosco y el correo, que comparten catálogo de premios y datos de la feria.
 */

export const STAND_META = {
  autos: {
    key: 'autos', event: 'autos', front: 'stand', emoji: '🏎️', short: 'AUTOS', title: 'AUTOS (PANTALLA 1)',
    banner: 'Editando Stand 1: AUTOS (/pantalla)', screenPath: '/pantalla', formPath: '/', tone: 'lime'
  },
  ford: {
    key: 'ford', event: 'ford', front: 'stand', emoji: '🚘', short: 'FORD', title: 'FORD (PANTALLA 2)',
    banner: 'Editando Stand 2: FORD (/pantalla2)', screenPath: '/pantalla2', formPath: '/formulario2', tone: 'ford', isFord: true
  },
  kiosk: {
    key: 'kiosk', event: 'kiosk', front: 'kiosk', emoji: '🖥️', short: 'KIOSCO', title: 'KIOSCO (2 PANTALLAS)',
    banner: 'Editando KIOSCO (ruleta arriba + botón abajo)', screenPath: '/pantalla/?screen=KIOSK_01', formPath: '/?screen=KIOSK_01', tone: 'fuchsia'
  },
  mail: {
    key: 'mail', event: 'cuotas', front: 'mail', emoji: '📧', short: 'CORREO', title: 'CORREO (CUOTAS)',
    banner: 'Editando Canal CORREO (campaña de cuotas)', screenPath: null, formPath: '/?view=mail&ev=cuotas', tone: 'amber'
  },
  gen_mail: {
    key: 'gen_mail', event: 'general', front: 'mail', emoji: '📬', short: 'GENERAL · CORREO', title: 'GENERAL · CORREO',
    banner: 'Editando campaña GENERAL · Correo (clientes normales)', screenPath: null, formPath: '/?view=mail&ev=general', tone: 'teal', isCampaign: true
  },
  rio_stand: {
    key: 'rio_stand', event: 'riobamba', front: 'stand', emoji: '🌄', short: 'RIOBAMBA · PANTALLA', title: 'RIOBAMBA · PANTALLA GIGANTE',
    banner: 'Editando RIOBAMBA · Pantalla gigante', screenPath: '/pantalla/?screen=RIO_STAND', formPath: '/?screen=RIO_STAND', tone: 'sky', isFair: true
  },
  rio_kiosk: {
    key: 'rio_kiosk', event: 'riobamba', front: 'kiosk', emoji: '🌄', short: 'RIOBAMBA · KIOSCO', title: 'RIOBAMBA · KIOSCO',
    banner: 'Editando RIOBAMBA · Kiosco (ruleta arriba + botón abajo)', screenPath: '/pantalla/?screen=RIO_KIOSK', formPath: '/?screen=RIO_KIOSK', tone: 'sky', isFair: true
  },
  rio_mail: {
    key: 'rio_mail', event: 'riobamba', front: 'mail', emoji: '🌄', short: 'RIOBAMBA · CORREO', title: 'RIOBAMBA · CORREO',
    banner: 'Editando RIOBAMBA · Correo (feria)', screenPath: null, formPath: '/?view=mail&ev=riobamba', tone: 'sky', isFair: true
  },
  amb_stand: {
    key: 'amb_stand', event: 'ambato', front: 'stand', emoji: '🏔️', short: 'AMBATO · PANTALLA', title: 'AMBATO · PANTALLA GIGANTE',
    banner: 'Editando AMBATO · Pantalla gigante', screenPath: '/pantalla/?screen=AMB_STAND', formPath: '/?screen=AMB_STAND', tone: 'rose', isFair: true
  },
  amb_kiosk: {
    key: 'amb_kiosk', event: 'ambato', front: 'kiosk', emoji: '🏔️', short: 'AMBATO · KIOSCO', title: 'AMBATO · KIOSCO',
    banner: 'Editando AMBATO · Kiosco (ruleta arriba + botón abajo)', screenPath: '/pantalla/?screen=AMB_KIOSK', formPath: '/?screen=AMB_KIOSK', tone: 'rose', isFair: true
  },
  amb_mail: {
    key: 'amb_mail', event: 'ambato', front: 'mail', emoji: '🏔️', short: 'AMBATO · CORREO', title: 'AMBATO · CORREO',
    banner: 'Editando AMBATO · Correo (feria)', screenPath: null, formPath: '/?view=mail&ev=ambato', tone: 'rose', isFair: true
  }
};

// Eventos del selector superior y los frentes de cada uno (segunda fila)
export const EVENT_GROUPS = [
  { key: 'autos', label: '🏎️ AUTOS', fronts: ['autos', 'ford', 'kiosk'], tone: 'lime' },
  { key: 'cuotas', label: '📧 CUOTAS', fronts: ['mail'], tone: 'amber' },
  { key: 'general', label: '📬 GENERAL', fronts: ['gen_mail'], tone: 'teal', campaign: true },
  { key: 'riobamba', label: '🌄 RIOBAMBA', fronts: ['rio_stand', 'rio_kiosk', 'rio_mail'], tone: 'sky', city: 'Riobamba', fair: true },
  { key: 'ambato', label: '🏔️ AMBATO', fronts: ['amb_stand', 'amb_kiosk', 'amb_mail'], tone: 'rose', city: 'Ambato', fair: true }
];

export const FRONT_LABEL = { stand: 'Pantalla', kiosk: 'Kiosco', mail: 'Correo' };

export function isKnownStand(key) {
  return Object.prototype.hasOwnProperty.call(STAND_META, key);
}

/** Grupo (evento del selector) al que pertenece un stand. */
export function groupOfStand(key) {
  return EVENT_GROUPS.find((g) => g.fronts.includes(key)) || EVENT_GROUPS[0];
}

// Clases de color por tono (selector, insignias y banner)
export const TONE = {
  lime: { active: 'bg-[#9AC31C] text-black shadow-[0_0_15px_rgba(154,195,28,0.4)]', badge: 'bg-[#9AC31C]/20 text-[#9AC31C] border border-[#9AC31C]/40', chip: 'bg-[#9AC31C] text-black' },
  ford: { active: 'bg-[#212650] text-white border border-blue-400/50 shadow-[0_0_15px_rgba(33,38,80,0.7)]', badge: 'bg-[#212650] text-white border border-blue-400/50', chip: 'bg-[#212650] text-white border border-blue-400/40' },
  amber: { active: 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]', badge: 'bg-amber-500/20 text-amber-300 border border-amber-400/40', chip: 'bg-amber-500 text-black' },
  fuchsia: { active: 'bg-fuchsia-500 text-black shadow-[0_0_15px_rgba(217,70,239,0.5)]', badge: 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/40', chip: 'bg-fuchsia-500 text-black' },
  sky: { active: 'bg-sky-500 text-black shadow-[0_0_15px_rgba(14,165,233,0.5)]', badge: 'bg-sky-500/20 text-sky-300 border border-sky-400/40', chip: 'bg-sky-500 text-black' },
  rose: { active: 'bg-rose-500 text-black shadow-[0_0_15px_rgba(244,63,94,0.5)]', badge: 'bg-rose-500/20 text-rose-300 border border-rose-400/40', chip: 'bg-rose-500 text-black' },
  teal: { active: 'bg-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.5)]', badge: 'bg-teal-500/20 text-teal-300 border border-teal-400/40', chip: 'bg-teal-500 text-white' }
};

// screen_id (como lo guarda la base de datos) -> stand del Admin
const SCREEN_TO_STAND = {
  STAND_01: 'autos', STAND_LOCAL: 'autos', STAND_02: 'ford', STAND_LOCAL_2: 'ford', MAIL_01: 'mail', KIOSK_01: 'kiosk',
  RIO_STAND: 'rio_stand', RIO_KIOSK: 'rio_kiosk', RIO_MAIL: 'rio_mail', AMB_STAND: 'amb_stand', AMB_KIOSK: 'amb_kiosk', AMB_MAIL: 'amb_mail', GEN_MAIL: 'gen_mail'
};
export function standOfScreenId(screenId) {
  return STAND_META[SCREEN_TO_STAND[screenId]] || STAND_META.autos;
}
