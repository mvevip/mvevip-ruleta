import React from 'react';
import { Sparkles, Award } from 'lucide-react';

export default function Header() {
  return (
    <header className="w-full bg-zinc-950/90 border-b border-zinc-800 py-3 px-4 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md select-none">
      <div className="flex items-center gap-2.5">
        <img
          src="/logotipo.png"
          alt="Marketing VIP"
          className="h-10 w-auto object-contain drop-shadow-[0_0_10px_rgba(154,195,28,0.5)]"
        />
        <div className="flex flex-col">
          <span className="font-racing font-black text-sm tracking-wider text-white leading-tight">
            MARKETING <span className="text-[#9AC31C]">VIP</span>
          </span>
          <span className="text-[9px] text-[#9AC31C] uppercase font-sans tracking-wider flex items-center gap-1 font-bold">
            <Sparkles className="w-2.5 h-2.5 text-[#9AC31C]" /> Especialistas en sueños
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 bg-zinc-900 border border-[#9AC31C]/40 px-2.5 py-1 rounded-full text-[11px] font-racing text-[#9AC31C] font-bold uppercase tracking-wider shadow">
        <Award className="w-3.5 h-3.5 text-[#9AC31C]" />
        <span>Feria Autos</span>
      </div>
    </header>
  );
}
