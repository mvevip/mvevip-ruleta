#!/usr/bin/env node
/**
 * Pruebas de la campaña de correo GENERAL (clientes normales, screen_id GEN_MAIL). SOLO LOCAL.
 * Requisitos: API :5500 en desarrollo (BD local con deploy/tools/local_mve_schema.sql cargado). Respeta límites: 10 consultas y 12 giros por minuto.
 *   node deploy/tools/general_mail_e2e.js
 * Crea leads de prueba en la BD local y restaura los datos de la campaña al terminar.
 */
const API = 'http://localhost:5500';
const PIN = process.env.ADMIN_PIN || 'VIP2026';
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
const call = (method, path, body, headers = {}) => fetch(`${API}${path}`, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined })
  .then((r) => r.json().then((json) => ({ status: r.status, body: json })));
const admin = { 'x-admin-pin': PIN };
const lookup = (qs) => call('GET', `/api/mail/lookup?${qs}`).then((r) => r.body);
const prizesOf = (stand) => call('GET', `/api/prizes?stand=${stand}`).then((r) => r.body.data);
const spin = (body) => call('POST', '/api/spin', { turnstile_token: 'BYPASS_DEV', device_id: 'gen_' + Math.random().toString(36).slice(2), ...body });

(async () => {
  const email = 'ok@test.com'; // en el CRM local: completo y válido

  // ---- Resolución del evento y claves atadas ----
  let r = await lookup(`correo=${email}&c=campana_general`);
  check('Clave campana_general (sin ev) -> campaña general, sin datos de feria', r.found && r.event === 'general' && r.eventInfo === null && r.closed === false, `${r.event}`);
  r = await lookup(`correo=${email}&c=campana_cuotas&ev=general`);
  check('La clave de cuotas NO autoriza la campaña general', r.found === false && r.event === 'general');
  r = await lookup(`correo=${email}&c=campana_general&ev=cuotas`);
  check('La clave general NO autoriza cuotas', r.found === false);
  r = await lookup(`correo=${email}&c=campana_general&ev=riobamba`);
  check('La clave general NO autoriza Riobamba', r.found === false);
  r = await lookup(`correo=${email}&c=feria_riobamba&ev=general`);
  check('La clave de Riobamba NO autoriza la campaña general', r.found === false);
  r = await lookup(`correo=${email}&c=campana_cuotas`);
  check('El enlace ya enviado (campana_cuotas sin ev) sigue yendo a Riobamba', r.found && r.event === 'riobamba');
  r = await lookup('correo=nophone@test.com&c=campana_general');
  check('Datos incompletos -> formulario', r.found && r.complete === false && r.issues.includes('phone'));
  r = await lookup('correo=nadie@noexiste.com&c=campana_general');
  check('Cliente que no existe en el CRM -> formulario', r.found === false && r.event === 'general');

  // ---- Catálogo propio ----
  const gen = await prizesOf('gen_mail');
  const mailCat = await prizesOf('mail');
  const rio = await prizesOf('rio_mail');
  const ids = new Set([...gen, ...mailCat, ...rio].map((p) => p.id));
  check('Catálogo propio de la campaña general (independiente de cuotas y Riobamba)', gen.length >= 6 && ids.size === gen.length + mailCat.length + rio.length, `${gen.length} premios`);

  // ---- Giro por correo ----
  const before = Object.fromEntries(gen.map((p) => [p.id, p.stock]));
  const mailBefore = Object.fromEntries(mailCat.map((p) => [p.id, p.stock]));
  const base = { crm_email: email, c: 'campana_general', crm_flow: 'direct' };
  let s = await spin({ ...base, screen_id: 'GEN_MAIL' });
  const d = s.body.data || {};
  check('Giro GEN_MAIL ok con premio del catálogo general', s.status === 200 && s.body.success && gen.some((p) => p.id === d.winner.id), d.winner && d.winner.name);
  check('Sin cita y sin datos de feria', d.appointment === null && d.event === null);
  const wa = decodeURIComponent(d.whatsappUrl || '');
  check('WhatsApp de la campaña: sin cita, "coordinar la entrega"', /wa\.me\/593987933325/.test(d.whatsappUrl) && /coordinar la entrega/.test(wa) && !/cita/i.test(wa) && !/feria/i.test(wa), wa.split('\n')[0]);
  const after = await prizesOf('gen_mail');
  const dropped = after.filter((p) => p.stock < before[p.id]).map((p) => p.id);
  check('Descontó stock del catálogo general (solo ese premio)', dropped.length === 1 && dropped[0] === d.winner.id);
  check('No tocó el stock de cuotas', (await prizesOf('mail')).every((p) => p.stock === mailBefore[p.id]));

  // ---- 1 participación en la campaña ----
  s = await spin({ ...base, screen_id: 'GEN_MAIL' });
  check('Segundo intento en la campaña general -> ya jugó (mismo premio)', s.body.already_played === true && s.body.data.winner.id === d.winner.id && s.body.data.appointment === null);
  check('Mensaje de "ya jugó" también sin cita', /coordinar la entrega/.test(decodeURIComponent(s.body.data.whatsappUrl)) && !/cita/i.test(decodeURIComponent(s.body.data.whatsappUrl)));

  // ---- Independiente de cuotas y de las ferias ----
  s = await spin({ crm_email: email, c: 'campana_cuotas', crm_flow: 'direct', screen_id: 'MAIL_01' });
  check('El mismo cliente puede jugar cuotas (con cita)', s.status === 200 && !s.body.already_played && s.body.data.appointment && /sábado/.test(s.body.data.appointment.dateText));
  s = await spin({ crm_email: email, c: 'feria_riobamba', crm_flow: 'direct', screen_id: 'RIO_MAIL' });
  check('...y la feria de Riobamba (con datos de feria)', s.status === 200 && !s.body.already_played && s.body.data.event && s.body.data.event.city === 'Riobamba');

  // ---- Leads y métricas por evento (admin) ----
  const leads = await call('GET', '/api/leads?event=general', null, admin);
  check('Leads de la campaña general: solo GEN_MAIL, con evento y frente', leads.body.success && leads.body.data.length >= 1 && leads.body.data.every((l) => l.screen_id === 'GEN_MAIL' && l.event === 'general' && l.front === 'mail' && l.event_label === 'General'));
  check('Los leads de Autos no incluyen la campaña general', (await call('GET', '/api/leads?stand=autos', null, admin)).body.data.every((l) => l.screen_id !== 'GEN_MAIL'));
  const m = await call('GET', '/api/metrics?event=general', null, admin);
  check('Métricas de la campaña general', m.body.success && m.body.event === 'general' && m.body.data.totalLeads >= 1);

  // ---- Cierre manual y automático ----
  r = await call('GET', '/api/admin/events', null, admin);
  const g0 = r.body.data.find((e) => e.event === 'general');
  check('El admin lista la campaña general (solo vigencia y apertura)', g0 && g0.kind === 'campaign' && g0.isOpen === true && g0.closed === false && /2026-12-31/.test(g0.closesAt));
  r = await call('PUT', '/api/admin/events/general', { closesAt: 'pronto' }, admin);
  check('Rechaza una hora de cierre inválida', r.status === 400);
  r = await call('PUT', '/api/admin/events/general', { isOpen: false }, admin);
  check('Cerrar la campaña manualmente', r.body.success && r.body.data.closed === true);
  r = await lookup(`correo=${email}&c=campana_general`);
  check('El correo avisa que la campaña está cerrada', r.closed === true && r.alreadyPlayed === true);
  s = await spin({ name: 'Persona General Cierre', phone: '0994000001', email: 'general-cierre@e2e.test', screen_id: 'GEN_MAIL' });
  check('Cerrada: participación nueva rechazada (EVENT_CLOSED)', s.status === 403 && s.body.code === 'EVENT_CLOSED');
  s = await spin({ ...base, screen_id: 'GEN_MAIL' });
  check('Cerrada: quien ya jugó sigue viendo su premio', s.body.already_played === true);
  s = await spin({ name: 'Persona Cuotas Abierta', phone: '0994000002', email: 'cuotas-abierta@e2e.test', screen_id: 'MAIL_01' });
  check('Cuotas y las ferias siguen abiertas', s.status === 200 && s.body.success);
  r = await call('PUT', '/api/admin/events/general', { isOpen: true }, admin);
  check('Reabrir la campaña', r.body.success && r.body.data.closed === false);
  r = await call('PUT', '/api/admin/events/general', { closesAt: '2026-01-01T00:00:00-05:00' }, admin);
  check('Con una hora de cierre ya pasada, queda cerrada', r.body.success && r.body.data.closed === true);
  await call('PUT', '/api/admin/events/general', { closesAt: g0.closesAt, isOpen: true }, admin);
  const events = require('../../api/src/config/events');
  const lookups = require('../../api/src/services/mailLookup');
  check('Cierre automático al pasar el 31-dic-2026', !events.isEventClosed('general', new Date('2026-12-31T23:00:00-05:00')) && events.isEventClosed('general', new Date('2027-01-01T00:00:00-05:00')));
  check('La clave campana_general vence el 31-dic-2026', lookups.isCampaignKeyValid('campana_general', new Date('2026-12-31T23:00:00-05:00'), 'general') && !lookups.isCampaignKeyValid('campana_general', new Date('2027-01-01T00:00:00-05:00'), 'general'));
  const push = require('../../api/src/services/pushService');
  const desc = push.describeLead({ stand: 'gen_mail', leadName: 'Ana', prizeName: 'Gorra', isTest: false });
  check('Notificación push: "Nuevo lead · General · Correo" del evento general', desc.event === 'general' && desc.front === 'mail' && /General · Correo/.test(desc.payload.title) && desc.payload.url === './#/leads?event=general', desc.payload.title);

  console.log(`\n${results.filter(Boolean).length}/${results.length} comprobaciones correctas`);
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
