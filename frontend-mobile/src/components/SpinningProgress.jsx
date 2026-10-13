import React from 'react';
import { Gauge, Sparkles, Flame, Tv, ArrowUp } from 'lucide-react';

export default function SpinningProgress() {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center my-6 select-none animate-fadeIn">
      {/* Icono de Velocímetro Giratorio */}
      <div className="relative mb-5">
        <div className="w-28 h-28 rounded-full border-4 border-dashed border-red-500 animate-spin flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)]">
            <Gauge className="w-10 h-10 text-white animate-pulse" />
          </div>
        </div>
        <Flame className="w-6 h-6 text-amber-500 absolute -top-2 right-2 animate-bounce" />
      </div>

      <span className="font-racing text-xs text-red-600 font-black tracking-widest uppercase mb-1">
        TELEMETRÍA EN VIVO • STAND FERIA
      </span>
      <h3 className="text-2xl font-racing font-black text-zinc-900 tracking-wide uppercase">
        ¡ACELERANDO A FONDO!
      </h3>

      {/* Banner llamativo para levantar la vista hacia la pantalla gigante */}
      <div className="mt-3 p-4 bg-amber-500 border-2 border-amber-600 text-black rounded-2xl max-w-xs shadow-lg animate-pulse">
        <div className="flex items-center justify-center gap-1.5 font-racing font-black text-sm uppercase">
          <Tv className="w-4 h-4 text-black animate-bounce" />
          <span>¡MIRA LA PANTALLA GIGANTE!</span>
          <ArrowUp className="w-4 h-4 text-black animate-bounce" />
        </div>
        <p className="text-xs font-bold mt-1 text-zinc-900 leading-snug">
          Tu rueda está girando en este instante frente al stand. ¡Levanta la mirada!
        </p>
      </div>

      {/* Barra de Turbo Boost */}
      <div className="w-64 h-3 bg-zinc-200 rounded-full mt-6 overflow-hidden border border-zinc-300 p-0.5 shadow-inner">
        <div className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-[#9AC31C] rounded-full animate-pulse w-full" />
      </div>
      <span className="text-[10px] font-racing text-zinc-500 tracking-widest mt-2 uppercase font-semibold">
        MODO SPORT+ ACTIVADO
      </span>
    </div>
  );
}
