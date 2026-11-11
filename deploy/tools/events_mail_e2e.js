#!/usr/bin/env node
/**
 * Pruebas del canal Correo con eventos (Fase A de las ferias de Riobamba y Ambato). SOLO LOCAL.
 * Requisitos: API :5500 en desarrollo (BD local con deploy/tools/local_mve_schema.sql cargado).
 *   node deploy/tools/events_mail_e2e.js
 * Crea leads de prueba en la BD local (no usar contra producción).
 */
const API = 'http://localhost:5500';
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
const j = (url, opts) => fetch(url, opts).then((r) => r.json().then((body) => ({ status: r.status, body })));
const lookup = (qs) => j(`${API}/api/mail/lookup?${qs}`).then((r) => r.body);
const spin = (body) => j(`${API}/api/spin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ turnstile_token: 'BYPASS_DEV', device_id: 'e2e_' + Math.random().toString(36).slice(2), ...body })
});
const prizesOf = (stand) => j(`${API}/api/prizes?stand=${stand}`).then((r) => r.body.data);

(async () => {
  const email = 'ok@test.com'; // en el CRM local: completo y válido

  // ---- Resolución del evento por enlace ----
  let r = await lookup(`correo=${email}&c=campana_cuotas`);
  check('Enlace YA ENVIADO (campana_cuotas, sin ev) -> feria de Riobamba', r.found && r.event === 'riobamba' && r.eventInfo && /camión/.test(r.eventInfo.fairName), `${r.event}`);

  r = await lookup(`correo=${email}&c=campana_cuotas&ev=cuotas`);
  check('Enlace nuevo de cuotas (ev=cuotas) -> cuotas', r.found && r.event === 'cuotas' && r.eventInfo === null, `${r.event}`);

  r = await lookup(`correo=${email}&c=campana_cuotas&ev=ambato`);
  check('campana_cuotas NO autoriza Ambato', r.found === false && r.event === 'ambato');

  r = await lookup(`correo=${email}&c=feria_riobamba&ev=ambato`);
  check('feria_riobamba NO autoriza Ambato', r.found === false);

  r = await lookup(`correo=${email}&c=feria_ambato&ev=ambato`);
  check('feria_ambato + ev=ambato -> Ambato', r.found && r.event === 'ambato' && /Autovitrina/.test(r.eventInfo.fairName));

  r = await lookup(`correo=${email}&c=feria_ambato`);
  check('feria_ambato sin ev -> Ambato', r.found && r.event === 'ambato');

  r = await lookup(`correo=${email}&c=clave_falsa&ev=riobamba`);
  check('Clave falsa no devuelve datos del cliente', r.found === false && !r.data);

  r = await lookup('correo=nophone@test.com&c=campana_cuotas');
  check('Cliente con datos incompletos -> formulario (complete=false, issues=phone)', r.found && r.complete === false && r.issues.includes('phone'));

  r = await lookup('correo=nadie@noexiste.com&c=feria_riobamba');
  check('Cliente que no existe en el CRM -> formulario (found=false)', r.found === false && r.event === 'riobamba');

  // ---- Catálogos: un pool por ciudad, distinto de cuotas ----
  const poolRio = await prizesOf('rio_mail');
  const poolRioKiosk = await prizesOf('rio_kiosk');
  const poolAmb = await prizesOf('amb_mail');
  const poolCuotas = await prizesOf('mail');
  check('Los 3 frentes de Riobamba comparten el mismo catálogo', poolRio.length >= 6 && JSON.stringify(poolRio.map((p) => p.id)) === JSON.stringify(poolRioKiosk.map((p) => p.id)));
  check('Catálogos de Riobamba, Ambato y cuotas son independientes', new Set([...poolRio, ...poolAmb, ...poolCuotas].map((p) => p.id)).size === poolRio.length + poolAmb.length + poolCuotas.length);

  // ---- Giro en Riobamba por correo (enlace ya enviado) ----
  const stockBefore = Object.fromEntries(poolRio.map((p) => [p.id, p.stock]));
  const mailBefore = Object.fromEntries(poolCuotas.map((p) => [p.id, p.stock]));
  const base = { crm_email: email, c: 'campana_cuotas', crm_flow: 'direct' };
  let s = await spin({ ...base, screen_id: 'RIO_MAIL' });
  const d = s.body.data || {};
  check('Giro RIO_MAIL ok, premio del catálogo de Riobamba', s.status === 200 && s.body.success && poolRio.some((p) => p.id === d.winner.id), d.winner && d.winner.name);
  check('Pase de feria: datos de la feria y SIN cita de sábado', d.event && d.event.venue === 'Quinta Macaji, Riobamba' && d.event.standText === 'Acércate al stand de Marketing VIP' && d.appointment === null);
  check('WhatsApp de feria (sin cita)', /wa\.me\/593987933325/.test(d.whatsappUrl) && /Primera%20feria%20del%20cami/.test(d.whatsappUrl) && !/Mi%20cita/.test(d.whatsappUrl));

  const rioAfter = await prizesOf('rio_mail');
  const mailAfter = await prizesOf('mail');
  const dropped = rioAfter.filter((p) => p.stock < stockBefore[p.id]).map((p) => p.id);
  check('Descontó stock del catálogo de Riobamba (solo ese premio)', dropped.length === 1 && dropped[0] === d.winner.id);
  check('No tocó el stock de cuotas', mailAfter.every((p) => p.stock === mailBefore[p.id]));

  // ---- Una participación por ciudad (cualquier frente) ----
  s = await spin({ ...base, screen_id: 'RIO_MAIL' });
  check('Segundo intento en Riobamba -> ya jugó (mismo premio)', s.body.already_played === true && s.body.data.winner.id === d.winner.id && s.body.data.event);
  s = await spin({ name: 'Carlos Andres Perez', phone: '0991234567', email, screen_id: 'RIO_KIOSK' });
  check('Mismo cliente por otro frente de Riobamba (RIO_KIOSK) -> ya jugó', s.body.already_played === true && s.body.data.winner.id === d.winner.id);
  s = await spin({ name: 'Carlos Andres Perez', phone: '0991234567', email, screen_id: 'RIO_STAND' });
  check('Mismo cliente por RIO_STAND -> ya jugó', s.body.already_played === true);

  // ---- Otra ciudad y cuotas son independientes ----
  s = await spin({ crm_email: email, c: 'feria_ambato', crm_flow: 'direct', screen_id: 'AMB_MAIL' });
  check('Mismo cliente puede jugar Ambato', s.status === 200 && !s.body.already_played && s.body.data.event.city === 'Ambato' && s.body.data.event.venue === 'Cámara de Comercio de Ambato', s.body.message || '');
  s = await spin({ crm_email: email, c: 'campana_cuotas', crm_flow: 'direct', screen_id: 'MAIL_01' });
  check('Mismo cliente puede jugar cuotas (campaña independiente)', s.status === 200 && !s.body.already_played && s.body.data.appointment && /sábado/.test(s.body.data.appointment.dateText) && !s.body.data.event, s.body.message || '');

  // ---- Claves atadas a su evento en el giro ----
  s = await spin({ crm_email: 'luis+promo@test.com', c: 'feria_riobamba', crm_flow: 'direct', screen_id: 'AMB_MAIL' });
  check('Clave de Riobamba NO vincula un giro de Ambato con el CRM (flujo directo rechazado)', s.status === 400 && s.body.success === false, `status ${s.status}`);

  // ---- Lookup posterior: quien ya jugó en Riobamba ve su premio ----
  // El lookup tiene límite de 10 consultas/min por IP: se espera a que se libere la ventana
  console.log('(esperando 62 s por el límite de consultas del lookup...)');
  await new Promise((resolve) => setTimeout(resolve, 62000));
  r = await lookup(`correo=${email}&c=campana_cuotas`);
  check('Lookup tras jugar en Riobamba -> alreadyPlayed', r.alreadyPlayed === true && r.event === 'riobamba');
  r = await lookup(`correo=${email}&c=campana_cuotas&ev=cuotas`);
  check('Lookup de cuotas del mismo cliente: refleja que ya jugó cuotas', r.alreadyPlayed === true && r.event === 'cuotas');

  // ---- Cierre automático (domingo 15 22:00 Ecuador) ----
  const events = require('../../api/src/config/events');
  check('Feria abierta antes del cierre', !events.isEventClosed('riobamba', new Date('2026-11-15T21:59:59-05:00')));
  check('Feria cerrada desde las 22:00 del 15', events.isEventClosed('riobamba', new Date('2026-11-15T22:00:01-05:00')) && events.isEventClosed('ambato', new Date('2026-11-16T09:00:00-05:00')));
  check('Cuotas nunca se cierra', !events.isEventClosed('cuotas', new Date('2027-01-01T00:00:00-05:00')));
  const lookups = require('../../api/src/services/mailLookup');
  check('Claves de feria vencen a las 22:00 del 15', lookups.isCampaignKeyValid('feria_ambato', new Date('2026-11-15T21:59:00-05:00'), 'ambato') && !lookups.isCampaignKeyValid('feria_ambato', new Date('2026-11-15T22:00:01-05:00'), 'ambato'));

  console.log(`\n${results.filter(Boolean).length}/${results.length} comprobaciones correctas`);
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
