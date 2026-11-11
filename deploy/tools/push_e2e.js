#!/usr/bin/env node
/**
 * Pruebas de las notificaciones push (VAPID) del Admin. SOLO LOCAL.
 * Simula el servicio de push del navegador con un servidor HTTPS local (certificado propio) y descifra el mensaje
 * (RFC 8291) para comprobar su contenido. Requisitos: API :5500 en desarrollo arrancada con
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... KIOSK_KEY_RIO=keyrio111
 *   (par de claves de prueba: npx web-push generate-vapid-keys) y openssl instalado.
 *   VAPID_PUBLIC_KEY=<la misma> node deploy/tools/push_e2e.js
 */
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const API = 'http://localhost:5500';
const PIN = process.env.ADMIN_PIN || 'VIP2026';
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const call = (method, p, body, headers = {}) => fetch(`${API}${p}`, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined })
  .then((r) => r.json().then((json) => ({ status: r.status, body: json })));
const admin = { 'x-admin-pin': PIN };

// ---- Servicio de push simulado (HTTPS local) ----
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pushe2e-'));
execSync(`openssl req -x509 -newkey rsa:2048 -nodes -keyout ${dir}/k.pem -out ${dir}/c.pem -days 1 -subj "/CN=localhost" 2>/dev/null`);
const received = {};      // id -> [{headers, body}]
const behaviour = {};     // id -> status a responder (201 por defecto)
const server = https.createServer({ key: fs.readFileSync(`${dir}/k.pem`), cert: fs.readFileSync(`${dir}/c.pem`) }, (req, res) => {
  const id = req.url.split('/').pop();
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    (received[id] = received[id] || []).push({ headers: req.headers, body: Buffer.concat(chunks) });
    res.writeHead(behaviour[id] || 201); res.end();
  });
});

function newSubscription(id) {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const auth = crypto.randomBytes(16);
  return {
    id, ecdh, auth,
    subscription: { endpoint: `https://localhost:8443/push/${id}`, keys: { p256dh: b64u(ecdh.getPublicKey()), auth: b64u(auth) } }
  };
}

const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();
function decrypt(sub, body) {
  const salt = body.subarray(0, 16);
  const idlen = body[20];
  const senderPub = body.subarray(21, 21 + idlen);
  const cipher = body.subarray(21 + idlen);
  const secret = sub.ecdh.computeSecret(senderPub);
  const prkKey = hmac(sub.auth, secret);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), sub.ecdh.getPublicKey(), senderPub, Buffer.from([1])]);
  const ikm = hmac(prkKey, keyInfo).subarray(0, 32);
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: aes128gcm\0'), Buffer.from([1])])).subarray(0, 16);
  const nonce = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: nonce\0'), Buffer.from([1])])).subarray(0, 12);
  const d = crypto.createDecipheriv('aes-128-gcm', cek, nonce);
  d.setAuthTag(cipher.subarray(cipher.length - 16));
  const plain = Buffer.concat([d.update(cipher.subarray(0, cipher.length - 16)), d.final()]);
  const end = plain.lastIndexOf(2);
  return JSON.parse(plain.subarray(0, end).toString('utf8'));
}
const lastMessage = (sub) => { const list = received[sub.id] || []; return list.length ? decrypt(sub, list[list.length - 1].body) : null; };
const count = (sub) => (received[sub.id] || []).length;

const spinAs = (screen_id, n) => call('POST', '/api/spin', { name: `Persona Push ${n}`, phone: `0993000${String(n).padStart(3, '0')}`, email: `push${n}@e2e.test`, device_id: `pe${n}`, screen_id, turnstile_token: 'BYPASS_DEV' });

(async () => {
  await new Promise((r) => server.listen(8443, r));
  try {
    // ---- Configuración y acceso ----
    let r = await call('GET', '/api/push/public-key');
    check('La clave pública VAPID es pública y está configurada', r.body.success && r.body.configured === true && r.body.publicKey === VAPID_PUBLIC);
    r = await call('POST', '/api/admin/push/subscribe', { subscription: {} });
    check('Suscribirse exige el PIN (401)', r.status === 401);
    r = await call('GET', '/api/admin/push/status');
    check('Ver el estado exige el PIN (401)', r.status === 401);
    r = await call('POST', '/api/admin/push/subscribe', { subscription: { endpoint: 'http://inseguro.test/x', keys: { p256dh: 'a', auth: 'b' } } }, admin);
    check('Rechaza un endpoint que no es https', r.status === 400);

    // ---- Dispositivo A: solo Riobamba ----
    const A = newSubscription('devA');
    r = await call('POST', '/api/admin/push/subscribe', { subscription: A.subscription, filters: { events: ['riobamba'] }, label: 'PC de prueba' }, admin);
    check('Suscribe el dispositivo A (solo Riobamba)', r.status === 200 && r.body.success && r.body.filters.events.join() === 'riobamba');
    r = await call('GET', `/api/admin/push/status?endpoint=${encodeURIComponent(A.subscription.endpoint)}`, null, admin);
    check('El estado reconoce el dispositivo y sus filtros', r.body.registered === true && r.body.label === 'PC de prueba' && r.body.filters.events.join() === 'riobamba' && r.body.devices >= 1);

    // ---- Notificación de prueba ----
    r = await call('POST', '/api/admin/push/test', { endpoint: A.subscription.endpoint }, admin);
    const t = lastMessage(A);
    check('La notificación de prueba llega y se descifra', r.status === 200 && t && /Notificaciones activas/.test(t.title));
    const req0 = received.devA[0];
    check('El envío va firmado con VAPID y cifrado (aes128gcm)', /^vapid t=/.test(req0.headers.authorization || '') && (req0.headers.authorization || '').includes(`k=${VAPID_PUBLIC}`) && req0.headers['content-encoding'] === 'aes128gcm' && Number(req0.headers.ttl) > 0);

    // ---- Lead de Riobamba (pantalla gigante) ----
    let before = count(A);
    let s = await spinAs('RIO_STAND', 1);
    await wait(500);
    let m = lastMessage(A);
    check('Lead de Riobamba (pantalla): llega 1 notificación', count(A) === before + 1 && s.body.success);
    check('Contenido: ciudad, frente, nombre y premio', m.title === 'Nuevo lead · Riobamba · Pantalla' && m.body === `Persona Push 1 ganó ${s.body.data.winner.name}`, `${m.title} | ${m.body}`);
    check('No incluye teléfono ni correo', !JSON.stringify(m).includes('0993000') && !JSON.stringify(m).includes('@e2e.test'));
    check('Abre los leads de esa ciudad', m.url === './#/leads?event=riobamba');

    // ---- Filtro por ciudad ----
    before = count(A);
    await spinAs('AMB_STAND', 2);
    await wait(500);
    check('Lead de Ambato: el dispositivo A (solo Riobamba) NO lo recibe', count(A) === before);

    // ---- Dispositivo B: todo, sin demos ----
    const B = newSubscription('devB');
    await call('POST', '/api/admin/push/subscribe', { subscription: B.subscription, filters: { includeDemo: false } }, admin);
    before = count(B);
    await spinAs('AMB_MAIL', 3);
    await wait(500);
    check('El dispositivo B (todo) recibe el lead de Ambato por correo', count(B) === before + 1 && lastMessage(B).title === 'Nuevo lead · Ambato · Correo');

    // ---- Kiosco: registro sin premio ----
    before = count(A);
    const reg = await call('POST', '/api/kiosk/register', { name: 'Persona Push 4', phone: '0993000004', email: 'push4@e2e.test', device_id: 'pe4', screen_id: 'RIO_KIOSK', turnstile_token: 'BYPASS_DEV' });
    await wait(500);
    m = lastMessage(A);
    check('Registro en el kiosco de Riobamba: notifica sin premio', reg.body.success && count(A) === before + 1 && m.title === 'Nuevo lead · Riobamba · Kiosco' && /se registró/.test(m.body), m && m.body);

    // ---- Filtro de frente y usuarios demo ----
    await call('PUT', '/api/admin/push/filters', { endpoint: B.subscription.endpoint, filters: { events: ['riobamba'], fronts: ['mail'], includeDemo: false } }, admin);
    before = count(B);
    await spinAs('RIO_STAND', 5);
    await wait(400);
    check('Filtro por frente (solo Correo): un lead de Pantalla no llega', count(B) === before);
    const demo = await call('POST', '/api/spin', { name: 'Asesor Demo 1', phone: '0990000001', email: 'demo1@mvevip.com', device_id: 'pdemo', screen_id: 'RIO_MAIL', turnstile_token: 'BYPASS_DEV' });
    await wait(400);
    check('Un usuario demo no llega si el dispositivo excluye demos', demo.status === 200 && count(B) === before);
    const m2 = lastMessage(A);
    check('...pero al dispositivo A (incluye demos) sí, marcado DEMO', /^DEMO · /.test(m2.title), m2.title);

    // ---- Suscripción caducada (el servicio responde 410) ----
    const C = newSubscription('devC');
    await call('POST', '/api/admin/push/subscribe', { subscription: C.subscription, filters: { events: ['ambato'] } }, admin);
    behaviour.devC = 410;
    await spinAs('AMB_STAND', 6);
    await wait(500);
    r = await call('GET', `/api/admin/push/status?endpoint=${encodeURIComponent(C.subscription.endpoint)}`, null, admin);
    check('Una suscripción caducada (410) se elimina sola', r.body.registered === false);

    // ---- Baja ----
    r = await call('POST', '/api/admin/push/unsubscribe', { endpoint: B.subscription.endpoint }, admin);
    r = await call('GET', `/api/admin/push/status?endpoint=${encodeURIComponent(B.subscription.endpoint)}`, null, admin);
    check('Desactivar las notificaciones elimina el dispositivo', r.body.registered === false);
    r = await call('GET', '/api/admin/push/devices', null, admin);
    check('Listado de dispositivos', r.body.success && r.body.data.some((d) => d.label === 'PC de prueba'));

    // ---- El flujo de participación no depende de las notificaciones ----
    behaviour.devA = 500;
    const t0 = Date.now();
    s = await spinAs('RIO_MAIL', 7);
    check('Si el servicio de push falla, la participación igual responde bien y rápido', s.status === 200 && s.body.success && Date.now() - t0 < 4500, `${Date.now() - t0} ms`);
  } finally {
    server.close();
  }
  console.log(`\n${results.filter(Boolean).length}/${results.length} comprobaciones correctas`);
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
