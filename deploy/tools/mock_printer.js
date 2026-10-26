#!/usr/bin/env node
/**
 * Impresora simulada para probar el kiosco SIN papel ni hardware.
 * Imita la API local del PC del kiosco (puerto 8765): GET /health, POST /print, POST /print-image.
 *
 *   node deploy/tools/mock_printer.js [carpeta_de_salida] [--fail]
 *
 * Guarda cada trabajo recibido en la carpeta (texto .txt / imagen .png). Con --fail responde error 500 (prueba de fallo).
 * Con --no-image simula una impresora SIN el endpoint /print-image (404): la página debe imprimir el ticket de texto de respaldo.
 * En producción el servicio real solo acepta llamadas desde https://autos.mvevip.com; este mock acepta cualquier origen.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : './printer_jobs');
const failMode = process.argv.includes('--fail');
const noImage = process.argv.includes('--no-image');
fs.mkdirSync(outDir, { recursive: true });
let jobCounter = 0;

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Private-Network': 'true'
  });
  res.end(JSON.stringify(body));
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true, printer: 'TG2480-MOCK' });
  if (noImage && req.url === '/print-image') return send(res, 404, { ok: false, error: 'No encontrado' });
  if (req.method === 'POST' && (req.url === '/print' || req.url === '/print-image')) {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 5e6) req.destroy(); });
    req.on('end', () => {
      if (failMode) return send(res, 500, { ok: false, error: 'Impresora simulada en modo fallo' });
      try {
        const body = JSON.parse(raw || '{}');
        jobCounter += 1;
        const id = `job-${String(jobCounter).padStart(3, '0')}-${Date.now()}`;
        if (req.url === '/print') {
          const lines = Array.isArray(body.lines) ? body.lines : [];
          if (lines.length > 40 || lines.some((l) => String(l).length > 96)) return send(res, 400, { ok: false, error: 'Máx. 40 líneas de 96 caracteres' });
          fs.writeFileSync(path.join(outDir, `${id}.txt`), lines.join('\n') + '\n');
        } else {
          fs.writeFileSync(path.join(outDir, `${id}.png`), Buffer.from(String(body.image || ''), 'base64'));
        }
        console.log(`[mock] ${req.url} -> ${id}`);
        return send(res, 200, { ok: true, job: id });
      } catch (e) {
        return send(res, 400, { ok: false, error: 'JSON inválido' });
      }
    });
    return;
  }
  send(res, 404, { ok: false, error: 'No encontrado' });
}).listen(8765, '127.0.0.1', () => console.log(`[mock] impresora simulada en http://127.0.0.1:8765 (salida: ${outDir})${failMode ? ' [MODO FALLO]' : ''}${noImage ? ' [SIN /print-image]' : ''}`));
