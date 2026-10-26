#!/usr/bin/env node
/**
 * Regresión: confirma que los canales EXISTENTES (Autos, Ford, Correo) siguen funcionando igual con el kiosco instalado.
 * Requisitos locales: API :5500, vite preview screen :5502 / mobile :5503 / admin :5504.
 * Usa los usuarios de prueba del admin (demo1/demo2), que no descuentan stock.
 *   node deploy/tools/regression_smoke.js
 */
const { chromium } = require('playwright');
const API = 'http://localhost:5500';
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
const j = (url, opts) => fetch(url, opts).then((r) => r.json());

(async () => {
  // ---- API: premios por canal ----
  for (const [stand, min] of [['autos', 8], ['ford', 6], ['mail', 6], ['kiosk', 6]]) {
    const r = await j(`${API}/api/prizes?stand=${stand}`);
    check(`GET /api/prizes?stand=${stand}`, r.success && r.data.length >= min, `${r.data && r.data.length} premios`);
  }
  const pAutos = await j(`${API}/api/prizes`);
  check('GET /api/prizes (sin stand) sigue siendo Autos', pAutos.stand === 'autos' && pAutos.data.every((p) => !/Ford/.test(p.name)));

  // ---- API: configuración de pantallas (Autos no debe recibir claves de otros canales) ----
  const cfgA = await j(`${API}/api/displays/config`);
  const keysA = Object.keys(cfgA.configs || {});
  check('displays/config de Autos solo trae sus claves', keysA.length > 0 && keysA.every((k) => ['roulette', 'qr', 'slider', 'combo'].includes(k)), keysA.join(','));
  const cfgF = await j(`${API}/api/displays/config?stand=ford`);
  check('displays/config de Ford intacto', Object.keys(cfgF.configs || {}).includes('roulette'));
  const cfgK = await j(`${API}/api/displays/config?stand=kiosk`);
  check('displays/config de Kiosco disponible', Object.keys(cfgK.configs || {}).includes('roulette'));

  // ---- API: giro real de cada canal con usuario de prueba ----
  const demo = { name: 'Asesor Demo 1', phone: '0990000001', email: 'demo1@mvevip.com', device_id: 'regr' };
  const spinMail = await j(`${API}/api/spin`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...demo, screen_id: 'MAIL_01', turnstile_token: 'BYPASS_DEV' }) });
  check('Canal Correo: POST /api/spin responde con premio y cita', spinMail.success && spinMail.data && spinMail.data.winner && spinMail.data.appointment && spinMail.in_queue === false);
  const spinAutos = await j(`${API}/api/spin`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...demo, screen_id: 'STAND_LOCAL', turnstile_token: 'BYPASS_DEV' }) });
  check('Stand Autos: POST /api/spin responde con premio', spinAutos.success && spinAutos.data && spinAutos.data.winner);
  const latestAutos = await j(`${API}/api/spin/latest?screen_id=STAND_LOCAL`);
  check('Stand Autos: /spin/latest ve el giro (cola intacta)', latestAutos.success && latestAutos.data && latestAutos.data.leadName === 'Asesor Demo 1');
  const demo2 = { name: 'Asesor Demo 2', phone: '0990000002', email: 'demo2@mvevip.com', device_id: 'regr2' };
  const spinFord = await j(`${API}/api/spin`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...demo2, screen_id: 'STAND_LOCAL_2', turnstile_token: 'BYPASS_DEV' }) });
  check('Stand Ford: POST /api/spin responde con premio', spinFord.success && spinFord.data && spinFord.data.winner);
  const noKiosk = await j(`${API}/api/spin/latest?screen_id=KIOSK_01`);
  check('Los giros de otros canales NO aparecen en el kiosco', !noKiosk.data || !['Asesor Demo 1', 'Asesor Demo 2'].includes(noKiosk.data.leadName));

  const channels = await j(`${API}/api/channels`);
  check('GET /api/channels sigue con sus 3 canales', channels.success && ['autos', 'ford', 'mail'].every((c) => channels.channels && channels.channels[c]));

  // ---- Navegador: las páginas existentes cargan sin errores ----
  const browser = await chromium.launch();
  const pages = [
    ['Móvil Autos  /', 'http://localhost:5503/', /Registro de Piloto|¡Juega y Gana!/i],
    ['Móvil Correo /?view=mail', 'http://localhost:5503/?view=mail', /Completa tus datos|Continuar/i],
    ['Móvil Ford   /formulario2', 'http://localhost:5503/formulario2', /Registro de Piloto|Ford/i],
    ['Pantalla Autos', 'http://localhost:5502/', /MARKETING|Marketing/i],
    ['Pantalla Ford (STAND_02)', 'http://localhost:5502/?screen=STAND_LOCAL_2', /Marketing|Ford/i],
    ['Admin', 'http://localhost:5504/', /PIN|ADMIN|Acceso/i]
  ];
  for (const [label, url, expected] of pages) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const body = await page.locator('body').innerText();
    check(`${label} carga`, expected.test(body) && errors.length === 0, errors[0] || '');
    await ctx.close();
  }
  await browser.close();
  const failed = results.filter((x) => !x).length;
  console.log(`\n${results.length - failed}/${results.length} comprobaciones de regresión correctas`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('ERROR:', e); process.exit(2); });
