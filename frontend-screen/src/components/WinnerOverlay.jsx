import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Gift, Sparkles, Ticket, X, Clock } from 'lucide-react';

export default function WinnerOverlay({ winnerData, onClose }) {
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

    // Disparar ráfagas de confeti con verde corporativo #9AC31C, dorado y rojo
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 35, spread: 360, ticks: 70, zIndex: 100 };

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
        colors: ['#9AC31C', '#ef4444', '#ffffff', '#B2DC2B']
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#9AC31C', '#ef4444', '#ffffff', '#B2DC2B']
      });
    }, 300);

    return () => clearInterval(interval);
  }, [winnerData]);

  if (!winnerData) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn select-none">
      <div className="relative max-w-2xl w-full brushed-metal border-4 border-[#9AC31C] rounded-3xl p-8 shadow-[0_0_80px_rgba(154,195,28,0.5)] text-center overflow-hidden">
        
        {/* Botón Cerrar Manual */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 rounded-full bg-zinc-800/80 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Encabezado de Trofeo */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#84A816] to-[#9AC31C] flex items-center justify-center shadow-[0_0_40px_rgba(154,195,28,0.9)] animate-bounce">
              <Trophy className="w-14 h-14 text-black" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-[#9AC31C] animate-spin" />
          </div>
        </div>

        <span className="font-racing text-red-500 text-sm tracking-widest font-black uppercase">
          ¡BANDERA A CUADROS! • MARKETING VIP
        </span>
        <h2 className="text-3xl md:text-5xl font-racing font-black text-white mt-1 mb-2 tracking-wide text-glow-brand">
          ¡FELICIDADES!
        </h2>
        
        <p className="text-xl text-zinc-200 font-semibold mb-6">
          Piloto Ganador: <span className="text-[#9AC31C] font-bold underline decoration-[#9AC31C]">{winnerData.leadName}</span>
        </p>

        {/* Tarjeta del Premio Ganado */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border-2 border-[#9AC31C]/80 rounded-2xl p-6 shadow-inner mb-6 relative">
          <div className="inline-flex items-center gap-2 bg-[#9AC31C] px-3.5 py-1 rounded-full text-xs font-racing font-black text-black uppercase tracking-wider mb-2 shadow">
            <Gift className="w-4 h-4 text-black" /> Premio Obtenido
          </div>
          <h3 className="text-3xl md:text-4xl font-racing font-black text-[#9AC31C] mb-2 drop-shadow">
            {winnerData.prize.name}
          </h3>
          <p className="text-zinc-300 text-base max-w-lg mx-auto">
            {winnerData.prize.description}
          </p>
        </div>

        {/* Código de Ticket */}
        <div className="inline-flex items-center gap-3 bg-zinc-950 border border-[#9AC31C]/60 px-6 py-2.5 rounded-xl shadow-lg mb-4">
          <Ticket className="w-5 h-5 text-[#9AC31C]" />
          <span className="text-zinc-400 text-sm">Código de Validación:</span>
          <span className="font-racing text-xl font-bold text-white tracking-widest bg-zinc-800 px-2.5 py-0.5 rounded">
            {winnerData.ticketCode}
          </span>
        </div>

        <p className="text-sm text-zinc-400 max-w-md mx-auto mb-3">
          Presenta tu celular en el stand de <strong className="text-[#9AC31C]">Marketing VIP</strong> para activar tus beneficios exclusivos y planear tu próximo viaje.
        </p>

        {/* Barra de Cuenta Regresiva de Cierre Automático (10s) */}
        <div className="pt-3 border-t border-zinc-800 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 text-xs font-racing font-bold text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-[#9AC31C]" />
            <span>Cerrando automáticamente en <span className="text-[#9AC31C] text-sm font-black">{countdown}s</span></span>
          </div>
          <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden border border-zinc-700/50">
            <div
              className="bg-gradient-to-r from-[#84A816] to-[#9AC31C] h-full transition-all duration-1000 ease-linear shadow-[0_0_12px_rgba(154,195,28,0.9)]"
              style={{ width: `${(countdown / 12) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
