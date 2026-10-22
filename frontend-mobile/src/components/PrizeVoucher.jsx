import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Gift, Ticket, MessageCircle, Clock, CheckCircle2, Sparkles, Plane, CalendarCheck, MapPin } from 'lucide-react';
import { getMobileBrandConfig } from '../brand';
import { getPrizeIcon } from '../utils/prizeIcons';

// Oficinas de Marketing VIP donde se canjea el premio (Google Maps)
const OFFICE_MAPS = [
  {
    label: 'Quito',
    url: 'https://maps.google.com/maps/search/MARKETING%20VIP/@-0.19023863645109076,-78.48437464658178,17z?hl=es'
  },
  {
    label: 'Guayaquil',
    url: 'https://maps.google.com/maps/search/MARKETING%20VIP%20GYE/@-2.1570876461110595,-79.89243459799671,17z?hl=es'
  }
];

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

  const { winner, lead, ticketCode, whatsappUrl, appointment } = result;
  const isMail = brand.isMail;
  const PrizeIcon = isMail ? getPrizeIcon(winner.icon) : null;

  return (
    <div className={`w-full flex flex-col items-center animate-fadeIn select-none ${isMail ? 'my-0' : 'my-4'}`}>
      {/* Icono de Victoria y títulos (el canal Correo va directo al pase para no ocupar pantalla) */}
      {!isMail && (
        <>
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
          <h2 className="text-2xl font-racing font-black uppercase text-center mt-0.5 mb-4 text-zinc-900">
            ¡PREMIO OBTENIDO!
          </h2>
        </>
      )}

      {/* Tarjeta Tipo Boarding Pass / Pase VIP */}
      <div className={`w-full max-w-sm bg-white border-2 border-[#9AC31C] rounded-3xl shadow-xl relative overflow-hidden text-zinc-900 ${isMail ? 'p-4 mb-3 [@media(max-height:600px)]:p-3 [@media(max-height:600px)]:mb-2' : 'p-5 mb-6'}`}>
        {!brand.isFord && (
          <div className="absolute -right-8 -bottom-8 opacity-5 pointer-events-none">
            <Plane className="w-40 h-40 text-black" />
          </div>
        )}

        {/* Encabezado del Ticket */}
        <div className={`flex items-center justify-between border-b border-zinc-200 ${isMail ? 'pb-2 mb-2.5 [@media(max-height:600px)]:pb-1.5 [@media(max-height:600px)]:mb-1.5' : 'pb-3 mb-4'}`}>
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
        <div className={isMail ? 'mb-2.5' : 'mb-4'}>
          <span className={`text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold ${isMail ? '[@media(max-height:600px)]:hidden' : ''}`}>{isMail ? 'Ganador' : 'Piloto Titular'}</span>
          <p className="text-base font-bold text-zinc-900 uppercase">{lead.name}</p>
          {!brand.isFord && !isMail && lead.dream_destination && (
            <span className="text-xs text-[#7A9E14] font-medium flex items-center gap-1 mt-0.5 font-semibold">
              <Sparkles className="w-3 h-3 text-[#7A9E14]" /> Destino soñado: {lead.dream_destination}
            </span>
          )}
        </div>

        {/* Premio Ganado */}
        <div className={`ford-callout-box bg-zinc-900 border border-[#9AC31C] rounded-2xl text-center shadow-md text-white ${isMail ? 'p-3 mb-2.5 [@media(max-height:600px)]:p-2 [@media(max-height:600px)]:mb-2' : 'p-4 mb-4'}`}>
          <span className={`text-[10px] font-racing font-bold text-[#9AC31C] uppercase tracking-widest block mb-1 ${isMail ? '[@media(max-height:600px)]:hidden' : ''}`}>
            {isMail ? 'TU PREMIO' : 'RESULTADO DE LA RULETA'}
          </span>
          {PrizeIcon && (
            <PrizeIcon className="w-11 h-11 [@media(max-height:600px)]:w-8 [@media(max-height:600px)]:h-8 mx-auto mb-1 text-[#A8D120]" strokeWidth={1.6} />
          )}
          <h3 className={`font-racing font-black text-[#9AC31C] uppercase leading-snug ${isMail ? 'text-base [@media(max-height:600px)]:text-sm' : 'text-xl'}`}>
            {winner.name}
          </h3>
          {/* En el canal Correo la descripción solo se muestra si la pantalla es alta (evita scroll) */}
          <p className={`text-xs text-zinc-300 mt-1 ${isMail ? 'hidden [@media(min-height:760px)]:block' : ''}`}>
            {winner.description}
          </p>
        </div>

        {/* Cita de canje (campaña por correo) */}
        {isMail && appointment && (
          <div className="rounded-2xl border-2 border-[#9AC31C] bg-[#9AC31C]/10 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] [@media(max-height:600px)]:text-[10px] font-racing font-black text-[#5f7d0c] uppercase tracking-widest [@media(max-height:600px)]:tracking-wide">
              <CalendarCheck className="w-4 h-4 shrink-0" />
              <span>Tu cita para canjear el premio</span>
            </div>
            <p className="text-sm font-bold text-zinc-900 mt-1 first-letter:uppercase">{appointment.dateText}</p>
            <p className="text-lg font-racing font-black text-zinc-900 leading-tight">{appointment.timeText}</p>
            <p className="mt-1 text-[11px] font-medium text-zinc-600">Visítanos en nuestras oficinas:</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {OFFICE_MAPS.map(({ label, url }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full bg-[#0B2A4A] text-white text-[12px] font-bold shadow active:scale-95 transition-transform"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#C6F03A]" />
                  {label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Validez de Urgencia */}
        {!isMail && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-600 font-medium">
            <Clock className="w-3.5 h-3.5 text-[#7A9E14]" />
            <span>
              {brand.isFord
                ? 'Válido para canjear hoy en el stand de Ford Quito Motors'
                : 'Válido para canjear hoy en el stand de Marketing VIP'}
            </span>
          </div>
        )}
      </div>

      {/* Botón Estelar: RECLAMA TU PREMIO (WhatsApp) */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`ford-primary-btn w-full max-w-sm ${isMail ? 'py-3 [@media(max-height:600px)]:py-2' : 'py-4'} px-6 rounded-2xl bg-gradient-to-r from-[#84A816] via-[#9AC31C] to-[#84A816] hover:opacity-95 text-black font-racing font-black text-base uppercase tracking-wider shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-95 text-center group`}
      >
        <MessageCircle className="w-6 h-6 text-black group-hover:scale-110 transition-transform" />
        <span>{isMail ? 'Confirmar mi cita por WhatsApp' : '¡Reclama tu premio!'}</span>
      </a>

      <p className={`text-center max-w-xs font-medium ${isMail ? 'text-[11px] mt-2 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] [@media(max-height:640px)]:hidden' : 'text-xs mt-3 text-zinc-600'}`}>
        {isMail
          ? 'Presiona el botón para abrir WhatsApp y confirmar tu cita y tu premio con nuestro asistente.'
          : 'Presiona el botón para abrir WhatsApp y validar tu premio con nuestros asesores.'}
      </p>
    </div>
  );
}

