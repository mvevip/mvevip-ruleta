#!/usr/bin/env node
/**
 * Prueba local: un participante en la cola del stand Autos cuyo turno vence (EXPIRED) NO debe quedarse esperando para siempre:
 * el celular debe mostrar su pase del premio.
 * Requisitos locales: API :5500 (STAND_LOCAL), vite preview móvil :5503, MariaDB local (cliente `mariadb` como root).
 *   node deploy/tools/queue_expired_e2e.js
 */
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const API = 'http://localhost:5500';
const MOBILE = 'http://localhost:5503';
const sql = (q) => execSync(`mariadb -uroot marketingvip_roulette -N -e "${q}"`).toString().trim();
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };

(async () => {
  sql("DELETE FROM spin_queue WHERE screen_id='STAND_LOCAL'");
  // Participante A (usuario de prueba): la ruleta está libre -> queda en SPINNING y ocupa el stand
  const a = await fetch(`${API}/api/spin`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Asesor Demo 1', phone: '0990000001', email: 'demo1@mvevip.com', device_id: 'qa-a', screen_id: 'STAND_LOCAL', turnstile_token: 'BYPASS_DEV' }) }).then((r) => r.json());
  check('A entra directo (SPINNING)', a.success && a.in_queue === false);

  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await page.goto(`${MOBILE}/?screen=STAND_LOCAL`);
  await page.fill('input[name="name"]', 'Asesor Demo 2');
  await page.fill('input[name="phone"]', '0990000002');
  await page.fill('input[name="email"]', 'demo2@mvevip.com');
  const privacy = page.locator('input[name="accept_privacy"]');
  if (await privacy.count()) await privacy.check();
  await page.getByRole('button', { name: /Orlando/i }).click(); // destino de ensueño (obligatorio en Autos)
  await page.getByRole('button', { name: /JUEGA Y GANA/i }).click();
  // paso 2: botón ENGINE START
  await page.getByText(/ENGINE/i).first().waitFor({ timeout: 10000 });
  await page.locator('button:has-text("ENGINE")').first().click();

  await page.getByText(/fila|turno|espera/i).first().waitFor({ timeout: 15000 });
  const row = sql("SELECT status FROM spin_queue WHERE screen_id='STAND_LOCAL' ORDER BY id DESC LIMIT 1");
  check('B queda en la cola (WAITING)', row === 'WAITING', row);
  const waitingText = await page.locator('body').innerText();
  check('El celular de B muestra la espera', /fila|turno|espera/i.test(waitingText));

  // Se vence el turno de B en el servidor
  sql("UPDATE spin_queue SET status='EXPIRED', completed_at=NOW() WHERE screen_id='STAND_LOCAL' AND status='WAITING'");
  await page.waitForTimeout(4000); // el celular consulta cada 1,5 s
  const after = await page.locator('body').innerText();
  const stillWaiting = /TURNO\s*#|FILA DE SALIDA/i.test(after);
  check('Turno EXPIRED: el celular ya no queda esperando', !stillWaiting);
  check('Turno EXPIRED: se muestra el pase del premio (código de canje)', /canje|c[oó]digo|premio/i.test(after), after.replace(/\s+/g, ' ').slice(0, 160));
  await page.screenshot({ path: process.env.SHOT || '/tmp/claude-0/pw/expired.png' });
  await browser.close();
  sql("DELETE FROM spin_queue WHERE screen_id='STAND_LOCAL'");
  const okAll = results.every(Boolean);
  console.log(okAll ? '\nTODO OK' : '\nHAY FALLAS');
  process.exit(okAll ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
