import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Gift, Sparkles, Ticket, X, Clock } from 'lucide-react';
import { getScreenBrandConfig } from '../brand';

export default function WinnerOverlay({ winnerData, onClose }) {
  const brand = getScreenBrandConfig();
  const [countdown, setCountdown] = useState(12);

  // Cuenta regresiva automática de 12 segundos
  useEffect(() => {
    if (!winnerData) return;
    setCountdown(12);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [winnerData, onClose]);

  useEffect(() => {
    if (!winnerData) return;

    // Disparar ráfagas de confeti con colores corporativos según stand
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 35, spread: 360, ticks: 70, zIndex: 100 };
    const confettiColors = brand.isFord
      ? ['#212650', '#ffffff', '#3b82f6', '#94a3b8']
      : ['#9AC31C', '#ef4444', '#ffffff', '#B2DC2B'];

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 60 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: confettiColors
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: confettiColors
      });
    }, 300);

    return () => clearInterval(interval);
  }, [winnerData, brand.isFord]);

  if (!winnerData) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn select-none">
      <div className={`relative max-w-2xl w-full brushed-metal border-4 border-[#9AC31C] rounded-3xl p-8 text-center overflow-hidden ${
        brand.isFord ? 'shadow-[0_0_80px_rgba(33,38,80,0.65)]' : 'shadow-[0_0_80px_rgba(154,195,28,0.5)]'
      }`}>
        
        {/* Botón Cerrar Manual */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
            brand.isFord ? 'text-[#212650] hover:bg-[#212650]/10 bg-zinc-200/80' : 'text-zinc-400 hover:text-white bg-zinc-800/80'
          }`}
        >
          <X className="w-6 h-6" />
        </button>

        {/* Encabezado con Logotipo Oficial */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className={`w-28 h-28 rounded-full p-1.5 flex items-center justify-center animate-bounce ${
              brand.isFord
                ? 'bg-gradient-to-tr from-[#171b3a] to-[#212650] shadow-[0_0_40px_rgba(33,38,80,0.6)]'
                : 'bg-gradient-to-tr from-[#84A816] to-[#9AC31C] shadow-[0_0_50px_rgba(154,195,28,0.95)]'
            }`}>
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-2.5 shadow-inner overflow-hidden">
                <img
                  src={brand.logoSrc}
                  alt={brand.logoAlt}
                  className="w-full h-full object-contain filter drop-shadow"
                  onError={(e) => {
                    e.currentTarget.src = brand.logoFallbackSrc;
                  }}
                />
              </div>
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-[#9AC31C] animate-spin" />
          </div>
        </div>

        <span className={`font-racing text-sm tracking-widest font-black uppercase ${
          brand.isFord ? 'text-[#212650]' : 'text-red-500'
        }`}>
          ¡BANDERA A CUADROS! • {brand.name.toUpperCase()}
        </span>
        <h2 className={`text-3xl md:text-5xl font-racing font-black mt-1 mb-2 tracking-wide ${
          brand.isFord ? 'text-[#212650]' : 'text-white text-glow-brand'
        }`}>
          ¡FELICIDADES!
        </h2>
        
        <p className={`text-xl font-semibold mb-6 ${brand.isFord ? 'text-[#212650]' : 'text-zinc-200'}`}>
          Piloto Ganador: <span className="text-[#9AC31C] font-bold underline decoration-[#9AC31C]">{winnerData.leadName}</span>
        </p>

        {/* Tarjeta del Premio Ganado */}
        <div className={`border-2 rounded-2xl p-6 shadow-inner mb-6 relative ${
          brand.isFord
            ? 'bg-[#212650] border-[#212650] text-white'
            : 'bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border-[#9AC31C]/80'
        }`}>
          <div className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-racing font-black uppercase tracking-wider mb-2 shadow ${
            brand.isFord ? 'bg-white text-[#212650]' : 'bg-[#9AC31C] text-black'
          }`}>
            <Gift className={`w-4 h-4 ${brand.isFord ? 'text-[#212650]' : 'text-black'}`} /> Premio Obtenido
          </div>
          <h3 className={`text-3xl md:text-4xl font-racing font-black mb-2 drop-shadow ${
            brand.isFord ? 'text-white' : 'text-[#9AC31C]'
          }`}>
            {winnerData.prize.name}
          </h3>
          <p className={`text-base max-w-lg mx-auto ${brand.isFord ? 'text-white/90' : 'text-zinc-300'}`}>
            {winnerData.prize.description}
          </p>
        </div>

        {/* Código de Ticket */}
        <div className={`inline-flex items-center gap-3 border px-6 py-2.5 rounded-xl shadow-lg mb-4 ${
          brand.isFord ? 'bg-white border-[#212650]' : 'bg-zinc-950 border-[#9AC31C]/60'
        }`}>
          <Ticket className="w-5 h-5 text-[#9AC31C]" />
          <span className={`text-sm ${brand.isFord ? 'text-[#212650]/80 font-medium' : 'text-zinc-400'}`}>Código de Validación:</span>
          <span className={`font-racing text-xl font-bold tracking-widest px-2.5 py-0.5 rounded ${
            brand.isFord ? 'bg-[#212650] text-white' : 'bg-zinc-800 text-white'
          }`}>
            {winnerData.ticketCode}
          </span>
        </div>

        <p className={`text-sm max-w-md mx-auto mb-3 ${brand.isFord ? 'text-[#212650]/85 font-medium' : 'text-zinc-400'}`}>
          Presenta tu celular en el stand de <strong className="text-[#9AC31C]">{brand.name}</strong> para reclamar tu premio y activar tus beneficios exclusivos.
        </p>

        {/* Barra de Cuenta Regresiva de Cierre Automático */}
        <div className={`pt-3 border-t flex flex-col items-center gap-1.5 ${
          brand.isFord ? 'border-[#212650]/20' : 'border-zinc-800'
        }`}>
          <div className={`flex items-center gap-2 text-xs font-racing font-bold ${
            brand.isFord ? 'text-[#212650]/80' : 'text-zinc-400'
          }`}>
            <Clock className="w-3.5 h-3.5 text-[#9AC31C]" />
            <span>Cerrando automáticamente en <span className="text-[#9AC31C] text-sm font-black">{countdown}s</span></span>
          </div>
          <div className={`w-full h-2 rounded-full overflow-hidden border ${
            brand.isFord ? 'bg-slate-200 border-[#212650]/20' : 'bg-zinc-800/80 border-zinc-700/50'
          }`}>
            <div
              className={`h-full transition-all duration-1000 ease-linear ${
                brand.isFord
                  ? 'bg-[#212650]'
                  : 'bg-gradient-to-r from-[#84A816] to-[#9AC31C] shadow-[0_0_12px_rgba(154,195,28,0.9)]'
              }`}
              style={{ width: `${(countdown / 12) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

