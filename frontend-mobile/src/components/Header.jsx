import React from 'react';
import { Sparkles, Award } from 'lucide-react';

export default function Header() {
  return (
    <header className="w-full bg-white/95 border-b border-zinc-300 py-3 px-4 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md shadow-sm select-none">
      <div className="flex items-center gap-2.5">
        <img
          src="/logotipo.png"
          alt="Marketing VIP"
          className="h-10 w-auto object-contain drop-shadow-sm"
        />
        <div className="flex flex-col">
          <span className="font-racing font-black text-sm tracking-wider text-zinc-900 leading-tight">
            MARKETING <span className="text-[#9AC31C]">VIP</span>
          </span>
          <span className="text-[9px] text-[#7A9E14] uppercase font-sans tracking-wider flex items-center gap-1 font-bold">
            <Sparkles className="w-2.5 h-2.5 text-[#9AC31C]" /> Especialistas en sueños
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 bg-zinc-100 border border-zinc-300 px-2.5 py-1 rounded-full text-[11px] font-racing text-zinc-800 font-bold uppercase tracking-wider shadow-sm">
        <Award className="w-3.5 h-3.5 text-[#9AC31C]" />
        <span>Feria Autos</span>
      </div>
    </header>
  );
}
