import React from 'react';
import { Clock, Hourglass, Sparkles, Flag, ArrowUpRight } from 'lucide-react';

export default function QueueWaitingProgress({ queuePosition = 1, leadName = '' }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center my-6 select-none animate-fadeIn">
      {/* Icono de Parrilla de Salida / Semáforo de F1 */}
      <div className="relative mb-5">
        <div className="w-28 h-28 rounded-full border-4 border-dashed border-[#9AC31C]/60 animate-spin flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-zinc-900 to-zinc-800 border-2 border-[#9AC31C] flex flex-col items-center justify-center shadow-[0_0_25px_rgba(154,195,28,0.5)]">
            <span className="font-racing text-[10px] text-zinc-400 uppercase tracking-tighter">TURNO</span>
            <span className="font-racing font-black text-3xl text-[#9AC31C] leading-none drop-shadow-[0_0_8px_rgba(154,195,28,0.8)]">
              #{queuePosition}
            </span>
          </div>
        </div>
        <Flag className="w-6 h-6 text-[#9AC31C] absolute -top-1 right-2 animate-bounce" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#9AC31C]/10 border border-[#9AC31C]/40 mb-2">
        <span className="w-2 h-2 rounded-full bg-[#9AC31C] animate-ping" />
        <span className="font-racing text-[11px] text-[#9AC31C] font-bold tracking-widest uppercase">
          EN FILA DE SALIDA • POLE POSITION
        </span>
      </div>

      <h3 className="text-2xl font-racing font-black text-white tracking-wide uppercase drop-shadow">
        ¡PREPÁRATE EN BOXES!
      </h3>

      <div className="mt-2 p-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl max-w-xs shadow-lg">
        <p className="text-xs text-zinc-300 font-sans leading-relaxed">
          Un piloto está acelerando en la pista en este momento.
        </p>
        <p className="text-xs text-[#9AC31C] font-bold mt-1.5 flex items-center justify-center gap-1">
          <Hourglass className="w-3.5 h-3.5 animate-spin" />
          Tu tiro arrancará automáticamente en la pantalla gigante.
        </p>
      </div>

      {/* Barra de progreso de espera */}
      <div className="w-64 h-2.5 bg-zinc-900 rounded-full mt-5 overflow-hidden border border-zinc-700 p-0.5">
        <div className="h-full bg-gradient-to-r from-zinc-700 via-[#9AC31C] to-emerald-400 rounded-full animate-pulse w-full" />
      </div>

      <span className="text-[10px] font-racing text-zinc-400 tracking-widest mt-2 uppercase">
        NO CIERRES ESTA PANTALLA • SINCRONIZACIÓN EN VIVO
      </span>
    </div>
  );
}
