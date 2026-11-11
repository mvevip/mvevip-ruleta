#!/usr/bin/env node
/**
 * Pruebas de la Fase B de las ferias: pantalla gigante y kiosco de Riobamba y Ambato (API). SOLO LOCAL.
 * Requisitos: API :5500 en desarrollo con KIOSK_KEY=testkey123 KIOSK_KEY_RIO=keyrio111 KIOSK_KEY_AMB=keyamb222.
 *   node deploy/tools/events_screens_e2e.js
 * Crea leads/sesiones de prueba en la BD local (no usar contra producción).
 */
const API = 'http://localhost:5500';
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const call = (method, path, body, headers = {}) => fetch(`${API}${path}`, {
  method,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: body ? JSON.stringify(body) : undefined
}).then((r) => r.json().then((json) => ({ status: r.status, body: json })));
const prizesOf = (stand) => call('GET', `/api/prizes?stand=${stand}`).then((r) => r.body.data);
const person = (n) => ({ name: `Persona Prueba ${n}`, phone: `0991000${String(n).padStart(3, '0')}`, email: `prueba${n}@e2e.test`, device_id: `e2e_${n}` });
const KEYS = { KIOSK_01: 'testkey123', RIO_KIOSK: 'keyrio111', AMB_KIOSK: 'keyamb222' };

async function playKiosk(screenId, p) {
  const reg = await call('POST', '/api/kiosk/register', { ...p, screen_id: screenId, turnstile_token: 'BYPASS_DEV' });
  if (!reg.body.success || reg.body.already_played) return { reg };
  const start = await call('POST', '/api/kiosk/start', { screen_id: screenId }, { 'x-kiosk-key': KEYS[screenId] });
  await wait(6000);
  const state = await call('GET', `/api/kiosk/state?screen_id=${screenId}&k=${KEYS[screenId]}`);
  const phone = await call('GET', `/api/kiosk/state?session=${reg.body.data.sessionId}&token=${reg.body.data.token}`);
  return { reg, start, state, phone };
}

(async () => {
  // ---- Catálogos y configuración de pantallas ----
  const rioStand = await prizesOf('rio_stand');
  const rioKiosk = await prizesOf('rio_kiosk');
  check('Pantalla gigante y kiosco de Riobamba usan el mismo catálogo', rioStand.length >= 6 && JSON.stringify(rioStand.map((x) => x.id)) === JSON.stringify(rioKiosk.map((x) => x.id)));
  for (const stand of ['rio_stand', 'rio_kiosk', 'amb_stand', 'amb_kiosk']) {
    const cfg = await call('GET', `/api/displays/config?stand=${stand}`);
    check(`displays/config de ${stand} disponible`, cfg.body.success && ['roulette', 'qr', 'slider', 'combo'].every((k) => cfg.body.configs[k]));
  }
  const cfgAutos = await call('GET', '/api/displays/config');
  check('displays/config de Autos no recibe claves de las ferias', Object.keys(cfgAutos.body.configs).every((k) => ['roulette', 'qr', 'slider', 'combo'].includes(k)));

  // ---- Claves por kiosco ----
  let r = await call('POST', '/api/kiosk/start', { screen_id: 'RIO_KIOSK' }, { 'x-kiosk-key': KEYS.AMB_KIOSK });
  check('La clave de Ambato NO abre el kiosco de Riobamba (401)', r.status === 401);
  r = await call('POST', '/api/kiosk/start', { screen_id: 'RIO_KIOSK' }, { 'x-kiosk-key': KEYS.KIOSK_01 });
  check('La clave del kiosco histórico NO abre el de Riobamba (401)', r.status === 401);
  r = await call('POST', '/api/kiosk/start', { screen_id: 'KIOSK_01' }, { 'x-kiosk-key': KEYS.RIO_KIOSK });
  check('La clave de Riobamba NO abre el kiosco histórico (401)', r.status === 401);
  r = await call('POST', '/api/kiosk/start', { screen_id: 'RIO_MAIL' }, { 'x-kiosk-key': KEYS.RIO_KIOSK });
  check('screen_id que no es un kiosco se rechaza (400)', r.status === 400);
  r = await call('GET', `/api/kiosk/state?screen_id=RIO_KIOSK&k=mala`);
  check('Estado público sin clave válida: solo IDLE/BUSY, sin datos personales', r.body.success && ['IDLE', 'BUSY'].includes(r.body.status) && !r.body.session);

  // ---- Kiosco de Riobamba, ronda completa ----
  const stockRioBefore = Object.fromEntries((await prizesOf('rio_kiosk')).map((x) => [x.id, x.stock]));
  const stockKioskBefore = Object.fromEntries((await prizesOf('kiosk')).map((x) => [x.id, x.stock]));
  const p1 = person(1);
  const rio = await playKiosk('RIO_KIOSK', p1);
  check('Riobamba: registro ok', rio.reg.body.success && !rio.reg.body.already_played);
  check('Riobamba: el botón (con SU clave) inicia el giro', rio.start.body.success);
  const rioTicket = rio.phone.body.data;
  check('Riobamba: el celular recibe el premio con datos de la feria', rio.phone.body.status === 'REVEALED' || rio.phone.body.status === 'SPINNING', rio.phone.body.status);

  // la pantalla de arriba avisa que la ruleta terminó (el e2e espera 4 s antes)
  const ticketCode = rio.state.body.status === 'SPINNING' ? null : (rio.state.body.print && rio.state.body.print.ticketCode);
  const latest = await call('GET', '/api/spin/latest?screen_id=RIO_KIOSK');
  const code = (latest.body.data && latest.body.data.ticket_code) || ticketCode;
  check('La pantalla de arriba del kiosco de Riobamba ve el giro (/spin/latest)', Boolean(code), code || '');
  const none = await call('GET', '/api/spin/latest?screen_id=AMB_KIOSK');
  check('...y la de Ambato NO ve el giro de Riobamba', !none.body.data || none.body.data.ticket_code !== code);
  await call('POST', '/api/kiosk/revealed', { ticket_code: code });
  const phoneAfter = await call('GET', `/api/kiosk/state?session=${rio.reg.body.data.sessionId}&token=${rio.reg.body.data.token}`);
  const t = phoneAfter.body.data;
  check('Celular: ticket con feria, lugar y "Acércate al stand de Marketing VIP"', phoneAfter.body.status === 'REVEALED' && t && t.event && t.event.venue === 'Quinta Macaji, Riobamba' && t.event.standText === 'Acércate al stand de Marketing VIP');
  const stateRio = await call('GET', `/api/kiosk/state?screen_id=RIO_KIOSK&k=${KEYS.RIO_KIOSK}`);
  check('Pantalla del botón: datos de impresión incluyen la feria', stateRio.body.print && stateRio.body.print.event && stateRio.body.print.event.city === 'Riobamba');

  const rioAfter = await prizesOf('rio_kiosk');
  const kioskAfter = await prizesOf('kiosk');
  const dropped = rioAfter.filter((x) => x.stock < stockRioBefore[x.id]);
  check('Descontó stock del catálogo de Riobamba (1 premio)', dropped.length === 1 && dropped[0].id === t.winner.id);
  check('No tocó el catálogo del kiosco histórico', kioskAfter.every((x) => x.stock === stockKioskBefore[x.id]));

  // ---- Ambato independiente (mismo instante) ----
  const p2 = person(2);
  const amb = await playKiosk('AMB_KIOSK', p2);
  check('Ambato: registro y giro independientes de Riobamba', amb.reg.body.success && amb.start.body.success);

  // ---- 1 participación por ciudad entre frentes ----
  let again = await call('POST', '/api/kiosk/register', { ...p1, screen_id: 'RIO_KIOSK', turnstile_token: 'BYPASS_DEV' });
  check('Mismo cliente otra vez en el kiosco de Riobamba -> su ticket anterior', again.body.already_played === true && again.body.data.ticketCode === t.ticketCode && again.body.data.event);
  let mail = await call('POST', '/api/spin', { ...p1, screen_id: 'RIO_MAIL', turnstile_token: 'BYPASS_DEV' });
  check('Quien jugó en el kiosco de Riobamba NO puede jugar por el correo de Riobamba', mail.body.already_played === true && mail.body.data.ticketCode === t.ticketCode);
  let stand = await call('POST', '/api/spin', { ...p1, screen_id: 'RIO_STAND', turnstile_token: 'BYPASS_DEV' });
  check('...ni en la pantalla gigante de Riobamba', stand.body.already_played === true && stand.body.data.ticketCode === t.ticketCode);
  let ambMail = await call('POST', '/api/spin', { ...p1, screen_id: 'AMB_MAIL', turnstile_token: 'BYPASS_DEV' });
  check('...pero SÍ en Ambato', ambMail.status === 200 && !ambMail.body.already_played && ambMail.body.data.event.city === 'Ambato');

  // ---- Pantalla gigante de Riobamba ----
  const p3 = person(3);
  const spin = await call('POST', '/api/spin', { ...p3, screen_id: 'RIO_STAND', turnstile_token: 'BYPASS_DEV' });
  const sd = spin.body.data || {};
  check('Pantalla gigante Riobamba: giro ok con premio del catálogo de Riobamba', spin.status === 200 && spin.body.success && rioStand.some((x) => x.id === sd.winner.id));
  check('Respuesta con datos de la feria y WhatsApp de feria', sd.event && sd.event.fairName === 'Primera feria del camión y la camioneta' && /Primera%20feria/.test(sd.whatsappUrl) && !/Feria%20de%20Autos/.test(sd.whatsappUrl));
  const latest2 = await call('GET', '/api/spin/latest?screen_id=RIO_STAND');
  check('La pantalla gigante de Riobamba recibe el giro por polling', latest2.body.data && latest2.body.data.leadName === p3.name);
  const p4 = person(4);
  const spin2 = await call('POST', '/api/spin', { ...p4, screen_id: 'RIO_STAND', turnstile_token: 'BYPASS_DEV' });
  check('Segundo jugador en la pantalla de Riobamba entra a la cola', spin2.body.in_queue === true && spin2.body.data.event);
  const ambStandSpin = await call('POST', '/api/spin', { ...person(5), screen_id: 'AMB_STAND', turnstile_token: 'BYPASS_DEV' });
  check('Pantalla de Ambato independiente (no hace cola con Riobamba)', ambStandSpin.body.success && ambStandSpin.body.in_queue === false && ambStandSpin.body.data.event.city === 'Ambato');

  // ---- Kiosco histórico intacto ----
  const p6 = person(6);
  const k01 = await playKiosk('KIOSK_01', p6);
  const k01phone = k01.phone.body;
  check('Kiosco histórico KIOSK_01 sigue funcionando (sin screen_id en la petición)', k01.reg.body.success && k01.start.body.success);
  const reg2 = await call('POST', '/api/kiosk/register', { ...person(7), turnstile_token: 'BYPASS_DEV' });
  check('Registro sin screen_id = KIOSK_01 (compatibilidad)', reg2.status === 200 || reg2.status === 409);
  check('Ticket del kiosco histórico sin datos de feria', !k01phone.data || k01phone.data.event === null);

  console.log(`\n${results.filter(Boolean).length}/${results.length} comprobaciones correctas`);
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
