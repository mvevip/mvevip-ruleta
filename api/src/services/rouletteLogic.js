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

// Selección de premio considerando stock, pesos ponderados y límites diarios
function selectWeightedPrize(prizes, todayPrizesCountMap = {}) {
  if (!prizes || prizes.length === 0) {
    throw new Error('No hay premios disponibles configurados');
  }

  // Filtrar premios que cumplan:
  // 1. Activo
  // 2. Stock > 0
  // 3. Si tiene límite diario (max_daily_wins > 0), que no lo haya superado hoy
  const eligiblePrizes = prizes.filter(p => {
    if (!p.active || p.stock <= 0) return false;
    if (p.max_daily_wins > 0) {
      const winsToday = todayPrizesCountMap[p.id] || 0;
      if (winsToday >= p.max_daily_wins) {
        return false; // Límite diario alcanzado: queda protegido temporalmente
      }
    }
    return p.weight > 0;
  });

  // Si por alguna razón todos los premios elegibles están bloqueados, fallback al premio de souvenir más común
  if (eligiblePrizes.length === 0) {
    const fallback = prizes.find(p => p.active && p.stock > 0) || prizes[0];
    return fallback;
  }

  // Sumar los pesos de los premios elegibles
  const totalWeight = eligiblePrizes.reduce((sum, p) => sum + (Number(p.weight) || 1), 0);
  let randomValue = Math.random() * totalWeight;

  for (const prize of eligiblePrizes) {
    const weight = Number(prize.weight) || 1;
    if (randomValue < weight) {
      return prize;
    }
    randomValue -= weight;
  }

  return eligiblePrizes[0];
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
  generateTicketCode
};
