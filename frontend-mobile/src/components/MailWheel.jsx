import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getPrizeIcon } from '../utils/prizeIcons';
import { mobileAudio } from '../utils/mobileSound';

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
const MAX_SIDE = 380; // diámetro máximo de la ruleta en pantalla (px)
const PIN_ROOM = 24; // espacio superior para el pin rojo (px)

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
export default function MailWheel({ prizes = [], rotationAngle = 0, isSpinning = false, onStart, disabled = false }) {
  // La ruleta se ajusta al espacio disponible (ancho y alto) para que toda la pantalla quepa sin scroll
  const areaRef = useRef(null);
  const [side, setSide] = useState(0);
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return undefined;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSide(Math.max(0, Math.floor(Math.min(r.width, r.height - PIN_ROOM, MAX_SIDE))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      // Más hacia el borde y algo más pequeños: el centro lo ocupa el botón JUGAR Y GANAR
      const iconR = RADIUS * 0.68;
      const chord = 2 * iconR * Math.sin(((sliceAngle / 2) * Math.PI) / 180);
      const iconSize = Math.max(40, Math.min(120, chord * 0.55));
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
    <div ref={areaRef} className="relative w-full h-full flex items-center justify-center select-none overflow-hidden">
      {side > 0 && (
        <div className="relative" style={{ width: side, height: side + PIN_ROOM }}>
          {/* Pin rojo (indicador) */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 z-30 drop-shadow-[0_3px_6px_rgba(0,0,0,0.45)]">
            <svg width="30" height="40" viewBox="0 0 34 44" className={isSpinning ? 'animate-bounce' : ''}>
              <path d="M17 43 C17 43 2 26 2 15 A15 15 0 0 1 32 15 C32 26 17 43 17 43 Z" fill="#E11D2E" stroke="#FFD1D5" strokeWidth="2" />
              <circle cx="17" cy="15" r="6" fill="#FFFFFF" />
            </svg>
          </div>

          <div className="absolute left-0 right-0 bottom-0" style={{ height: side }}>
            <div
              className="absolute inset-0 z-10"
              style={{
                transform: `rotate(${rotationAngle}deg)`,
                transition: `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.99, 0.25, 1.0)`
              }}
            >
              <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full">
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
              </svg>
            </div>

            {/* Botón JUGAR Y GANAR en el centro de la ruleta (no gira con ella) */}
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <CenterButton size={Math.round(side * 0.36)} onClick={onStart} disabled={disabled} loading={isSpinning} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Botón rojo metálico del centro: anillos pulsantes mientras espera el toque; ámbar "GIRANDO" durante el giro. */
function CenterButton({ size, onClick, disabled, loading }) {
  const inactive = disabled || loading;
  const handleClick = (e) => {
    e.preventDefault();
    if (inactive || !onClick) return;
    mobileAudio.triggerHaptics();
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={inactive}
      aria-label="Jugar y ganar"
      className={`pointer-events-auto relative rounded-full select-none focus:outline-none transition-transform ${
        inactive ? (loading ? '' : 'opacity-60') : 'active:scale-95'
      }`}
      style={{ width: size, height: size }}
    >
      {!inactive && (
        <>
          <span className="absolute -inset-[7%] rounded-full border-2 border-red-500/70 animate-ping pointer-events-none" />
          <span
            className="absolute -inset-[7%] rounded-full border-2 border-red-400/50 animate-ping pointer-events-none"
            style={{ animationDelay: '0.7s' }}
          />
        </>
      )}
      <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-zinc-500 via-zinc-200 to-zinc-600 p-[5%] shadow-2xl">
        <span className="block w-full h-full rounded-full bg-zinc-950 p-[4%] shadow-inner">
          <span
            className={`w-full h-full rounded-full flex flex-col items-center justify-center text-center border-2 shadow-2xl ${
              loading
                ? 'bg-amber-600 border-amber-300 animate-pulse'
                : 'bg-gradient-to-b from-red-600 via-red-700 to-red-900 border-red-400 glow-red'
            }`}
          >
            <span
              className="w-[9%] aspect-square rounded-full bg-amber-300 shadow-[0_0_8px_#fde047] animate-pulse mb-[3%]"
              style={{ minWidth: 5 }}
            />
            <span className="font-sans font-black text-white uppercase leading-none drop-shadow" style={{ fontSize: size * 0.115 }}>
              {loading ? 'GIRANDO' : 'JUGAR'}
            </span>
            <span className="font-sans font-black text-amber-300 uppercase leading-none drop-shadow mt-[4%]" style={{ fontSize: size * (loading ? 0.15 : 0.125) }}>
              {loading ? '...' : 'Y GANAR'}
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}

export const MAIL_SPIN_MS = SPIN_MS;
