import React, { useMemo } from 'react';

// Todas las particiones de las palabras en `n` líneas (cortes entre palabras)
function splitsInto(words, n) {
  if (n === 1) return [[words.join(' ')]];
  const out = [];
  for (let i = 1; i <= words.length - (n - 1); i++) {
    const head = words.slice(0, i).join(' ');
    splitsInto(words.slice(i), n - 1).forEach((rest) => out.push([head, ...rest]));
  }
  return out;
}

const SIZE = 680;
const CENTER = SIZE / 2;
const RADIUS = CENTER - 30;
const SPIN_MS = 8000;

/**
 * Ruleta rin deportivo para el celular del cliente (campaña por correo).
 * Misma geometría y curva de giro que `AlloyWheel` de la pantalla del stand, pero
 * circular (sin ensanchamiento), fluida al ancho del dispositivo y con letra más grande.
 */
export default function MailWheel({ prizes = [], rotationAngle = 0, isSpinning = false }) {
  const totalSlices = prizes.length || 6;
  const sliceAngle = 360 / totalSlices;
  const textRadius = RADIUS * 0.66;

  const slices = useMemo(() => prizes.map((prize, index) => {
    const startAngle = index * sliceAngle - 90;
    const endAngle = startAngle + sliceAngle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = CENTER + RADIUS * Math.cos(startRad);
    const y1 = CENTER + RADIUS * Math.sin(startRad);
    const x2 = CENTER + RADIUS * Math.cos(endRad);
    const y2 = CENTER + RADIUS * Math.sin(endRad);
    const pathData = `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${sliceAngle > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;

    const midAngle = startAngle + sliceAngle / 2;
    const midRad = (midAngle * Math.PI) / 180;

    // Orbitron 900 ocupa ~0.78em por carácter. Las líneas van de forma tangencial, apiladas hacia el
    // centro: se prueba con 1, 2 y 3 líneas y se queda la partición que permita la letra más grande.
    const words = prize.name.trim().toUpperCase().split(/\s+/).filter(Boolean);
    const CHAR_W = 0.78;
    const LINE_H = 1.15;
    const MAX_FONT = 34;
    const EDGE_MARGIN = 26; // separación del aro exterior y los tornillos
    let best = { fontSize: 0, textLines: [words.join(' ')], centerR: textRadius };

    for (let n = 1; n <= Math.min(3, words.length); n++) {
      splitsInto(words, n).forEach((lines) => {
        const maxLen = Math.max(...lines.map((l) => l.length), 1);
        let f = MAX_FONT;
        let centerR = textRadius;
        // El bloque se pega al borde (donde el gajo es más ancho); la línea más interna es la más estrecha
        for (let k = 0; k < 4; k++) {
          centerR = Math.min(RADIUS * 0.8, RADIUS - EDGE_MARGIN - ((n - 1) / 2 + 0.5) * LINE_H * f);
          const innerR = centerR - ((n - 1) / 2) * LINE_H * f;
          const chord = 2 * innerR * Math.sin(((sliceAngle / 2) * Math.PI) / 180) - 18;
          f = Math.min(MAX_FONT, Math.floor(chord / (maxLen * CHAR_W)));
        }
        if (f > best.fontSize) best = { fontSize: f, textLines: lines, centerR };
      });
    }

    const textX = CENTER + best.centerR * Math.cos(midRad);
    const textY = CENTER + best.centerR * Math.sin(midRad);
    const textLines = best.textLines;
    const fontSize = Math.max(12, best.fontSize);
    const firstDy = -((textLines.length - 1) / 2) * LINE_H;

    return { ...prize, index, pathData, textX, textY, midAngle, textLines, fontSize, firstDy, lineH: LINE_H };
  }), [prizes, sliceAngle, textRadius]);

  return (
    <div className="relative w-full max-w-[380px] mx-auto select-none overflow-hidden pt-5">
      {/* Indicador selector */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 z-30 flex flex-col items-center drop-shadow-[0_3px_8px_rgba(220,38,38,0.7)]">
        <div className="bg-gradient-to-b from-red-500 via-red-600 to-red-800 px-3 py-1 rounded-full border-2 border-red-400 flex items-center justify-center">
          <span className={`w-2.5 h-2.5 rounded-full bg-white ${isSpinning ? 'animate-ping' : ''}`} />
        </div>
        <div className="w-0 h-0 border-x-[10px] border-x-transparent border-t-[15px] border-t-red-600 -mt-0.5" />
      </div>

      {/* Disco trasero */}
      <div className="absolute left-[2%] right-[2%] top-[calc(1.25rem+2%)] aspect-square rounded-full border-4 border-zinc-700 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />

      <div
        className="relative z-10 mt-2"
        style={{
          transform: `rotate(${rotationAngle}deg)`,
          transition: `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.99, 0.25, 1.0)`
        }}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-auto">
          <defs>
            <linearGradient id="mailRimChrome" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9CA3AF" />
              <stop offset="50%" stopColor="#27272A" />
              <stop offset="100%" stopColor="#E5E7EB" />
            </linearGradient>
            <clipPath id="mailHubLogoClip">
              <circle cx={CENTER} cy={CENTER} r="50" />
            </clipPath>
          </defs>

          <circle cx={CENTER} cy={CENTER} r={RADIUS + 8} fill="none" stroke="url(#mailRimChrome)" strokeWidth="16" />
          <circle cx={CENTER} cy={CENTER} r={RADIUS + 1} fill="none" stroke="#9AC31C" strokeWidth="2.5" opacity="0.9" />
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="#111827" />

          {slices.map((slice) => {
            const fill = slice.color_hex || '#9AC31C';
            return (
              <g key={slice.id || slice.index}>
                <path d={slice.pathData} fill={fill} stroke="#18181B" strokeWidth="2.5" />
                <line
                  x1={CENTER}
                  y1={CENTER}
                  x2={CENTER + RADIUS * Math.cos(((slice.index * sliceAngle - 90) * Math.PI) / 180)}
                  y2={CENTER + RADIUS * Math.sin(((slice.index * sliceAngle - 90) * Math.PI) / 180)}
                  stroke="#E5E7EB"
                  strokeWidth="2.5"
                  opacity="0.85"
                />
                <g transform={`rotate(${slice.midAngle + 90}, ${slice.textX}, ${slice.textY})`}>
                  <text
                    x={slice.textX}
                    y={slice.textY}
                    fill={slice.text_color || '#FFFFFF'}
                    fontSize={slice.fontSize}
                    fontWeight="900"
                    fontFamily="'Orbitron', sans-serif"
                    letterSpacing="0.02em"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {slice.textLines.map((line, li) => (
                      <tspan key={li} x={slice.textX} dy={li === 0 ? `${slice.firstDy}em` : `${slice.lineH}em`}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              </g>
            );
          })}

          {Array.from({ length: 16 }).map((_, i) => {
            const a = (i * (360 / 16) * Math.PI) / 180;
            return (
              <circle key={i} cx={CENTER + (RADIUS - 8) * Math.cos(a)} cy={CENTER + (RADIUS - 8) * Math.sin(a)} r="4" fill="#E5E7EB" stroke="#18181B" strokeWidth="1.5" />
            );
          })}

          <circle cx={CENTER} cy={CENTER} r="65" fill="#18181B" stroke="url(#mailRimChrome)" strokeWidth="6" />
          <circle cx={CENTER} cy={CENTER} r="54" fill="#FFFFFF" />
          <image
            href="/logotipo.png"
            x={CENTER - 48}
            y={CENTER - 48}
            width="96"
            height="96"
            preserveAspectRatio="xMidYMid meet"
            clipPath="url(#mailHubLogoClip)"
          />
        </svg>
      </div>
    </div>
  );
}

export const MAIL_SPIN_MS = SPIN_MS;
