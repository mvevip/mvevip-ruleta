/**
 * Cita de canje de la campaña por correo: siempre el próximo sábado a las 10:00 (hora de Ecuador).
 * Ecuador continental es UTC-5 todo el año (sin horario de verano); Lambda corre en UTC.
 */

const ECUADOR_OFFSET_HOURS = -5;
const APPOINTMENT_WEEKDAY = 6; // sábado
const APPOINTMENT_HOUR = 10;

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/**
 * Próximo sábado 10:00 am. Si hoy es sábado y aún no son las 10:00 se usa hoy;
 * desde las 10:00 en adelante pasa al sábado siguiente.
 */
function getNextAppointment(now = new Date()) {
  // "Reloj de pared" de Ecuador leído con los getters UTC
  const local = new Date(now.getTime() + ECUADOR_OFFSET_HOURS * 3600 * 1000);

  let daysAhead = (APPOINTMENT_WEEKDAY - local.getUTCDay() + 7) % 7;
  if (daysAhead === 0 && local.getUTCHours() >= APPOINTMENT_HOUR) {
    daysAhead = 7;
  }

  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate() + daysAhead;

  const appointmentUtc = new Date(Date.UTC(y, m, d, APPOINTMENT_HOUR - ECUADOR_OFFSET_HOURS, 0, 0));
  const wall = new Date(Date.UTC(y, m, d));

  const dateText = `${WEEKDAYS[wall.getUTCDay()]} ${wall.getUTCDate()} de ${MONTHS[wall.getUTCMonth()]} de ${wall.getUTCFullYear()}`;
  const timeText = '10:00 am';

  return {
    iso: appointmentUtc.toISOString(),
    dateText,
    timeText,
    text: `${dateText} a las ${timeText}`
  };
}

module.exports = { getNextAppointment };
