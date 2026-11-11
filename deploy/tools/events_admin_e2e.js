#!/usr/bin/env node
/**
 * Pruebas de la Fase C (admin de las ferias): datos de la feria editables, cierre manual, leads y métricas por ciudad. SOLO LOCAL.
 * Requisitos: API :5500 en desarrollo (PIN por defecto VIP2026) con KIOSK_KEY_RIO=keyrio111.
 *   node deploy/tools/events_admin_e2e.js
 * Restaura los datos de las ferias al terminar. Crea leads de prueba en la BD local.
 */
const API = 'http://localhost:5500';
const PIN = process.env.ADMIN_PIN || 'VIP2026';
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const call = (method, path, body, headers = {}) => fetch(`${API}${path}`, {
  method,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: body ? JSON.stringify(body) : undefined
}).then((r) => r.json().then((json) => ({ status: r.status, body: json })));
const admin = { 'x-admin-pin': PIN };
const lookup = (qs) => call('GET', `/api/mail/lookup?${qs}`).then((r) => r.body);

(async () => {
  // ---- Autenticación ----
  let r = await call('GET', '/api/admin/events');
  check('GET /api/admin/events exige el PIN', r.status === 401);
  r = await call('PUT', '/api/admin/events/riobamba', { venue: 'X' });
  check('PUT /api/admin/events/:event exige el PIN', r.status === 401);

  // ---- Lectura ----
  r = await call('GET', '/api/admin/events', null, admin);
  const rio0 = r.body.data && r.body.data.find((e) => e.event === 'riobamba');
  const amb0 = r.body.data && r.body.data.find((e) => e.event === 'ambato');
  check('Lista las dos ferias con sus valores por defecto', r.body.success && rio0 && amb0 && rio0.venue === 'Quinta Macaji, Riobamba' && amb0.fairName === 'Autovitrina Comercial 2026' && rio0.isOpen === true && rio0.closed === false);
  check('Incluye los screen_id de los 3 frentes', rio0.screenIds.join() === 'RIO_STAND,RIO_KIOSK,RIO_MAIL');

  // ---- Validaciones ----
  r = await call('PUT', '/api/admin/events/riobamba', { mapsUrl: 'javascript:alert(1)' }, admin);
  check('Rechaza un enlace de mapa que no es https://', r.status === 400);
  r = await call('PUT', '/api/admin/events/riobamba', { venue: '   ' }, admin);
  check('Rechaza un lugar vacío', r.status === 400);
  r = await call('PUT', '/api/admin/events/riobamba', { closesAt: 'mañana' }, admin);
  check('Rechaza una hora de cierre inválida', r.status === 400);
  r = await call('PUT', '/api/admin/events/quito', { venue: 'X' }, admin);
  check('Rechaza un evento que no existe (404)', r.status === 404);

  // ---- Edición: se aplica a correo, celular y kiosco ----
  r = await call('PUT', '/api/admin/events/riobamba', { venue: 'Quinta Macaji, Riobamba (puerta 2)', standText: 'Acércate al stand 12 de Marketing VIP' }, admin);
  check('Guarda los datos editados', r.status === 200 && r.body.success && r.body.data.standText === 'Acércate al stand 12 de Marketing VIP');
  let lk = await lookup('correo=zz@zz.test&c=feria_riobamba');
  check('El correo (lookup) ya trae el texto nuevo', lk.eventInfo && lk.eventInfo.standText === 'Acércate al stand 12 de Marketing VIP' && lk.eventInfo.venue.endsWith('(puerta 2)'));
  r = await call('GET', '/api/admin/events', null, admin);
  const amb1 = r.body.data.find((e) => e.event === 'ambato');
  check('Ambato no cambia', amb1.venue === 'Cámara de Comercio de Ambato' && amb1.standText === 'Acércate al stand de Marketing VIP');

  // ---- Giro de Riobamba trae el texto editado (pantalla, correo y kiosco comparten el dato) ----
  const p1 = { name: 'Persona Admin Uno', phone: '0992000001', email: 'admin1@e2e.test', device_id: 'ea1' };
  let spin = await call('POST', '/api/spin', { ...p1, screen_id: 'RIO_STAND', turnstile_token: 'BYPASS_DEV' });
  check('El pase de la pantalla gigante usa el stand editado', spin.body.data && spin.body.data.event.standText.includes('stand 12'));
  const p2 = { name: 'Persona Admin Dos', phone: '0992000002', email: 'admin2@e2e.test', device_id: 'ea2' };
  const reg = await call('POST', '/api/kiosk/register', { ...p2, screen_id: 'RIO_KIOSK', turnstile_token: 'BYPASS_DEV' });
  await call('POST', '/api/kiosk/start', { screen_id: 'RIO_KIOSK' }, { 'x-kiosk-key': 'keyrio111' });
  const kst = await call('GET', '/api/kiosk/state?screen_id=RIO_KIOSK&k=keyrio111');
  await wait(6000);
  const code = (await call('GET', '/api/spin/latest?screen_id=RIO_KIOSK')).body.data.ticket_code;
  await call('POST', '/api/kiosk/revealed', { ticket_code: code });
  const kph = await call('GET', `/api/kiosk/state?session=${reg.body.data.sessionId}&token=${reg.body.data.token}`);
  check('El ticket del kiosco usa el stand editado', kph.body.data && kph.body.data.event.standText.includes('stand 12'));

  // ---- Leads y métricas por ciudad ----
  let leads = await call('GET', '/api/leads?event=riobamba', null, admin);
  const screens = new Set((leads.body.data || []).map((l) => l.screen_id));
  check('Leads de Riobamba: solo sus frentes, con ciudad y frente', leads.body.success && leads.body.data.length >= 2 && [...screens].every((s) => s.startsWith('RIO_')) && leads.body.data.every((l) => l.event === 'riobamba' && l.event_label === 'Riobamba'));
  check('Cada lead indica por qué frente entró', leads.body.data.some((l) => l.front === 'stand') && leads.body.data.some((l) => l.front === 'kiosk'));
  const leadsAmb = await call('GET', '/api/leads?event=ambato', null, admin);
  check('Leads de Ambato: no incluye los de Riobamba', leadsAmb.body.success && leadsAmb.body.data.every((l) => l.event === 'ambato'));
  check('Totales por ciudad en la respuesta', leads.body.totals && leads.body.totals.events.riobamba >= 2 && leads.body.totals.rio_kiosk >= 1 && leads.body.totals.rio_stand >= 1);
  const leadsAutos = await call('GET', '/api/leads?stand=autos', null, admin);
  check('Leads de Autos no incluyen los de las ferias', leadsAutos.body.data.every((l) => !String(l.screen_id).startsWith('RIO_') && !String(l.screen_id).startsWith('AMB_')));
  const m = await call('GET', '/api/metrics?event=riobamba', null, admin);
  check('Métricas por ciudad', m.body.success && m.body.event === 'riobamba' && m.body.data.totalLeads >= 2 && m.body.data.byStand.rio_stand && m.body.data.byStand.rio_kiosk);

  // ---- Cierre manual ----
  r = await call('PUT', '/api/admin/events/riobamba', { isOpen: false }, admin);
  check('Cerrar la feria manualmente', r.body.success && r.body.data.closed === true && r.body.data.isOpen === false);
  lk = await lookup('correo=zz@zz.test&c=feria_riobamba');
  check('El correo avisa que la feria está cerrada', lk.closed === true);
  spin = await call('POST', '/api/spin', { name: 'Persona Admin Tres', phone: '0992000003', email: 'admin3@e2e.test', device_id: 'ea3', screen_id: 'RIO_STAND', turnstile_token: 'BYPASS_DEV' });
  check('Pantalla gigante: participación nueva rechazada (EVENT_CLOSED)', spin.status === 403 && spin.body.code === 'EVENT_CLOSED');
  const kreg = await call('POST', '/api/kiosk/register', { name: 'Persona Admin Cuatro', phone: '0992000004', email: 'admin4@e2e.test', device_id: 'ea4', screen_id: 'RIO_KIOSK', turnstile_token: 'BYPASS_DEV' });
  check('Kiosco: registro nuevo rechazado (EVENT_CLOSED)', kreg.status === 403 && kreg.body.code === 'EVENT_CLOSED');
  const old = await call('POST', '/api/spin', { ...p1, screen_id: 'RIO_MAIL', turnstile_token: 'BYPASS_DEV' });
  check('Quien ya jugó sigue viendo su premio con la feria cerrada', old.body.already_played === true);
  const amb = await call('POST', '/api/spin', { name: 'Persona Ambato Uno', phone: '0992000005', email: 'admin5@e2e.test', device_id: 'ea5', screen_id: 'AMB_STAND', turnstile_token: 'BYPASS_DEV' });
  check('Ambato sigue abierta', amb.status === 200 && amb.body.success);

  // ---- Reabrir y restaurar ----
  r = await call('PUT', '/api/admin/events/riobamba', { isOpen: true, venue: rio0.venue, standText: rio0.standText }, admin);
  check('Reabrir la feria y restaurar los textos', r.body.success && r.body.data.closed === false && r.body.data.venue === rio0.venue && r.body.data.standText === rio0.standText);

  console.log(`\n${results.filter(Boolean).length}/${results.length} comprobaciones correctas`);
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
