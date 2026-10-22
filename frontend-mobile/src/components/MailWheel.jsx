import React, { useMemo } from 'react';
import { Gift } from 'lucide-react';
import { getPrizeIcon } from '../utils/prizeIcons';

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

// Paleta del diseño de campaña
const NAVY = '#0B2A4A';
const LIME = '#A8D120';
const BLUE = '#1A6FC4';

/** Color de cada gajo: alterna lima/navy; si el total es impar el último usa azul para no repetir vecino. */
function sliceColors(index, total) {
  if (total % 2 === 1 && total > 1 && index === total - 1) return { fill: BLUE, ink: '#FFFFFF' };
  return index % 2 === 0 ? { fill: LIME, ink: NAVY } : { fill: NAVY, ink: '#FFFFFF' };
}

/**
 * Ruleta del celular del cliente (campaña por correo). Cada premio se muestra con su ícono de viaje
 * (configurable en Admin > CORREO); si un premio no tiene ícono, se dibuja su nombre en texto.
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
    const colors = sliceColors(index, prizes.length);
    const Icon = getPrizeIcon(prize.icon);

    // --- Con ícono: grande, centrado en el gajo ---
    if (Icon) {
      const iconR = RADIUS * 0.64;
      const chord = 2 * iconR * Math.sin(((sliceAngle / 2) * Math.PI) / 180);
      const iconSize = Math.max(44, Math.min(130, chord * 0.62));
      return {
        ...prize, index, pathData, midAngle, colors, Icon, iconSize,
        textX: CENTER + iconR * Math.cos(midRad),
        textY: CENTER + iconR * Math.sin(midRad)
      };
    }

    // --- Sin ícono: texto en 1 a 3 líneas, la partición que permita la letra más grande ---
    // Orbitron 900 ocupa ~0.78em por carácter; las líneas van tangenciales, apiladas hacia el centro.
    const words = prize.name.trim().toUpperCase().split(/\s+/).filter(Boolean);
    const CHAR_W = 0.78;
    const LINE_H = 1.15;
    const MAX_FONT = 34;
    const EDGE_MARGIN = 26;
    let best = { fontSize: 0, textLines: [words.join(' ')], centerR: textRadius };

    for (let n = 1; n <= Math.min(3, words.length); n++) {
      splitsInto(words, n).forEach((lines) => {
        const maxLen = Math.max(...lines.map((l) => l.length), 1);
        let f = MAX_FONT;
        let centerR = textRadius;
        for (let k = 0; k < 4; k++) {
          centerR = Math.min(RADIUS * 0.8, RADIUS - EDGE_MARGIN - ((n - 1) / 2 + 0.5) * LINE_H * f);
          const innerR = centerR - ((n - 1) / 2) * LINE_H * f;
          const chordN = 2 * innerR * Math.sin(((sliceAngle / 2) * Math.PI) / 180) - 18;
          f = Math.min(MAX_FONT, Math.floor(chordN / (maxLen * CHAR_W)));
        }
        if (f > best.fontSize) best = { fontSize: f, textLines: lines, centerR };
      });
    }

    return {
      ...prize, index, pathData, midAngle, colors,
      textX: CENTER + best.centerR * Math.cos(midRad),
      textY: CENTER + best.centerR * Math.sin(midRad),
      textLines: best.textLines,
      fontSize: Math.max(12, best.fontSize),
      firstDy: -((best.textLines.length - 1) / 2) * LINE_H,
      lineH: LINE_H
    };
  }), [prizes, sliceAngle, textRadius]);

  return (
    <div className="relative w-full max-w-[380px] mx-auto select-none overflow-hidden pt-7">
      {/* Pin rojo (indicador) */}
      <div className="absolute left-1/2 top-1 -translate-x-1/2 z-30 drop-shadow-[0_3px_6px_rgba(0,0,0,0.45)]">
        <svg width="34" height="44" viewBox="0 0 34 44" className={isSpinning ? 'animate-bounce' : ''}>
          <path d="M17 43 C17 43 2 26 2 15 A15 15 0 0 1 32 15 C32 26 17 43 17 43 Z" fill="#E11D2E" stroke="#FFD1D5" strokeWidth="2" />
          <circle cx="17" cy="15" r="6" fill="#FFFFFF" />
        </svg>
      </div>

      <div
        className="relative z-10"
        style={{
          transform: `rotate(${rotationAngle}deg)`,
          transition: `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.99, 0.25, 1.0)`
        }}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-auto">
          {/* Aro exterior oscuro con filo plateado */}
          <circle cx={CENTER} cy={CENTER} r={RADIUS + 14} fill="#161616" />
          <circle cx={CENTER} cy={CENTER} r={RADIUS + 5} fill="none" stroke="#8A8F98" strokeWidth="2" opacity="0.8" />
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill={NAVY} />

          {slices.map((slice) => (
            <g key={slice.id || slice.index}>
              <path d={slice.pathData} fill={slice.colors.fill} stroke="#E5E7EB" strokeWidth="2" />

              {slice.Icon ? (
                // El ícono gira en sentido contrario a la ruleta con la misma curva: siempre se ve derecho
                <g
                  style={{
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    transform: `rotate(${-rotationAngle}deg)`,
                    transition: `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.99, 0.25, 1.0)`
                  }}
                >
                  <slice.Icon
                    x={slice.textX - slice.iconSize / 2}
                    y={slice.textY - slice.iconSize / 2}
                    size={slice.iconSize}
                    color={slice.colors.ink}
                    strokeWidth={1.7}
                  />
                </g>
              ) : (
                <g transform={`rotate(${slice.midAngle + 90}, ${slice.textX}, ${slice.textY})`}>
                  <text
                    x={slice.textX}
                    y={slice.textY}
                    fill={slice.colors.ink}
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
              )}
            </g>
          ))}

          {/* Centro: regalo sobre aro oscuro */}
          <circle cx={CENTER} cy={CENTER} r="84" fill="#161616" />
          <circle cx={CENTER} cy={CENTER} r="72" fill={NAVY} stroke="#E5E7EB" strokeWidth="3.5" />
          <g
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'center',
              transform: `rotate(${-rotationAngle}deg)`,
              transition: `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.99, 0.25, 1.0)`
            }}
          >
            <Gift x={CENTER - 38} y={CENTER - 38} size={76} color="#FFFFFF" strokeWidth={1.7} />
          </g>
        </svg>
      </div>
    </div>
  );
}

export const MAIL_SPIN_MS = SPIN_MS;
