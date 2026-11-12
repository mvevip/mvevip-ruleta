#!/usr/bin/env node
/**
 * Lambda mvevip-brevo SIMULADA (solo local, no envía correos reales). Imita las validaciones de POST /enviar-email.
 *   node deploy/tools/mock_brevo_lambda.js   (puerto 5599)
 * Consultas: GET /_log (cuerpos recibidos), DELETE /_log (vaciar).
 * Casos: correos @falla.test -> 400 como Brevo; @lento.test -> no responde en 12 s.
 */
const http = require('http');
const log = [];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
http.createServer((req, res) => {
  const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  if (req.url === '/_log') {
    if (req.method === 'DELETE') { log.length = 0; return send(200, { ok: true }); }
    return send(200, log);
  }
  if (req.method !== 'POST' || req.url !== '/enviar-email') return send(404, { message: 'Missing Authentication Token' });
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    let b; try { b = JSON.parse(raw); } catch (_) { return send(400, { error: 'bad json' }); }
    const { sender, to, templateId } = b;
    if (!to || !templateId || !sender) return send(400, { error: 'Missing recipient email, templateId, or sender' });
    if (!sender.email || !sender.name) return send(400, { error: 'Sender must have both email and name fields' });
    if (!EMAIL.test(to)) return send(400, { error: 'Invalid recipient email format' });
    log.push(b);
    if (/@falla\.test$/.test(to)) return send(400, { error: 'Brevo simulado: plantilla inexistente', details: null });
    if (/@lento\.test$/.test(to)) return setTimeout(() => send(200, { success: true, result: { messageId: 'tarde' } }), 12000);
    send(200, { success: true, result: { messageId: `mock-${log.length}` }, sender, replyTo: b.replyTo || null, attachmentsProcessed: 0 });
  });
}).listen(5599, () => console.log('Brevo simulado en :5599'));
