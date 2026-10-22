import {
  Plane, PlaneTakeoff, Luggage, Backpack, Camera, Hotel, BedDouble, TreePalm, Umbrella, Ship, Sailboat,
  Map, MapPin, Compass, Globe, Ticket, TicketPercent, Stamp, BookUser, Gift, Banknote, Wallet, Percent,
  BadgeDollarSign, Sun, Waves, Mountain, Tent, Car, Utensils, Wine, Star, Crown, Gem, Heart, Sparkles,
  Fish, Anchor, Landmark, Castle
} from 'lucide-react';

/**
 * Íconos de viaje para los premios. Las llaves deben coincidir con
 * api/src/config/prizeIcons.js y frontend-admin/src/utils/prizeIcons.js.
 */
export const PRIZE_ICONS = [
  { key: 'plane', label: 'Avión', Icon: Plane },
  { key: 'plane-takeoff', label: 'Vuelo', Icon: PlaneTakeoff },
  { key: 'luggage', label: 'Maleta', Icon: Luggage },
  { key: 'backpack', label: 'Mochila / kit viajero', Icon: Backpack },
  { key: 'camera', label: 'Cámara / fotos', Icon: Camera },
  { key: 'hotel', label: 'Hotel', Icon: Hotel },
  { key: 'bed', label: 'Habitación', Icon: BedDouble },
  { key: 'palmtree', label: 'Playa / isla', Icon: TreePalm },
  { key: 'umbrella', label: 'Sombrilla', Icon: Umbrella },
  { key: 'ship', label: 'Crucero', Icon: Ship },
  { key: 'sailboat', label: 'Velero', Icon: Sailboat },
  { key: 'map', label: 'Mapa / tour', Icon: Map },
  { key: 'map-pin', label: 'Destino', Icon: MapPin },
  { key: 'compass', label: 'Aventura', Icon: Compass },
  { key: 'globe', label: 'Internacional', Icon: Globe },
  { key: 'ticket', label: 'Boleto', Icon: Ticket },
  { key: 'ticket-percent', label: 'Boleto con descuento', Icon: TicketPercent },
  { key: 'stamp', label: 'Visa / sello', Icon: Stamp },
  { key: 'passport', label: 'Pasaporte', Icon: BookUser },
  { key: 'gift', label: 'Regalo', Icon: Gift },
  { key: 'banknote', label: 'Bono en dinero', Icon: Banknote },
  { key: 'wallet', label: 'Billetera', Icon: Wallet },
  { key: 'percent', label: 'Descuento %', Icon: Percent },
  { key: 'badge-dollar', label: 'Bono $', Icon: BadgeDollarSign },
  { key: 'sun', label: 'Sol', Icon: Sun },
  { key: 'waves', label: 'Mar', Icon: Waves },
  { key: 'mountain', label: 'Montaña', Icon: Mountain },
  { key: 'tent', label: 'Camping', Icon: Tent },
  { key: 'car', label: 'Auto / traslado', Icon: Car },
  { key: 'utensils', label: 'Comida', Icon: Utensils },
  { key: 'wine', label: 'Cena / bebida', Icon: Wine },
  { key: 'star', label: 'Estrella', Icon: Star },
  { key: 'crown', label: 'VIP', Icon: Crown },
  { key: 'gem', label: 'Premium', Icon: Gem },
  { key: 'heart', label: 'Luna de miel', Icon: Heart },
  { key: 'sparkles', label: 'Sorpresa', Icon: Sparkles },
  { key: 'fish', label: 'Pesca / buceo', Icon: Fish },
  { key: 'anchor', label: 'Puerto', Icon: Anchor },
  { key: 'landmark', label: 'Monumento', Icon: Landmark },
  { key: 'castle', label: 'Castillo', Icon: Castle }
];

const BY_KEY = Object.fromEntries(PRIZE_ICONS.map((i) => [i.key, i]));

/** Devuelve el componente de ícono para una llave, o null si no existe / no hay ícono. */
export function getPrizeIcon(key) {
  return (key && BY_KEY[key] && BY_KEY[key].Icon) || null;
}
