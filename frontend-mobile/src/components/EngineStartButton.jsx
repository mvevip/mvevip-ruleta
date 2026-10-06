import React from 'react';
import { mobileAudio } from '../utils/mobileSound';
import { Flame } from 'lucide-react';

export default function EngineStartButton({ onClick, disabled = false, loading = false }) {
  const handleClick = (e) => {
    e.preventDefault();
    if (disabled || loading) return;

    // Vibración háptica táctil silenciosa (sin sonido)
    mobileAudio.triggerHaptics();

    onClick();
  };

  return (
    <div className="flex flex-col items-center justify-center my-6 select-none">
      {/* Botón Circular Supercar Start/Stop en ROJO */}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        className={`relative w-44 h-44 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer select-none focus:outline-none ${
          disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-105'
        }`}
      >
        {/* Anillo Exterior Cromado con Textura Metálica */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-zinc-500 via-zinc-200 to-zinc-600 p-2.5 shadow-2xl">
          {/* Anillo interior oscuro */}
          <div className="w-full h-full rounded-full bg-zinc-950 p-2 shadow-inner flex items-center justify-center">
            {/* Botón Rojo Deportivo Central con Textura y Resplandor */}
            <div
              className={`w-full h-full rounded-full flex flex-col items-center justify-center text-center p-2 border-2 border-red-400 shadow-2xl transition-all ${
                loading
                  ? 'bg-amber-600 animate-pulse'
                  : 'bg-gradient-to-b from-red-600 via-red-700 to-red-900 glow-red'
              }`}
            >
              {/* LED Indicador */}
              <div className="w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_8px_#fde047] mb-1 animate-pulse" />

              {/* Texto Engine Start */}
              <span className="font-racing font-black text-xs tracking-widest text-white uppercase drop-shadow leading-tight">
                {loading ? 'ACELERANDO' : 'ENGINE'}
              </span>
              <span className="font-racing font-black text-sm tracking-wider text-amber-300 uppercase drop-shadow -mt-0.5">
                {loading ? '...' : 'START'}
              </span>
              <span className="text-[9px] font-sans font-bold text-zinc-300 tracking-tighter uppercase mt-0.5">
                STOP
              </span>
            </div>
          </div>
        </div>

        {/* Pulsaciones de ondas de luz cuando está listo para presionar */}
        {!disabled && !loading && (
          <span className="absolute -inset-2 rounded-full border-2 border-red-500/50 animate-ping pointer-events-none" />
        )}
      </button>

      {/* Instrucción bajo el botón */}
      <p className="text-xs font-racing font-bold text-zinc-400 tracking-widest uppercase mt-4 flex items-center gap-1.5">
        <Flame className="w-4 h-4 text-red-500 animate-bounce" />
        {loading ? '¡RUEDA GIRANDO EN PANTALLA!' : 'PRESIONA PARA GIRAR LA RULETA'}
      </p>
    </div>
  );
}
