import React from 'react';
import { mobileAudio } from '../utils/mobileSound';
import { Eye, ArrowUp, Sparkles, Tv } from 'lucide-react';

export default function EngineStartButton({ onClick, disabled = false, loading = false, showCallouts = true }) {
  const handleClick = (e) => {
    e.preventDefault();
    if (disabled || loading) return;

    // Vibración háptica táctil silenciosa (sin sonido)
    mobileAudio.triggerHaptics();

    onClick();
  };

  return (
    <div className={`flex flex-col items-center justify-center select-none w-full ${showCallouts ? 'my-6' : 'my-2'}`}>
      {/* 1. LLAMADO DE ATENCIÓN PROMINENTE HACIA LA PANTALLA GIGANTE (ARRIBA DEL BOTÓN) */}
      {showCallouts && (
        <div className={`mb-4 w-full max-w-xs transition-all duration-300 ${
          loading ? 'scale-105' : 'hover:scale-102'
        }`}>
          <div className={`p-3 rounded-2xl border-2 text-center shadow-lg transition-all ${
            loading
              ? 'bg-amber-500 border-amber-600 text-black shadow-amber-500/40 animate-pulse'
              : 'bg-zinc-900 border-[#9AC31C] text-white shadow-[0_0_20px_rgba(154,195,28,0.35)]'
          }`}>
            <div className="flex items-center justify-center gap-1.5 font-racing font-black text-sm tracking-wider uppercase">
              <Tv className={`w-4 h-4 ${loading ? 'animate-bounce text-black' : 'text-[#9AC31C]'}`} />
              <span>{loading ? '¡MIRA LA PANTALLA AHORA!' : '¡MIRA LA PANTALLA GIGANTE!'}</span>
              <Eye className={`w-4 h-4 ${loading ? 'animate-bounce text-black' : 'text-[#9AC31C]'}`} />
            </div>
            <p className={`text-[11px] font-semibold mt-0.5 flex items-center justify-center gap-1 ${
              loading ? 'text-black' : 'text-zinc-300'
            }`}>
              <ArrowUp className="w-3.5 h-3.5 animate-bounce shrink-0" />
              <span>
                {loading
                  ? '¡Tu ruleta está girando en vivo en el stand!'
                  : 'Al presionar el botón, levanta la mirada hacia la pantalla'}
              </span>
              <ArrowUp className="w-3.5 h-3.5 animate-bounce shrink-0" />
            </p>
          </div>
        </div>
      )}

      {/* 2. BOTÓN CIRCULAR SUPERCAR START/STOP */}
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
                {loading ? 'EN PISTA' : 'ENGINE'}
              </span>
              <span className="font-racing font-black text-sm tracking-wider text-amber-300 uppercase drop-shadow -mt-0.5">
                {loading ? 'GIRANDO' : 'START'}
              </span>
              <span className="text-[9px] font-sans font-bold text-zinc-300 tracking-tighter uppercase mt-0.5">
                {loading ? 'MIRA ARRIBA' : 'STOP'}
              </span>
            </div>
          </div>
        </div>

        {/* Pulsaciones de ondas de luz cuando está listo para presionar */}
        {!disabled && !loading && (
          <span className="absolute -inset-2 rounded-full border-2 border-red-500/50 animate-ping pointer-events-none" />
        )}
      </button>

      {/* 3. MENSAJE ENFATIZADO BAJO EL BOTÓN */}
      {showCallouts && (
        <div className="mt-4 text-center">
          <p className={`text-xs font-racing font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 ${
            loading ? 'text-amber-600 animate-pulse font-black' : 'text-zinc-700'
          }`}>
            <ArrowUp className={`w-4 h-4 ${loading ? 'text-amber-600' : 'text-red-600'} animate-bounce`} />
            <span>
              {loading
                ? '¡GIRANDO EN LA GRAN PANTALLA!'
                : 'PRESIONA Y MIRA LA PANTALLA GIGANTE'}
            </span>
            <ArrowUp className={`w-4 h-4 ${loading ? 'text-amber-600' : 'text-red-600'} animate-bounce`} />
          </p>
          <span className="text-[11px] text-zinc-500 block mt-0.5 font-medium">
            El resultado oficial se revelará en la pantalla del stand
          </span>
        </div>
      )}
    </div>
  );
}
