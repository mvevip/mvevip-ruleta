/**
 * Lógica de negocio para validación de datos de Ecuador,
 * cálculo de premios ponderados con límites diarios y generación de tickets VIP.
 */

// Validación y normalización de número celular de Ecuador
function validateAndFormatEcuadorPhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { valid: false, message: 'El número de celular es obligatorio.' };
  }

  // Eliminar espacios, guiones, paréntesis y símbolos
  let clean = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '');

  // Si pegó el código de país +593 o 593, convertirlo a formato nacional 09...
  if (clean.startsWith('+593')) {
    clean = '0' + clean.slice(4);
  } else if (clean.startsWith('593') && clean.length === 12) {
    clean = '0' + clean.slice(3);
  }

  // Si empezó en 9 y tiene 9 dígitos, anteponer el 0 (ej. 991234567 -> 0991234567)
  if (clean.startsWith('9') && clean.length === 9) {
    clean = '0' + clean;
  }

  // En Ecuador: exactamente 10 dígitos y empieza con '09'
  const ecuadorPhoneRegex = /^09\d{8}$/;
  if (!ecuadorPhoneRegex.test(clean)) {
    return {
      valid: false,
      message: 'El celular debe ser un número válido de Ecuador (10 dígitos comenzando con 09, ej: 0991234567).'
    };
  }

  return { valid: true, phone: clean };
}

// Validación de correo electrónico
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'El correo electrónico es obligatorio.' };
  }

  const clean = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(clean)) {
    return {
      valid: false,
      message: 'Ingresa un formato de correo electrónico válido (ej: usuario@gmail.com).'
    };
  }

  return { valid: true, email: clean };
}

// Sorteo ponderado entre una lista de premios (peso > 0). Si todos tienen peso 0, parejo.
function weightedPick(list) {
  const totalWeight = list.reduce((sum, p) => sum + Math.max(Number(p.weight) || 0, 0), 0);
  if (totalWeight <= 0) return list[Math.floor(Math.random() * list.length)];
  let randomValue = Math.random() * totalWeight;
  for (const prize of list) {
    const weight = Math.max(Number(prize.weight) || 0, 0);
    if (randomValue < weight) return prize;
    randomValue -= weight;
  }
  return list[list.length - 1];
}

// Selección de premio considerando stock, pesos ponderados y límites diarios
function selectWeightedPrize(prizes, todayPrizesCountMap = {}) {
  if (!prizes || prizes.length === 0) {
    throw new Error('No hay premios disponibles configurados');
  }

  const hasStock = (p) => (p.active === undefined || p.active) && (p.stock === undefined || Number(p.stock) > 0);

  // Premios elegibles: activos, con stock y que no hayan alcanzado su límite diario (max_daily_wins > 0)
  const eligiblePrizes = prizes.filter(p => {
    if (!hasStock(p)) return false;
    if (Number(p.max_daily_wins) > 0) {
      const winsToday = Number(todayPrizesCountMap[p.id]) || 0;
      if (winsToday >= Number(p.max_daily_wins)) return false; // límite diario alcanzado
    }
    return (Number(p.weight) || 0) > 0;
  });
  if (eligiblePrizes.length > 0) return weightedPick(eligiblePrizes);

  // Todos alcanzaron su límite diario (o tienen peso 0): se sortea entre TODOS los que aún tienen stock respetando
  // sus pesos. Antes se devolvía siempre el primero de la lista y, al agotarse los límites diarios, salía el mismo
  // premio para todos los participantes del resto del día.
  const withStock = prizes.filter(hasStock);
  if (withStock.length > 0) return weightedPick(withStock);

  return prizes[0]; // sin stock en ningún premio: el llamador ya valida el stock real
}

// Inicio del día de hoy en Ecuador (UTC-5, sin horario de verano) expresado en UTC ('YYYY-MM-DD HH:MM:SS'), que es
// la hora en que MySQL/RDS guarda created_at. Sirve para contar los premios entregados "hoy" en hora de Quito.
function quitoDayStartUtc(now = new Date()) {
  const quito = new Date(now.getTime() - 5 * 3600 * 1000);
  const y = quito.getUTCFullYear();
  const m = quito.getUTCMonth();
  const d = quito.getUTCDate();
  return new Date(Date.UTC(y, m, d, 5, 0, 0)).toISOString().slice(0, 19).replace('T', ' ');
}

// Generador de código único de ticket
function generateTicketCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomStr = '';
  for (let i = 0; i < 4; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `VIP-${randomStr}`;
}

module.exports = {
  validateAndFormatEcuadorPhone,
  validateEmail,
  selectWeightedPrize,
  quitoDayStartUtc,
  generateTicketCode
};
