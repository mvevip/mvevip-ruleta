import React, { useEffect, useState, useMemo } from 'react';

/**
 * Odómetro / Velocímetro réplica exacta de la imagen del tacómetro automotriz
 * - Carátula negra con bisel metálico circular
 * - Escala estática 0 - 200 km/h
 * - Aguja indicadora roja deportiva que se mueve dinámicamente
 * - Las letras y números se iluminan con el color corporativo #9AC31C conforme sube la aguja
 * - Display LCD digital en la parte inferior con odómetro activo
 */
export default function Tachometer({ isSpinning = false }) {
  const [speed, setSpeed] = useState(0);

  useEffect(() => {
    let interval;
    if (isSpinning) {
      const startTime = Date.now();
      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed < 3.2) {
          // Aceleración a fondo hacia 180 - 195 km/h
          const target = Math.min(195, Math.floor(elapsed * 62 + Math.random() * 8));
          setSpeed(target);
        } else if (elapsed < 6.0) {
          // Desaceleración y frenado
          const decay = (6.0 - elapsed) / 2.8;
          const target = Math.max(0, Math.floor(decay * 195));
          setSpeed(target);
        } else {
          setSpeed(0);
          clearInterval(interval);
        }
      }, 40);
    } else {
      setSpeed(0);
    }

    return () => clearInterval(interval);
  }, [isSpinning]);

  const cx = 200;
  const cy = 200;
  const rTicks = 158;
  const rNumbers = 118;

  // Los 11 puntos principales de velocidad: 0 a 200 en pasos de 20
  const majorSpeeds = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200];

  // Cálculo de ángulo: -130° (a 0 km/h) hasta +130° (a 200 km/h)
  const getAngle = (v) => -130 + (v / 200) * 260;

  // Aguja: ángulo actual
  const needleAngle = getAngle(speed);

  // Generar marcas intermedias (cada 5 km/h) y mayores (cada 20 km/h)
  const ticks = useMemo(() => {
    const list = [];
    for (let v = 0; v <= 200; v += 5) {
      const isMajor = v % 20 === 0;
      const angle = getAngle(v);
      const rad = (angle * Math.PI) / 180;

      // Dirección radial desde el centro
      const sinA = Math.sin(rad);
      const cosA = Math.cos(rad);

      const rOuter = rTicks;
      const rInner = isMajor ? rTicks - 18 : rTicks - 9;

      const x1 = cx + rOuter * sinA;
      const y1 = cy - rOuter * cosA;
      const x2 = cx + rInner * sinA;
      const y2 = cy - rInner * cosA;

      list.push({
        v,
        isMajor,
        angle,
        x1,
        y1,
        x2,
        y2,
        sinA,
        cosA
      });
    }
    return list;
  }, []);

  // Coordenadas de los números 0 a 200
  const numbers = useMemo(() => {
    return majorSpeeds.map((v) => {
      const angle = getAngle(v);
      const rad = (angle * Math.PI) / 180;
      const x = cx + rNumbers * Math.sin(rad);
      const y = cy - rNumbers * Math.cos(rad);
      return {
        v,
        x,
        y,
        angle
      };
    });
  }, []);

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Contenedor del reloj con sombra y bisel */}
      <div className="relative w-80 h-80 rounded-full p-2 bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950 shadow-[0_10px_35px_rgba(0,0,0,0.9)] border-4 border-zinc-600/80 flex items-center justify-center">
        
        {/* Aro interior biselado */}
        <div className="w-full h-full rounded-full bg-black border-2 border-zinc-800 relative flex items-center justify-center overflow-hidden shadow-inner">
          
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <defs>
              {/* Filtro de resplandor para el color corporativo #9AC31C */}
              <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="needleGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#DC2626" />
                <stop offset="70%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#F87171" />
              </linearGradient>
            </defs>

            {/* 1. Marcas Ticks del Odómetro */}
            {ticks.map((t) => {
              const isPassed = speed >= t.v;
              return (
                <g key={t.v}>
                  {t.isMajor ? (
                    // Marca mayor tipo cuña/cono idéntica a la imagen
                    <polygon
                      points={`
                        ${t.x1 - 3.5 * t.cosA},${t.y1 - 3.5 * t.sinA}
                        ${t.x1 + 3.5 * t.cosA},${t.y1 + 3.5 * t.sinA}
                        ${t.x2},${t.y2}
                      `}
                      fill={isPassed ? "#9AC31C" : "#FFFFFF"}
                      filter={isPassed ? "url(#glowGreen)" : undefined}
                      className="transition-colors duration-100"
                    />
                  ) : (
                    // Marca menor recta
                    <line
                      x1={t.x1}
                      y1={t.y1}
                      x2={t.x2}
                      y2={t.y2}
                      stroke={isPassed ? "#9AC31C" : "#9CA3AF"}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="transition-colors duration-100"
                    />
                  )}
                </g>
              );
            })}

            {/* 2. Números de Velocidad (0, 20, 40 ... 200) */}
            {/* Se ponen del color corporativo #9AC31C conforme sube la aguja */}
            {numbers.map((n) => {
              const isPassed = speed >= n.v;
              return (
                <text
                  key={n.v}
                  x={n.x}
                  y={n.y + 7}
                  fill={isPassed ? "#9AC31C" : "#FFFFFF"}
                  fontSize="24"
                  fontWeight="900"
                  fontFamily="'Montserrat', 'Orbitron', sans-serif"
                  textAnchor="middle"
                  filter={isPassed ? "url(#glowGreen)" : undefined}
                  className="transition-all duration-150 select-none tracking-tighter"
                >
                  {n.v}
                </text>
              );
            })}

            {/* 3. Etiqueta central "km/h" */}
            <text
              x={cx}
              y={cy - 48}
              fill={speed > 30 ? "#9AC31C" : "#FFFFFF"}
              fontSize="22"
              fontWeight="900"
              fontFamily="'Montserrat', sans-serif"
              textAnchor="middle"
              filter={speed > 30 ? "url(#glowGreen)" : undefined}
              className="tracking-wider transition-colors duration-200"
            >
              km/h
            </text>

            {/* 4. Display LCD Digital Inferior (Réplica exacta de la pantalla TRIP / COG) */}
            <g transform="translate(120, 240)">
              {/* Marco LCD */}
              <rect
                x="0"
                y="0"
                width="160"
                height="56"
                rx="4"
                fill="#18181B"
                stroke="#3F3F46"
                strokeWidth="1.5"
              />
              {/* Fondo digital gris tenue */}
              <rect
                x="2"
                y="2"
                width="156"
                height="52"
                rx="3"
                fill="#09090B"
              />

              {/* Fila superior: TRIP COG y lectura */}
              <text x="8" y="14" fill="#71717A" fontSize="8" fontWeight="800" fontFamily="sans-serif">
                TRIP
              </text>
              <text x="8" y="22" fill="#71717A" fontSize="7" fontWeight="800" fontFamily="sans-serif">
                COG
              </text>
              <text
                x="152"
                y="19"
                fill={speed > 0 ? "#9AC31C" : "#E4E4E7"}
                fontSize="15"
                fontWeight="900"
                fontFamily="monospace"
                textAnchor="end"
                className="transition-colors duration-100"
              >
                {speed.toFixed(1)}
              </text>

              {/* Fila inferior: ODO TOTAL y unidades */}
              <text
                x="152"
                y="38"
                fill={speed > 0 ? "#9AC31C" : "#A1A1AA"}
                fontSize="16"
                fontWeight="900"
                fontFamily="monospace"
                textAnchor="end"
                className="tracking-wider transition-colors duration-100"
              >
                {(12450 + speed * 1.5).toFixed(1)}
              </text>
              <text x="8" y="49" fill="#71717A" fontSize="7" fontWeight="700" fontFamily="sans-serif">
                Km Miles NM H
              </text>
            </g>

            {/* 5. Aguja Indicadora Roja Deportiva */}
            <g transform={`rotate(${needleAngle}, ${cx}, ${cy})`}>
              {/* Sombra de la aguja */}
              <line
                x1={cx}
                y1={cy}
                x2={cx}
                y2={cy - 128}
                stroke="rgba(0,0,0,0.6)"
                strokeWidth="6"
                strokeLinecap="round"
                transform="translate(2, 4)"
              />
              {/* Cuerpo cónico de la aguja */}
              <polygon
                points={`
                  ${cx - 4.5},${cy + 15}
                  ${cx + 4.5},${cy + 15}
                  ${cx + 1},${cy - 130}
                  ${cx - 1},${cy - 130}
                `}
                fill="url(#needleGrad)"
                filter="drop-shadow(0 0 6px rgba(239,68,68,0.8))"
              />
            </g>

            {/* 6. Centro / Tapa Negra de la Aguja */}
            <circle
              cx={cx}
              cy={cy}
              r="22"
              fill="#18181B"
              stroke="#27272A"
              strokeWidth="3"
              filter="drop-shadow(0 3px 6px rgba(0,0,0,0.9))"
            />
            <circle
              cx={cx}
              cy={cy}
              r="12"
              fill="#09090B"
            />
          </svg>
        </div>
      </div>

      {/* Indicador de Estado Bajo el Odómetro */}
      <div className="mt-3 flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 px-4 py-1.5 rounded-full text-xs font-racing shadow-lg">
        <span className={`w-2.5 h-2.5 rounded-full ${isSpinning ? 'bg-[#9AC31C] animate-ping' : 'bg-zinc-600'}`} />
        <span className="text-zinc-400">TELEMETRÍA:</span>
        <span className={`font-bold ${isSpinning ? 'text-[#9AC31C]' : 'text-zinc-300'}`}>
          {isSpinning ? 'EN PISTA • ACELERANDO' : 'EN STAND • LISTO'}
        </span>
      </div>
    </div>
  );
}
