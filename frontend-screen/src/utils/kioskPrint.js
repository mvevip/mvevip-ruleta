/**
 * Impresión del ticket del kiosco en la térmica TG2480H (80 mm) desde el propio PC del kiosco.
 * El servicio local de impresión escucha en http://127.0.0.1:8765 y solo acepta llamadas desde https://autos.mvevip.com.
 *
 *   GET  /health        -> {"ok":true,"printer":"TG2480"}
 *   POST /print         -> {"lines":[...]}  texto (máx. 40 líneas, 96 caracteres por línea)
 *   POST /print-image   -> {"image":"<PNG base64, 576 px de ancho, 1 bit>","cut":true}  boarding pass gráfico (pendiente en el servicio local)
 *
 * Modo de impresión: por defecto 'image' (boarding pass con logo y QR); si la impresora rechaza la imagen se imprime el
 * ticket de texto como respaldo. ?print=text en la URL de la pantalla del botón fuerza solo texto.
 */

import QRCode from 'qrcode';

const PRINT_API = 'http://127.0.0.1:8765';
const PRINT_TIMEOUT_MS = 8000;

export const PRINT_WIDTH = 576; // 72 mm a 203 dpi (2 mm de margen por lado sobre 76 mm imprimibles)

export function getPrintMode() {
  try {
    const mode = new URLSearchParams(window.location.search).get('print');
    return mode === 'text' ? 'text' : 'image';
  } catch (e) {
    return 'image';
  }
}

async function postJson(path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PRINT_TIMEOUT_MS);
  try {
    const res = await fetch(`${PRINT_API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) throw new Error(json.error || `La impresora respondió ${res.status}`);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

/** ¿Está el servicio local de impresión disponible? */
export async function checkPrinter() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${PRINT_API}/health`, { signal: controller.signal });
    const json = await res.json();
    return Boolean(json && json.ok);
  } catch (e) {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Ticket de texto (fase 1) ----------

// La cola es "raw": se evitan acentos y símbolos para no depender de la tabla de caracteres de la impresora
function plain(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

function wrap(text, width) {
  const words = plain(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach((word) => {
    if ((current + ' ' + word).trim().length > width) {
      if (current) lines.push(current);
      current = word.slice(0, width);
    } else {
      current = (current + ' ' + word).trim();
    }
  });
  if (current) lines.push(current);
  return lines;
}

const WIDTH = 42;
const center = (text) => {
  const t = plain(text).slice(0, WIDTH);
  return ' '.repeat(Math.max(0, Math.floor((WIDTH - t.length) / 2))) + t;
};

export function buildTextLines(ticket) {
  const rule = '='.repeat(WIDTH);
  const lines = [
    rule,
    center('MARKETING VIP'),
    center('Especialistas en suenos'),
    rule,
    center('TICKET DE PREMIO'),
    '',
    'Participante:',
    ...wrap(ticket.leadName, WIDTH - 2).map((l) => '  ' + l),
    '',
    'Premio:',
    ...wrap(ticket.winner && ticket.winner.name, WIDTH - 2).slice(0, 3).map((l) => '  ' + l),
    '',
    'Codigo de canje:',
    center(ticket.ticketCode),
    '',
    'Fecha: ' + plain(ticket.playedAt),
    '-'.repeat(WIDTH),
    ...wrap('Presenta este ticket en Marketing VIP para canjear tu premio.', WIDTH),
    '',
    ''
  ];
  return lines.slice(0, 40);
}

// ---------- Boarding pass gráfico (fase 2) ----------

function dashedLine(ctx, y) {
  ctx.save();
  ctx.setLineDash([12, 8]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(8, y);
  ctx.lineTo(PRINT_WIDTH - 8, y);
  ctx.stroke();
  ctx.restore();
}

function fitText(ctx, text, maxWidth, startSize, weight = '800') {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px "Montserrat", Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth || size <= 22) break;
    size -= 2;
  } while (size > 22);
  return size;
}

function wrapCanvas(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const attempt = current ? `${current} ${word}` : word;
    if (ctx.measureText(attempt).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = attempt;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

// ---------- Logo en 1 bit (tramado Floyd–Steinberg) ----------

const LOGO_SOURCES = ['/pantalla/logotipo.png', '/logotipo.png'];
const LOGO_WIDTH = 340;
const LOGO_GAMMA = 2.0; // oscurece los tonos medios (el verde corporativo es muy claro y saldría casi blanco)
let logoCache = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    img.src = src;
  });
}

/** Devuelve un canvas con el logo ya tramado en blanco/negro puro (o null si no se pudo cargar). */
async function loadDitheredLogo() {
  if (logoCache) return logoCache;
  let img = null;
  for (const src of LOGO_SOURCES) {
    try { img = await loadImage(src); break; } catch (e) { /* prueba la siguiente ruta */ }
  }
  if (!img) return null;

  const w = LOGO_WIDTH;
  const h = Math.round(img.naturalHeight * (w / img.naturalWidth));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const data = ctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i += 1) {
    const lum = 0.299 * data.data[i * 4] + 0.587 * data.data[i * 4 + 1] + 0.114 * data.data[i * 4 + 2];
    gray[i] = 255 * Math.pow(lum / 255, LOGO_GAMMA);
  }
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const idx = y * w + x;
      const old = gray[idx];
      const val = old < 128 ? 0 : 255;
      const err = old - val;
      gray[idx] = val;
      if (x + 1 < w) gray[idx + 1] += err * 7 / 16;
      if (y + 1 < h) {
        if (x > 0) gray[idx + w - 1] += err * 3 / 16;
        gray[idx + w] += err * 5 / 16;
        if (x + 1 < w) gray[idx + w + 1] += err * 1 / 16;
      }
    }
  }
  for (let i = 0; i < w * h; i += 1) {
    const v = gray[i] < 128 ? 0 : 255;
    data.data[i * 4] = data.data[i * 4 + 1] = data.data[i * 4 + 2] = v;
    data.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  logoCache = canvas;
  return canvas;
}

/** Dibuja el boarding pass a 576 px de ancho, solo blanco y negro. Devuelve un canvas ya binarizado. */
export async function renderBoardingPass(ticket) {
  const logo = await loadDitheredLogo();
  const W = PRINT_WIDTH;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = 1200; // se recorta al final
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'top';

  const pad = 14;
  const inner = W - pad * 2;
  let y = 12;

  // Encabezado: logo de Marketing VIP (tramado en 1 bit); si no carga, el nombre en texto
  ctx.textAlign = 'center';
  if (logo) {
    ctx.drawImage(logo, Math.round((W - logo.width) / 2), y);
    y += logo.height + 14;
  } else {
    ctx.font = '900 46px "Orbitron", "Montserrat", Arial, sans-serif';
    ctx.fillText('MARKETING VIP', W / 2, y); y += 54;
    ctx.font = '600 24px "Montserrat", Arial, sans-serif';
    ctx.fillText('Especialistas en sueños', W / 2, y); y += 38;
  }

  // Barra BOARDING PASS (invertida)
  ctx.fillRect(pad, y, inner, 52);
  ctx.fillStyle = '#fff';
  ctx.font = '900 30px "Montserrat", Arial, sans-serif';
  ctx.fillText('BOARDING PASS · PREMIO', W / 2, y + 10);
  ctx.fillStyle = '#000';
  y += 52 + 22;

  // Pasajero
  ctx.textAlign = 'left';
  ctx.font = '700 22px "Montserrat", Arial, sans-serif';
  ctx.fillText('PASAJERO', pad, y); y += 28;
  const nameSize = fitText(ctx, String(ticket.leadName || '').toUpperCase(), inner, 36);
  ctx.fillText(String(ticket.leadName || '').toUpperCase(), pad, y); y += nameSize + 18;

  dashedLine(ctx, y); y += 18;

  // Premio
  ctx.font = '700 22px "Montserrat", Arial, sans-serif';
  ctx.fillText('PREMIO', pad, y); y += 28;
  ctx.font = '900 34px "Montserrat", Arial, sans-serif';
  const prizeLines = wrapCanvas(ctx, ticket.winner && ticket.winner.name, inner, 3);
  prizeLines.forEach((line) => { ctx.fillText(line, pad, y); y += 42; });
  y += 8;

  dashedLine(ctx, y); y += 18;

  // Código y fecha
  ctx.font = '700 22px "Montserrat", Arial, sans-serif';
  ctx.fillText('CÓDIGO DE CANJE', pad, y);
  ctx.textAlign = 'right';
  ctx.fillText('FECHA', W - pad, y);
  y += 28;
  ctx.textAlign = 'left';
  ctx.font = '900 54px "Courier New", monospace';
  ctx.fillText(String(ticket.ticketCode || ''), pad, y);
  ctx.textAlign = 'right';
  ctx.font = '700 24px "Montserrat", Arial, sans-serif';
  ctx.fillText(String(ticket.playedAt || '').slice(0, 10), W - pad, y + 6);
  ctx.fillText(String(ticket.playedAt || '').slice(11), W - pad, y + 34);
  y += 70;

  dashedLine(ctx, y); y += 20;

  // QR de canje (módulos de tamaño entero para que quede nítido en 1 bit)
  const qr = QRCode.create(String(ticket.qrText || ticket.ticketCode || ''), { errorCorrectionLevel: 'M' });
  const modules = qr.modules.size;
  const quiet = 3;
  const scale = Math.max(4, Math.floor(320 / (modules + quiet * 2)));
  const qrPx = (modules + quiet * 2) * scale;
  const qrX = Math.round((W - qrPx) / 2);
  ctx.fillStyle = '#fff';
  ctx.fillRect(qrX, y, qrPx, qrPx);
  ctx.fillStyle = '#000';
  for (let row = 0; row < modules; row += 1) {
    for (let col = 0; col < modules; col += 1) {
      if (qr.modules.get(col, row)) {
        ctx.fillRect(qrX + (col + quiet) * scale, y + (row + quiet) * scale, scale, scale);
      }
    }
  }
  y += qrPx + 14;

  ctx.textAlign = 'center';
  ctx.font = '700 24px "Montserrat", Arial, sans-serif';
  ctx.fillText('Presenta este código para canjear', W / 2, y); y += 30;
  ctx.fillText('tu premio en Marketing VIP', W / 2, y); y += 44;

  dashedLine(ctx, y); y += 30;

  // Recorte de la altura usada y binarización (umbral duro: sin grises)
  const height = Math.min(y, canvas.height);
  const out = document.createElement('canvas');
  out.width = W;
  out.height = height;
  const octx = out.getContext('2d');
  octx.drawImage(canvas, 0, 0, W, height, 0, 0, W, height);
  const img = octx.getImageData(0, 0, W, height);
  for (let i = 0; i < img.data.length; i += 4) {
    const lum = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
    const v = lum < 170 ? 0 : 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  return out;
}

/** Imprime el ticket (sin diálogos: se envía directo al servicio local). Lanza un Error si falla. */
export async function printTicket(ticket, mode = getPrintMode()) {
  if (mode === 'image') {
    try {
      // Asegura las tipografías antes de dibujar (si no, el canvas usaría una de respaldo)
      try {
        if (document.fonts && document.fonts.load) {
          await Promise.all([
            document.fonts.load('900 46px "Orbitron"'),
            document.fonts.load('900 34px "Montserrat"'),
            document.fonts.load('700 22px "Montserrat"')
          ]);
        }
      } catch (e) { /* se usa la tipografía disponible */ }
      const canvas = await renderBoardingPass(ticket);
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      return await postJson('/print-image', { image: base64, cut: true });
    } catch (imageError) {
      // Respaldo: si la impresora no acepta la imagen, el visitante igual recibe su ticket (texto)
      console.warn('[Kiosco] Falló la impresión con imagen, se imprime el ticket de texto:', imageError);
      return postJson('/print', { lines: buildTextLines(ticket) });
    }
  }
  return postJson('/print', { lines: buildTextLines(ticket) });
}
