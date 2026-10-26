#!/usr/bin/env node
/**
 * Prueba extremo a extremo del kiosco en LOCAL con 3 navegadores: pantalla de arriba, pantalla de abajo y celular.
 * Requisitos: API en :5500 (KIOSK_KEY=testkey123), vite preview de screen :5502 y mobile :5503, impresora simulada :8765.
 *   node deploy/tools/kiosk_e2e.js <carpeta_capturas>
 */
const path = require('path');
const { chromium } = require('playwright');

const SHOTS = path.resolve(process.argv[2] || './e2e_shots');
const KEY = process.env.KIOSK_KEY || 'testkey123';
const TOP = 'http://localhost:5502/?screen=KIOSK_01';
const BOTTOM = `http://localhost:5502/?view=kiosk-button&screen=KIOSK_01&k=${KEY}`;
const PHONE = 'http://localhost:5503/?screen=KIOSK_01';

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function fillAndRegister(page, { name, phone, email }) {
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="phone"]', phone);
  await page.fill('input[name="email"]', email);
  await page.getByRole('button', { name: /Registrarme/i }).click();
}

async function bottomButton(page) {
  return page.getByRole('button', { name: /JUGAR AHORA/i });
}

async function playRound(browser, ctxs, user, label) {
  const { top, bottom } = ctxs;
  const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone) Mobile' });
  const phone = await phoneCtx.newPage();
  await phone.goto(PHONE);
  await phone.waitForSelector('input[name="name"]');

  check(`${label}: botón de abajo inhabilitado antes del registro`, await (await bottomButton(bottom)).isDisabled());

  await fillAndRegister(phone, user);
  await phone.getByText(/Registro listo/i).waitFor({ timeout: 10000 });
  check(`${label}: celular muestra "Registro listo"`, true);

  const btn = await bottomButton(bottom);
  await bottom.waitForFunction(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /JUGAR AHORA/i.test(x.textContent));
    return b && !b.disabled;
  }, null, { timeout: 8000 });
  check(`${label}: botón de abajo se habilita tras el registro`, !(await btn.isDisabled()));
  await bottom.screenshot({ path: path.join(SHOTS, `${label}_1_boton_habilitado.png`) });
  await phone.screenshot({ path: path.join(SHOTS, `${label}_1_celular_espera.png`) });

  await btn.click();
  await phone.getByText(/Girando/i).waitFor({ timeout: 8000 });
  check(`${label}: celular pasa a "Girando" sin mostrar el premio`, !(await phone.getByText(/Código de canje/i).count()));
  check(`${label}: botón se bloquea durante el giro`, await (await bottomButton(bottom)).isDisabled());
  await top.screenshot({ path: path.join(SHOTS, `${label}_2_ruleta_girando.png`) });

  // Premio en celular (~10 s) y en la pantalla de arriba (~8-9 s)
  await phone.getByText(/Código de canje/i).waitFor({ timeout: 40000 });
  const code = (await phone.locator('p.font-mono').first().textContent() || '').trim();
  check(`${label}: celular muestra premio y código (${code})`, /^VIP-[A-Z0-9]{4}$/.test(code));
  await phone.screenshot({ path: path.join(SHOTS, `${label}_3_celular_premio.png`) });
  await top.screenshot({ path: path.join(SHOTS, `${label}_3_pantalla_premio.png`) });
  const topHasCode = (await top.content()).includes(code);
  check(`${label}: pantalla de arriba muestra el ticket ${code}`, topHasCode);

  // Impresión
  await bottom.getByText(/Retira tu ticket|No se pudo imprimir/i).waitFor({ timeout: 15000 });
  const printed = await bottom.getByText(/Retira tu ticket/i).count();
  check(`${label}: pantalla de abajo confirma la impresión`, printed > 0);
  await bottom.screenshot({ path: path.join(SHOTS, `${label}_4_impresion.png`) });

  // Reinicio: el botón vuelve a bloquearse y el kiosco queda libre
  await bottom.waitForFunction(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /JUGAR AHORA/i.test(x.textContent));
    return b && b.disabled;
  }, null, { timeout: 8000 });
  check(`${label}: botón bloqueado de nuevo (kiosco libre)`, await (await bottomButton(bottom)).isDisabled());
  return { phone, phoneCtx, code };
}

(async () => {
  const browser = await chromium.launch();
  const topCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const bottomCtx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const top = await topCtx.newPage();
  const bottom = await bottomCtx.newPage();
  top.on('pageerror', (e) => console.log('[top error]', e.message));
  bottom.on('pageerror', (e) => console.log('[bottom error]', e.message));
  await top.goto(TOP);
  await bottom.goto(BOTTOM);
  await top.waitForTimeout(1500);
  await bottom.waitForSelector('text=JUGAR AHORA');
  await top.screenshot({ path: path.join(SHOTS, '0_pantalla_arriba_inicial.png') });
  await bottom.screenshot({ path: path.join(SHOTS, '0_pantalla_abajo_inicial.png') });

  const stamp = Date.now().toString().slice(-6);
  const ctxs = { top, bottom };

  const a = await playRound(browser, ctxs, { name: 'Ana Prueba Kiosco', phone: '09' + '5' + stamp + '1', email: `ana${stamp}@test.com` }, 'R1');
  const b = await playRound(browser, ctxs, { name: 'Luis Prueba Kiosco', phone: '09' + '6' + stamp + '2', email: `luis${stamp}@test.com` }, 'R2');
  check('R1 y R2 generan tickets distintos', a.code !== b.code);

  // Quien ya jugó vuelve a registrarse: ve su ticket y el botón NO se activa
  // Recargar con la sesión guardada: el visitante vuelve a ver su ticket (no el formulario)
  await a.phone.reload();
  await a.phone.getByText(/Código de canje/i).waitFor({ timeout: 10000 });
  check('Al recargar, el celular conserva su ticket', (await a.phone.content()).includes(a.code));
  // Sin sesión guardada (otro navegador) y mismo contacto: el servidor devuelve el ticket anterior
  await a.phone.evaluate(() => sessionStorage.clear());
  await a.phone.reload();
  await a.phone.waitForSelector('input[name="name"]');
  await fillAndRegister(a.phone, { name: 'Ana Prueba Kiosco', phone: '09' + '5' + stamp + '1', email: `ana${stamp}@test.com` });
  await a.phone.getByText(/Tu ticket/i).waitFor({ timeout: 10000 });
  check('Quien ya jugó ve su ticket anterior', (await a.phone.content()).includes(a.code));
  await wait(2500);
  check('Quien ya jugó NO activa el botón', await (await bottomButton(bottom)).isDisabled());

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} comprobaciones correctas`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('ERROR en la prueba:', e); process.exit(2); });
