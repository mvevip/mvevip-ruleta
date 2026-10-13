import React from 'react';
import { Clock, Hourglass, Sparkles, Flag, Tv, ArrowUp } from 'lucide-react';

export default function QueueWaitingProgress({ queuePosition = 1, leadName = '' }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center my-6 select-none animate-fadeIn">
      {/* Icono de Parrilla de Salida / Semáforo de F1 */}
      <div className="relative mb-5">
        <div className="w-28 h-28 rounded-full border-4 border-dashed border-[#9AC31C] animate-spin flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-white to-zinc-100 border-2 border-[#9AC31C] flex flex-col items-center justify-center shadow-lg">
            <span className="font-racing text-[10px] text-zinc-500 uppercase tracking-tighter">TURNO</span>
            <span className="font-racing font-black text-3xl text-zinc-900 leading-none drop-shadow-sm">
              #{queuePosition}
            </span>
          </div>
        </div>
        <Flag className="w-6 h-6 text-[#7A9E14] absolute -top-1 right-2 animate-bounce" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#9AC31C]/15 border border-[#9AC31C]/60 mb-2 shadow-xs">
        <span className="w-2 h-2 rounded-full bg-[#7A9E14] animate-ping" />
        <span className="font-racing text-[11px] text-zinc-900 font-bold tracking-widest uppercase">
          EN FILA DE SALIDA • POLE POSITION
        </span>
      </div>

      <h3 className="text-2xl font-racing font-black text-zinc-900 tracking-wide uppercase drop-shadow-sm">
        ¡PREPÁRATE EN BOXES!
      </h3>

      <div className="mt-3 p-4 bg-white border border-zinc-200 rounded-2xl max-w-xs shadow-md">
        <p className="text-xs text-zinc-600 font-sans leading-relaxed">
          Un piloto está acelerando en la pista en este momento.
        </p>
        <p className="text-xs text-zinc-900 font-bold mt-2 flex items-center justify-center gap-1">
          <Hourglass className="w-3.5 h-3.5 text-[#7A9E14] animate-spin" />
          Tu tiro arrancará automáticamente.
        </p>
        <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 py-1 px-2 rounded-lg">
          <Tv className="w-3.5 h-3.5 text-amber-600" />
          <span>¡MIRA LA PANTALLA GIGANTE!</span>
          <ArrowUp className="w-3 h-3 text-amber-600 animate-bounce" />
        </div>
      </div>

      {/* Barra de progreso de espera */}
      <div className="w-64 h-2.5 bg-zinc-200 rounded-full mt-5 overflow-hidden border border-zinc-300 p-0.5 shadow-inner">
        <div className="h-full bg-gradient-to-r from-zinc-400 via-[#9AC31C] to-emerald-500 rounded-full animate-pulse w-full" />
      </div>

      <span className="text-[10px] font-racing text-zinc-500 tracking-widest mt-2 uppercase font-medium">
        NO CIERRES ESTA PANTALLA • SINCRONIZACIÓN EN VIVO
      </span>
    </div>
  );
}
