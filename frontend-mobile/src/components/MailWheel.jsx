import React, { useMemo } from 'react';

// Divide el nombre del premio en 1 o 2 líneas balanceadas
function splitTextForSlice(name = '') {
  const clean = name.trim().toUpperCase();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= 1 || clean.length <= 9) return [clean];
  if (words.length === 2) return [words[0], words[1]];

  let bestSplit = [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')];
  let minMaxLen = Infinity;
  for (let i = 1; i < words.length; i++) {
    const l1 = words.slice(0, i).join(' ');
    const l2 = words.slice(i).join(' ');
    const maxLen = Math.max(l1.length, l2.length);
    if (maxLen < minMaxLen) {
      minMaxLen = maxLen;
      bestSplit = [l1, l2];
    }
  }
  return bestSplit;
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
    const textRadius = RADIUS * 0.68;
    const textX = CENTER + textRadius * Math.cos(midRad);
    const textY = CENTER + textRadius * Math.sin(midRad);

    const textLines = splitTextForSlice(prize.name);
    const maxLineLength = Math.max(...textLines.map((l) => l.length), 1);
    const availableChord = 2 * textRadius * Math.sin(((sliceAngle / 2) * Math.PI) / 180) - 16;

    // En un celular el SVG se reduce a ~55%: se parte de una letra grande y se limita al ancho seguro del gajo.
    // Orbitron 900 ocupa ~0.78em por carácter (medido en render real), más ancho que el 0.64 de la pantalla ovalada.
    const requested = textLines.length === 1 ? 34 : 29;
    const maxSafe = Math.floor(availableChord / (maxLineLength * 0.78));
    const fontSize = Math.max(12, Math.min(requested, maxSafe));

    return { ...prize, index, pathData, textX, textY, midAngle, textLines, fontSize };
  }), [prizes, sliceAngle]);

  return (
    <div className="relative w-full max-w-[380px] mx-auto select-none overflow-hidden pt-2">
      {/* Indicador selector */}
      <div className="absolute left-1/2 -top-1 -translate-x-1/2 z-30 flex flex-col items-center drop-shadow-[0_3px_8px_rgba(220,38,38,0.7)]">
        <div className="bg-gradient-to-b from-red-500 via-red-600 to-red-800 px-3 py-1 rounded-full border-2 border-red-400 flex items-center justify-center">
          <span className={`w-2.5 h-2.5 rounded-full bg-white ${isSpinning ? 'animate-ping' : ''}`} />
        </div>
        <div className="w-0 h-0 border-x-[10px] border-x-transparent border-t-[15px] border-t-red-600 -mt-0.5" />
      </div>

      {/* Disco trasero */}
      <div className="absolute inset-[2%] rounded-full border-4 border-zinc-700 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black shadow-2xl" />

      <div
        className="relative z-10 mt-2"
        style={{
          transform: `rotate(${rotationAngle}deg)`,
          transition: `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.99, 0.25, 1.0)`
        }}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-auto drop-shadow-2xl">
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
                    {slice.textLines.length === 1 ? (
                      <tspan x={slice.textX} dy="0">{slice.textLines[0]}</tspan>
                    ) : (
                      <>
                        <tspan x={slice.textX} dy="-0.65em">{slice.textLines[0]}</tspan>
                        <tspan x={slice.textX} dy="1.3em">{slice.textLines[1]}</tspan>
                      </>
                    )}
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
