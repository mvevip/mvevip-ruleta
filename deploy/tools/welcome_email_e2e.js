#!/usr/bin/env node
/**
 * Pruebas del correo de bienvenida por Brevo. SOLO LOCAL, con la Lambda simulada.
 * Requisitos: node deploy/tools/mock_brevo_lambda.js (:5599) y la API :5500 en desarrollo con
 *   BREVO_API_URL=http://localhost:5599 BREVO_SENDER_EMAIL=envios@prueba.local BREVO_SENDER_NAME="Marketing VIP" BREVO_REPLY_EMAIL=soporte@prueba.local
 *   KIOSK_KEY_RIO=keyrio111 KIOSK_KEY_AMB=keyamb222
 *   node deploy/tools/welcome_email_e2e.js
 */
const API = 'http://localhost:5500';
const MOCK = 'http://localhost:5599';
const PIN = process.env.ADMIN_PIN || 'VIP2026';
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const H = { 'Content-Type': 'application/json', 'x-admin-pin': PIN };
const call = (method, path, body, headers = H) => fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json().then((j) => ({ status: r.status, body: j })));
const mock = () => fetch(`${MOCK}/_log`).then((r) => r.json());
const run = String(Date.now()).slice(-6);
const person = (n, domain = 'e2e.test') => ({ name: `Correo Prueba ${n}`, phone: `099${run}${n}`.slice(0, 10), email: `bienvenida${run}${n}@${domain}`, device_id: `welcome_${run}_${n}` });
const setTpl = (stand, id) => call('PUT', `/api/admin/email/${stand}`, { template_id: id });

(async () => {
  await fetch(`${MOCK}/_log`, { method: 'DELETE' });

  let r = await call('GET', '/api/admin/email', null, { 'Content-Type': 'application/json' });
  check('Sin PIN no se puede ver el panel (401)', r.status === 401);
  r = await call('GET', '/api/admin/email');
  check('Panel lista los 11 frentes', r.body.success && r.body.data.length === 11 && r.body.configured === true, `${r.body.data && r.body.data.length} frentes`);
  r = await setTpl('rio_mail', 'abc');
  check('Plantilla no numérica rechazada (400)', r.status === 400);
  r = await setTpl('no_existe', '261');
  check('Frente inexistente rechazado (400)', r.status === 400);

  // --- Sin plantilla: no se envía nada (comportamiento actual) ---
  await setTpl('rio_mail', ''); await setTpl('amb_mail', ''); await setTpl('rio_kiosk', ''); await setTpl('rio_stand', '');
  await wait(10500); // caché de plantillas (10 s)
  const p0 = person(0);
  let s = await call('POST', '/api/spin', { ...p0, screen_id: 'RIO_MAIL', turnstile_token: 'BYPASS_DEV' }, { 'Content-Type': 'application/json' });
  check('Sin plantilla: la participación funciona igual', s.status === 200 && s.body.success);
  check('Sin plantilla: NO se llama a Brevo', (await mock()).length === 0);

  // --- Correo de Riobamba con plantilla ---
  await setTpl('rio_mail', '261'); await setTpl('rio_kiosk', '262'); await setTpl('rio_stand', '263');
  await wait(10500);
  const p1 = person(1);
  let t0 = Date.now();
  s = await call('POST', '/api/spin', { ...p1, screen_id: 'RIO_MAIL', turnstile_token: 'BYPASS_DEV' }, { 'Content-Type': 'application/json' });
  const ms = Date.now() - t0;
  let log = await mock();
  check('Correo Riobamba: participación ok y se envía 1 correo', s.body.success && log.length === 1, `${ms} ms`);
  const m = log[0] || {};
  check('Formato exacto que exige la Lambda (sender, to, templateId texto)', m.to === p1.email && m.templateId === '261' && m.sender && m.sender.email === 'envios@prueba.local' && m.sender.name === 'Marketing VIP', JSON.stringify(m));
  check('Sin params (la plantilla va sin parámetros) y con replyTo del servidor', m.params === undefined && m.replyTo && m.replyTo.email === 'soporte@prueba.local');
  s = await call('POST', '/api/spin', { ...p1, screen_id: 'RIO_MAIL', turnstile_token: 'BYPASS_DEV' }, { 'Content-Type': 'application/json' });
  check('Mismo cliente otra vez (ya jugó): NO se repite el correo', s.body.already_played === true && (await mock()).length === 1);

  // --- Plantilla propia por frente: Ambato sin plantilla no envía ---
  const p2 = person(2);
  s = await call('POST', '/api/spin', { ...p2, screen_id: 'AMB_MAIL', turnstile_token: 'BYPASS_DEV' }, { 'Content-Type': 'application/json' });
  check('Ambato correo (sin plantilla) no envía aunque Riobamba sí', s.body.success && (await mock()).length === 1);

  // --- Pantalla gigante con cola ---
  const p3 = person(3);
  s = await call('POST', '/api/spin', { ...p3, screen_id: 'RIO_STAND', turnstile_token: 'BYPASS_DEV' }, { 'Content-Type': 'application/json' });
  log = await mock();
  check('Pantalla gigante de Riobamba envía su plantilla (263)', s.body.success && log.length === 2 && log[1].templateId === '263' && log[1].to === p3.email);

  // --- Kiosco: se envía al registrarse, sin esperar a jugar; no se repite ---
  const p4 = person(4);
  s = await call('POST', '/api/kiosk/register', { ...p4, screen_id: 'RIO_KIOSK', turnstile_token: 'BYPASS_DEV' }, { 'Content-Type': 'application/json' });
  log = await mock();
  check('Kiosco Riobamba: correo (262) al registrarse', s.body.success && log.length === 3 && log[2].templateId === '262' && log[2].to === p4.email);
  s = await call('POST', '/api/kiosk/register', { ...p4, screen_id: 'RIO_KIOSK', turnstile_token: 'BYPASS_DEV' }, { 'Content-Type': 'application/json' });
  check('Registrarse de nuevo en el kiosco (mismo lead) no repite el correo', (await mock()).length === 3);

  // --- Fallos de Brevo/Lambda no rompen el juego ---
  const p5 = person(5, 'falla.test');
  s = await call('POST', '/api/spin', { ...p5, screen_id: 'RIO_MAIL', turnstile_token: 'BYPASS_DEV' }, { 'Content-Type': 'application/json' });
  check('Brevo responde error: el cliente igual juega y gana', s.status === 200 && s.body.success);
  const p6 = person(6, 'lento.test');
  t0 = Date.now();
  s = await call('POST', '/api/spin', { ...p6, screen_id: 'RIO_MAIL', turnstile_token: 'BYPASS_DEV' }, { 'Content-Type': 'application/json' });
  const slow = Date.now() - t0;
  check('Lambda lenta: la participación espera como máximo ~6 s y funciona', s.status === 200 && s.body.success && slow < 8500, `${slow} ms`);

  // --- Registro en el panel ---
  r = await call('GET', '/api/admin/email');
  const rm = r.body.data.find((x) => x.stand === 'rio_mail');
  check('Panel: cuenta 1 enviado y 2 con error en Riobamba correo', rm.sent === 1 && rm.failed === 2 && rm.template_id === '261', `${rm.sent}/${rm.failed}`);
  const bad = r.body.recent.find((x) => x.status === 'failed' && /inexistente/.test(x.error || ''));
  const slowRow = r.body.recent.find((x) => /Tiempo de espera/.test(x.error || ''));
  check('Panel: guarda el motivo del fallo y el de la espera agotada', Boolean(bad) && Boolean(slowRow));
  check('Panel: los correos de los últimos envíos salen enmascarados', r.body.recent.every((x) => /^.{2}\*\*\*@/.test(x.to_masked)));

  // --- Prueba desde el Admin ---
  await fetch(`${MOCK}/_log`, { method: 'DELETE' });
  r = await call('POST', '/api/admin/email/rio_mail/test', { email: 'prueba@admin.test' });
  log = await mock();
  check('Enviar prueba desde el Admin', r.body.success && log.length === 1 && log[0].to === 'prueba@admin.test' && log[0].templateId === '261');
  r = await call('POST', '/api/admin/email/amb_mail/test', { email: 'prueba@admin.test' });
  check('Prueba de un frente sin plantilla -> 400', r.status === 400);
  r = await call('POST', '/api/admin/email/rio_mail/test', { email: 'no-es-correo' });
  check('Prueba con correo inválido -> 400', r.status === 400);

  // limpieza: sin plantillas
  for (const st of ['rio_mail', 'rio_kiosk', 'rio_stand']) await setTpl(st, '');
  console.log(`\n${results.filter(Boolean).length}/${results.length} comprobaciones correctas`);
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
