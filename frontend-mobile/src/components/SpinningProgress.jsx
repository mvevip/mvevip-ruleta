import React from 'react';
import { Gauge, Sparkles, Flame } from 'lucide-react';

export default function SpinningProgress() {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center my-8">
      {/* Icono de Velocímetro Giratorio */}
      <div className="relative mb-6">
        <div className="w-28 h-28 rounded-full border-4 border-dashed border-red-500 animate-spin flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.8)]">
            <Gauge className="w-10 h-10 text-white animate-pulse" />
          </div>
        </div>
        <Flame className="w-6 h-6 text-amber-400 absolute -top-2 right-2 animate-bounce" />
      </div>

      <span className="font-racing text-xs text-red-500 font-black tracking-widest uppercase mb-1">
        TELEMETRÍA EN VIVO • STAND FERIA
      </span>
      <h3 className="text-2xl font-racing font-black text-white tracking-wide uppercase text-glow-gold">
        ¡ACELERANDO A FONDO!
      </h3>
      <p className="text-sm text-amber-300 font-semibold mt-2 max-w-xs">
        👀 ¡Mira la <strong className="underline decoration-amber-400">Pantalla Gigante</strong> para descubrir tu premio!
      </p>

      {/* Barra de Turbo Boost */}
      <div className="w-64 h-3 bg-zinc-900 rounded-full mt-6 overflow-hidden border border-zinc-700 p-0.5">
        <div className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-cyan-400 rounded-full animate-pulse w-full" />
      </div>
      <span className="text-[10px] font-racing text-zinc-400 tracking-widest mt-2 uppercase">
        MODO SPORT+ ACTIVADO
      </span>
    </div>
  );
}
