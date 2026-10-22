#!/usr/bin/env node
/**
 * Genera la columna RULETA_TOKEN para importar en Brevo.
 * Uso:  MAIL_TOKEN_SECRET=<clave> node deploy/tools/make_mail_tokens.js entrada.csv salida.csv
 * La entrada debe tener una columna EMAIL (cualquier otra columna se conserva). Separador "," o ";".
 * La clave debe ser la MISMA que la variable MAIL_TOKEN_SECRET del Lambda.
 */
const fs = require('fs');
const crypto = require('crypto');

const [, , input, output] = process.argv;
const secret = process.env.MAIL_TOKEN_SECRET;
if (!input || !output || !secret) {
  console.error('Uso: MAIL_TOKEN_SECRET=<clave> node make_mail_tokens.js entrada.csv salida.csv');
  process.exit(1);
}

const token = (email) => crypto.createHmac('sha256', secret).update(email).digest('hex').slice(0, 16);

const raw = fs.readFileSync(input, 'utf8').replace(/^﻿/, '');
const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== '');
const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
const header = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, ''));
const emailIdx = header.findIndex((h) => h.toUpperCase() === 'EMAIL');
if (emailIdx < 0) {
  console.error('No se encontró una columna EMAIL. Columnas:', header.join(' | '));
  process.exit(1);
}

const out = [[...header, 'RULETA_TOKEN'].join(sep)];
let ok = 0;
const skipped = [];
lines.slice(1).forEach((line, i) => {
  const cols = line.split(sep);
  const email = (cols[emailIdx] || '').trim().replace(/^"|"$/g, '').toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
    skipped.push(`fila ${i + 2}: ${email || '(vacío)'}`);
    out.push([...cols, ''].join(sep));
    return;
  }
  out.push([...cols, token(email)].join(sep));
  ok += 1;
});

fs.writeFileSync(output, out.join('\n') + '\n', 'utf8');
console.log(`Tokens generados: ${ok} de ${lines.length - 1}. Archivo: ${output}`);
if (skipped.length) console.log(`Filas sin correo válido (${skipped.length}):\n  ` + skipped.slice(0, 20).join('\n  '));
