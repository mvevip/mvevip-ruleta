import React, { useMemo } from 'react';

// Función para dividir títulos largos en 1 o 2 líneas para que quepan perfectamente en el gajo
function splitTextForSlice(name = '') {
  const clean = name.trim().toUpperCase();
  const words = clean.split(' ');

  if (words.length <= 1 || clean.length <= 10) {
    return [clean];
  }

  // Si son 2 palabras
  if (words.length === 2) {
    return [words[0], words[1]];
  }

  // Si son 3 o más palabras, balancear en dos líneas
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(' ');
  const line2 = words.slice(mid).join(' ');
  return [line1, line2];
}

/**
 * Componente de la Ruleta estilizada como Rin Deportivo de Alta Gama
 * Con acentos corporativos #9AC31C y textos multilínea adaptativos
 */
export default function AlloyWheel({ prizes = [], rotationAngle = 0, isSpinning = false, isTestMode = false }) {
  const totalSlices = prizes.length || 8;
  const sliceAngle = 360 / totalSlices;

  const size = 680;
  const center = size / 2;
  const radius = center - 30; // 310px

  const slices = useMemo(() => {
    return prizes.map((prize, index) => {
      const startAngle = index * sliceAngle - 90;
      const endAngle = startAngle + sliceAngle;
      
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const largeArc = sliceAngle > 180 ? 1 : 0;
      const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      // Posición del texto: centrado a 65% del radio para espacio óptimo
      const midAngle = startAngle + sliceAngle / 2;
      const midRad = (midAngle * Math.PI) / 180;
      const textRadius = radius * 0.65;
      const textX = center + textRadius * Math.cos(midRad);
      const textY = center + textRadius * Math.sin(midRad);

      const textLines = splitTextForSlice(prize.name);

      return {
        ...prize,
        index,
        pathData,
        textX,
        textY,
        midAngle,
        textLines
      };
    });
  }, [prizes, sliceAngle, center, radius]);

  return (
    <div className="relative flex items-center justify-center p-4 select-none">
      {/* 1. Disco de Freno Ventilado Trasero con Acentos Corporativos #9AC31C */}
      <div className="absolute w-[690px] h-[690px] rounded-full border-4 border-zinc-700 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black shadow-2xl opacity-95 flex items-center justify-center">
        <div className="w-[660px] h-[660px] rounded-full border-2 border-dashed border-[#9AC31C]/30" />
      </div>

      {/* 2. Indicador Selector Deportivo Rojo */}
      <div className="absolute -top-3 z-30 flex flex-col items-center drop-shadow-[0_4px_15px_rgba(220,38,38,0.9)]">
        <div className="relative bg-gradient-to-b from-red-500 via-red-600 to-red-800 px-4 py-1.5 rounded-full border-2 border-red-400 flex items-center justify-center shadow-lg">
          <span className={`w-3 h-3 rounded-full ${isSpinning ? 'bg-white animate-ping' : 'bg-white shadow-[0_0_8px_#ffffff]'}`} />
        </div>
        <div className="w-0 h-0 border-x-[14px] border-x-transparent border-t-[20px] border-t-red-600 -mt-0.5" />
      </div>

      {/* 3. La Ruleta Giratoria (Rin Deportivo de Aleación) */}
      <div
        className={`relative z-10 ${isTestMode ? '' : 'transition-transform duration-[6000ms]'}`}
        style={isTestMode ? {
          animation: 'spin 1.4s linear infinite'
        } : {
          transform: `rotate(${rotationAngle}deg)`,
          transitionTimingFunction: 'cubic-bezier(0.12, 0.95, 0.2, 1)'
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-2xl">
          <defs>
            <linearGradient id="rimChrome" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9CA3AF" />
              <stop offset="50%" stopColor="#27272A" />
              <stop offset="100%" stopColor="#E5E7EB" />
            </linearGradient>
            <radialGradient id="centerHub" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#9AC31C" />
              <stop offset="65%" stopColor="#84A816" />
              <stop offset="100%" stopColor="#0F172A" />
            </radialGradient>
          </defs>

          {/* Aro Exterior del Rin con Anillo Neón #9AC31C */}
          <circle cx={center} cy={center} r={radius + 8} fill="none" stroke="url(#rimChrome)" strokeWidth="16" />
          <circle cx={center} cy={center} r={radius + 1} fill="none" stroke="#9AC31C" strokeWidth="2" opacity="0.8" />
          <circle cx={center} cy={center} r={radius} fill="#111827" />

          {/* Gajos / Premios de la Ruleta */}
          {slices.map((slice) => (
            <g key={slice.id || slice.index}>
              {/* Sector con color corporativo o de contraste */}
              <path
                d={slice.pathData}
                fill={slice.color_hex || '#9AC31C'}
                stroke="#18181B"
                strokeWidth="2.5"
                className="transition-colors duration-300"
              />
              {/* Radios divisorios cromados */}
              <line
                x1={center}
                y1={center}
                x2={center + radius * Math.cos(((slice.index * sliceAngle - 90) * Math.PI) / 180)}
                y2={center + radius * Math.sin(((slice.index * sliceAngle - 90) * Math.PI) / 180)}
                stroke="#E5E7EB"
                strokeWidth="2.5"
                opacity="0.85"
              />

              {/* Texto del Premio Ajustado al Espacio (Multilínea para no salirse) */}
              <g
                transform={`rotate(${slice.midAngle + 90}, ${slice.textX}, ${slice.textY})`}
              >
                <text
                  x={slice.textX}
                  y={slice.textY}
                  fill={slice.text_color || (slice.color_hex === '#9AC31C' ? '#000000' : '#FFFFFF')}
                  fontSize={slice.textLines.length > 1 ? "12" : "13.5"}
                  fontWeight="900"
                  fontFamily="'Orbitron', sans-serif"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] select-none"
                >
                  {slice.textLines.length === 1 ? (
                    <tspan x={slice.textX} dy="0">
                      {slice.textLines[0]}
                    </tspan>
                  ) : (
                    <>
                      <tspan x={slice.textX} dy="-0.65em">
                        {slice.textLines[0]}
                      </tspan>
                      <tspan x={slice.textX} dy="1.3em">
                        {slice.textLines[1]}
                      </tspan>
                    </>
                  )}
                </text>
              </g>
            </g>
          ))}

          {/* Tornillos perimetrales */}
          {Array.from({ length: 16 }).map((_, i) => {
            const boltAngle = (i * (360 / 16) * Math.PI) / 180;
            const bx = center + (radius - 8) * Math.cos(boltAngle);
            const by = center + (radius - 8) * Math.sin(boltAngle);
            return (
              <circle key={i} cx={bx} cy={by} r="4" fill="#E5E7EB" stroke="#18181B" strokeWidth="1.5" />
            );
          })}

          {/* Centro del Rin con Logo Oficial Marketing VIP */}
          <circle cx={center} cy={center} r="65" fill="#18181B" stroke="url(#rimChrome)" strokeWidth="6" />
          <circle cx={center} cy={center} r="54" fill="#FFFFFF" />
          
          <image
            href="/logotipo.png"
            x={center - 48}
            y={center - 48}
            width="96"
            height="96"
            preserveAspectRatio="xMidYMid meet"
          />
        </svg>
      </div>
    </div>
  );
}
