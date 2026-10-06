import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, CheckCircle2 } from 'lucide-react';

export default function QRCodeCard({ mobileUrl = 'http://localhost:5503', screenId = 'STAND_01', driverConnected = false }) {
  const fullUrl = `${mobileUrl}?screen=${screenId}`;

  return (
    <div className="brushed-metal p-5 rounded-3xl border-2 border-[#9AC31C]/60 shadow-[0_0_30px_rgba(154,195,28,0.25)] flex flex-col items-center w-80 text-center relative overflow-hidden select-none">
      {/* Resplandor decorativo verde lima */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#9AC31C]/15 rounded-full blur-2xl" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Smartphone className="w-5 h-5 text-[#9AC31C]" />
        <h3 className="font-racing font-bold text-sm tracking-widest text-[#9AC31C] uppercase">
          Escanea para Girar
        </h3>
      </div>

      {/* Contenedor del Código QR */}
      <div className="bg-white p-3.5 rounded-2xl shadow-[0_0_25px_rgba(154,195,28,0.4)] border-2 border-[#9AC31C] mb-3 relative">
        <QRCodeSVG
          value={fullUrl}
          size={160}
          level="H"
          includeMargin={false}
        />
      </div>

      {/* Indicador de Stand */}
      <div className="w-full mb-3">
        <div className="flex items-center justify-center gap-2 bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-xl text-zinc-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#9AC31C]" />
          <span>Feria Automotriz • {screenId}</span>
        </div>
      </div>

      {/* Pasos Rápidos */}
      <div className="space-y-1.5 text-left w-full text-xs text-zinc-300">
        <div className="flex items-center gap-2 bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-800">
          <span className="w-5 h-5 rounded-full bg-red-600 font-racing font-bold text-[10px] flex items-center justify-center text-white shrink-0">1</span>
          <span>Apunta con la cámara de tu celular</span>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-800">
          <span className="w-5 h-5 rounded-full bg-[#9AC31C] font-racing font-bold text-[10px] flex items-center justify-center text-black shrink-0">2</span>
          <span>Completa tu nombre y celular</span>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-800">
          <span className="w-5 h-5 rounded-full bg-red-600 font-racing font-bold text-[10px] flex items-center justify-center text-white shrink-0">3</span>
          <span>Presiona <strong>ENGINE START</strong></span>
        </div>
      </div>
    </div>
  );
}
