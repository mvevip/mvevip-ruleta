import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Gift, Ticket, MessageCircle, Clock, CheckCircle2, Sparkles, Plane } from 'lucide-react';
import { getMobileBrandConfig } from '../brand';

export default function PrizeVoucher({ result }) {
  const brand = getMobileBrandConfig();

  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: brand.isFord
          ? ['#212650', '#ffffff', '#3b4387', '#93c5fd']
          : ['#9AC31C', '#ef4444', '#ffffff', '#B2DC2B']
      });
    } catch (e) {
      // Ignorar si falla
    }
  }, [brand.isFord]);

  const { winner, lead, ticketCode, whatsappUrl } = result;

  return (
    <div className="w-full flex flex-col items-center my-4 animate-fadeIn select-none">
      {/* Icono de Victoria */}
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-3 ${
        brand.isFord
          ? 'bg-[#212650] text-white'
          : 'bg-gradient-to-tr from-[#84A816] to-[#9AC31C] text-black'
      }`}>
        <Trophy className={`w-9 h-9 ${brand.isFord ? 'text-white' : 'text-black'}`} />
      </div>

      <span className={`font-racing text-xs font-black tracking-widest uppercase ${brand.isFord ? 'text-[#212650]' : 'text-red-600'}`}>
        ¡TIEMPO RÉCORD EN PISTA!
      </span>
      <h2 className="text-2xl font-racing font-black text-zinc-900 uppercase text-center mt-0.5 mb-4">
        ¡PREMIO OBTENIDO!
      </h2>

      {/* Tarjeta Tipo Boarding Pass / Pase VIP */}
      <div className="w-full max-w-sm bg-white border-2 border-[#9AC31C] rounded-3xl p-5 shadow-xl relative overflow-hidden mb-6 text-zinc-900">
        {!brand.isFord && (
          <div className="absolute -right-8 -bottom-8 opacity-5 pointer-events-none">
            <Plane className="w-40 h-40 text-black" />
          </div>
        )}

        {/* Encabezado del Ticket */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#9AC31C] font-racing font-bold text-xs flex items-center justify-center text-black">
              {brand.isFord ? 'FD' : 'VIP'}
            </span>
            <span className="font-racing font-bold text-xs text-zinc-700 tracking-wider">PASE DE PREMIO</span>
          </div>
          <span className="font-mono text-xs font-bold text-zinc-900 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-300">
            {ticketCode}
          </span>
        </div>

        {/* Datos del Piloto */}
        <div className="mb-4">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Piloto Titular</span>
          <p className="text-base font-bold text-zinc-900 uppercase">{lead.name}</p>
          {!brand.isFord && lead.dream_destination && (
            <span className="text-xs text-[#7A9E14] font-medium flex items-center gap-1 mt-0.5 font-semibold">
              <Sparkles className="w-3 h-3 text-[#7A9E14]" /> Destino soñado: {lead.dream_destination}
            </span>
          )}
        </div>

        {/* Premio Ganado */}
        <div className="ford-callout-box bg-zinc-900 border border-[#9AC31C] rounded-2xl p-4 text-center mb-4 shadow-md text-white">
          <span className="text-[10px] font-racing font-bold text-[#9AC31C] uppercase tracking-widest block mb-1">
            RESULTADO DE LA RULETA
          </span>
          <h3 className="text-xl font-racing font-black text-[#9AC31C] uppercase leading-snug">
            {winner.name}
          </h3>
          <p className="text-xs text-zinc-300 mt-1">
            {winner.description}
          </p>
        </div>

        {/* Validez de Urgencia */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-600 font-medium">
          <Clock className="w-3.5 h-3.5 text-[#7A9E14]" />
          <span>
            {brand.isFord
              ? 'Válido para canjear hoy en el stand de Ford Quito Motors'
              : 'Válido para canjear hoy en el stand de Marketing VIP'}
          </span>
        </div>
      </div>

      {/* Botón Estelar: RECLAMA TU PREMIO (WhatsApp) */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="ford-primary-btn w-full max-w-sm py-4 px-6 rounded-2xl bg-gradient-to-r from-[#84A816] via-[#9AC31C] to-[#84A816] hover:opacity-95 text-black font-racing font-black text-base uppercase tracking-wider shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-95 text-center group"
      >
        <MessageCircle className="w-6 h-6 text-black group-hover:scale-110 transition-transform" />
        <span>¡Reclama tu premio!</span>
      </a>

      <p className="text-xs text-zinc-600 text-center mt-3 max-w-xs font-medium">
        Presiona el botón para abrir WhatsApp y validar tu premio con nuestros asesores.
      </p>
    </div>
  );
}

