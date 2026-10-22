/**
 * Íconos de viaje disponibles para los premios (ruleta del canal Correo).
 * El API solo acepta estas llaves; el dibujo vive en los frontends
 * (frontend-mobile/src/utils/prizeIcons.js y frontend-admin/src/utils/prizeIcons.js: mantener las llaves iguales).
 */
const PRIZE_ICON_KEYS = [
  'plane', 'plane-takeoff', 'luggage', 'backpack', 'camera', 'hotel', 'bed', 'palmtree', 'umbrella',
  'ship', 'sailboat', 'map', 'map-pin', 'compass', 'globe', 'ticket', 'ticket-percent', 'stamp',
  'passport', 'gift', 'banknote', 'wallet', 'percent', 'badge-dollar', 'sun', 'waves', 'mountain',
  'tent', 'car', 'utensils', 'wine', 'star', 'crown', 'gem', 'heart', 'sparkles', 'fish', 'anchor',
  'landmark', 'castle'
];

/** '' / null -> null (sin ícono). Llave desconocida -> undefined (inválida). */
function normalizePrizeIcon(value) {
  if (value === undefined || value === null || value === '') return null;
  const key = String(value).trim().toLowerCase();
  return PRIZE_ICON_KEYS.includes(key) ? key : undefined;
}

module.exports = { PRIZE_ICON_KEYS, normalizePrizeIcon };
