import React from 'react';
import { Plane, Compass, Sparkles, Award } from 'lucide-react';

export default function AttractBanner() {
  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Barra superior con marca Marketing VIP en #9AC31C */}
      <div className="w-full flex items-center justify-between px-8 py-3 bg-zinc-950/85 border-b border-zinc-800 backdrop-blur-md">
        {/* Logo Oficial Marketing VIP y Slogan */}
        <div className="flex items-center gap-4">
          <img
            src="/logotipo.png"
            alt="Marketing VIP - Especialistas en sueños"
            className="h-14 md:h-18 w-auto object-contain drop-shadow-[0_0_20px_rgba(154,195,28,0.45)]"
          />
          <div className="hidden sm:flex flex-col">
            <span className="font-racing font-black text-xl md:text-2xl tracking-wider text-white">
              MARKETING <span className="text-[#9AC31C] text-glow-brand">VIP</span>
            </span>
            <p className="text-xs text-[#9AC31C] tracking-widest font-sans uppercase -mt-0.5 flex items-center gap-1 font-bold">
              <Sparkles className="w-3 h-3 text-[#9AC31C]" /> Especialistas en sueños
            </p>
          </div>
        </div>

        {/* Badge de la Feria del Automóvil */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 px-4 py-1.5 rounded-full border border-[#9AC31C]/40 shadow-[0_0_10px_rgba(154,195,28,0.2)]">
            <Award className="w-4 h-4 text-[#9AC31C]" />
            <span className="font-racing text-xs font-bold text-zinc-200 uppercase tracking-widest">
              Gran Premio Autos 2026
            </span>
          </div>
          <div className="flex items-center gap-2 bg-[#9AC31C]/15 px-3 py-1.5 rounded-full border border-[#9AC31C]/40 text-[#9AC31C] text-xs font-semibold">
            <Plane className="w-3.5 h-3.5" />
            <span>Paquetes • Vuelos • Hoteles</span>
          </div>
        </div>
      </div>

      {/* Franja Ticker de Destinos con fondo #9AC31C / grafito */}
      <div className="w-full bg-gradient-to-r from-zinc-900 via-[#84A816] to-zinc-900 py-1 px-4 text-center text-xs font-racing font-bold tracking-widest uppercase text-white shadow-md">
        <span>🏎️ Gira la Ruleta • Gana Vuelos y Estadías • Cancún • Punta Cana • Europa • Orlando • Cruceros VIP ✈️</span>
      </div>
    </div>
  );
}
