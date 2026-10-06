import React, { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Sparkles, Play, Hand } from 'lucide-react';

const YOUTUBE_VIDEO_ID = 'AzQlHkHx6HI';

export default function VideoAttractOverlay({
  isVisible,
  onDismiss,
  mobileUrl = 'https://autos.mvevip.com/',
  screenId = 'STAND_01'
}) {
  const iframeRef = useRef(null);
  const fullQrUrl = `${mobileUrl}?screen=${screenId}`;

  // Controlar reproducción/pausa mediante la API de YouTube sin recargar el iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;

    try {
      if (isVisible) {
        // Enviar comando Play
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
          '*'
        );
      } else {
        // Enviar comando Pause
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
          '*'
        );
      }
    } catch (e) {
      console.warn('[VideoAttract] Error controlando iframe postMessage:', e);
    }
  }, [isVisible]);

  return (
    <div
      className={`fixed inset-0 bg-black overflow-hidden flex items-center justify-center transition-opacity duration-700 select-none ${
        isVisible ? 'opacity-100 pointer-events-auto z-40' : 'opacity-0 pointer-events-none -z-10'
      }`}
      onClick={onDismiss}
    >
      {/* 1. Contenedor del Video en Proporción Adaptativa (Cubre 100% de pantalla cuadrada 2x2m) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center pointer-events-none">
        <iframe
          ref={iframeRef}
          src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${YOUTUBE_VIDEO_ID}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1`}
          title="Marketing VIP Video Corporativo"
          allow="autoplay; encrypted-media"
          className="w-[100vw] h-[100vh] min-w-[177.78vh] min-h-[56.25vw] max-w-none border-0 object-cover scale-[1.25] md:scale-[1.4] pointer-events-none"
        />
        {/* Gradiente sutil para mejorar la legibilidad de textos y QR */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />
      </div>

      {/* 2. Banner Superior Corporativo Flotante */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 bg-zinc-950/85 backdrop-blur-md border border-[#9AC31C]/60 px-5 py-2.5 rounded-2xl shadow-[0_0_25px_rgba(154,195,28,0.3)]">
          <img
            src="/logotipo.png"
            alt="Marketing VIP"
            className="h-9 w-auto object-contain drop-shadow-[0_0_12px_rgba(154,195,28,0.6)]"
          />
          <div className="hidden sm:block border-l border-zinc-700 pl-3">
            <span className="font-racing text-xs text-[#9AC31C] tracking-widest uppercase block font-bold">
              Gran Premio 2026
            </span>
            <span className="text-[11px] text-zinc-400">
              Especialistas en sueños
            </span>
          </div>
        </div>

        {/* Indicador de Stand */}
        <div className="bg-zinc-950/85 backdrop-blur-md border border-zinc-800 px-4 py-2 rounded-xl text-zinc-300 text-xs font-semibold flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#9AC31C] animate-ping" />
          <span>Stand #{screenId}</span>
        </div>
      </div>

      {/* 3. Botón Flotante Central/Inferior: "Toca para Jugar" */}
      <div className="absolute bottom-8 left-8 z-50">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="group flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-racing font-bold text-sm tracking-wider uppercase shadow-[0_0_30px_rgba(239,68,68,0.6)] border-2 border-red-400/80 transition-all transform hover:scale-105 active:scale-95 backdrop-blur-sm"
        >
          <Hand className="w-5 h-5 text-white animate-bounce" />
          <span>Toca la pantalla para jugar</span>
          <Play className="w-4 h-4 fill-white" />
        </button>
      </div>

      {/* 4. Tarjeta Flotante con Código QR en Esquina Inferior Derecha */}
      <div
        className="absolute bottom-8 right-8 z-50 brushed-metal p-4 rounded-3xl border-2 border-[#9AC31C] shadow-[0_0_40px_rgba(154,195,28,0.5)] flex flex-col items-center w-72 text-center backdrop-blur-xl animate-pulse hover:animate-none cursor-pointer transform hover:scale-105 transition-transform"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Smartphone className="w-4 h-4 text-[#9AC31C]" />
          <span className="font-racing text-xs font-black tracking-wider text-[#9AC31C] uppercase">
            ¡Escanea para Girar!
          </span>
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
        </div>

        {/* Código QR Generado */}
        <div className="bg-white p-2.5 rounded-2xl shadow-[0_0_20px_rgba(154,195,28,0.5)] border border-[#9AC31C] mb-2">
          <QRCodeSVG
            value={fullQrUrl}
            size={140}
            level="H"
            includeMargin={false}
          />
        </div>

        <p className="text-[11px] text-zinc-300 font-semibold leading-tight">
          Apunta tu cámara al QR o toca aquí para activar la ruleta
        </p>
      </div>
    </div>
  );
}
