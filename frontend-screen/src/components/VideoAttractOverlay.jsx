import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Sparkles, Volume2, VolumeX, X } from 'lucide-react';

function extractYouTubeId(urlOrId) {
  if (!urlOrId) return 'AzQlHkHx6HI';
  const clean = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }
  const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match && match[1]) {
    return match[1];
  }
  return clean;
}

export default function VideoAttractOverlay({
  isVisible,
  onDismiss,
  mobileUrl = '',
  screenId = 'STAND_01',
  videoId = 'AzQlHkHx6HI',
  logoScale = 100
}) {
  const activeVideoId = extractYouTubeId(videoId);
  const safeLogoScale = Math.max(50, Math.min(250, Number(logoScale) || 100));
  const logoHeight = Math.round(54 * (safeLogoScale / 100));
  const iframeRef = useRef(null);
  const isProduction = typeof window !== 'undefined' && (
    window.location.hostname === 'autos.mvevip.com' ||
    window.location.hostname.endsWith('.mvevip.com')
  );
  const effectiveMobileUrl = mobileUrl || (
    isProduction
      ? (typeof window !== 'undefined' ? `${window.location.origin}/` : 'https://autos.mvevip.com/')
      : (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5503/` : 'http://localhost:5503/')
  );
  const fullQrUrl = `${effectiveMobileUrl}?screen=${screenId}`;
  const [isMuted, setIsMuted] = useState(false);

  const sendIframeCommand = (func, args = []) => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    } catch (e) {
      console.warn('[VideoAttract] Error enviando postMessage:', e);
    }
  };

  // Inicializar comunicación con el iframe de YouTube y configurar listener para bucle sin recarga
  const initIframeApi = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }),
        '*'
      );
    } catch (_) {}
  };

  // Manejar eventos postMessage de YouTube para detectar el fin del video y reiniciar al instante (0s)
  useEffect(() => {
    const handleWindowMessage = (event) => {
      if (!event.origin || (!event.origin.includes('youtube.com') && !event.origin.includes('youtube-nocookie.com'))) {
        return;
      }
      try {
        const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!payload) return;

        // YT.PlayerState.ENDED es 0
        const isEnded = (
          (payload.event === 'onStateChange' && payload.info === 0) ||
          (payload.event === 'infoDelivery' && payload.info && (
            payload.info.playerState === 0 ||
            (payload.info.duration > 2 && payload.info.currentTime >= payload.info.duration - 0.4)
          ))
        );

        if (isEnded) {
          // Bucle instantáneo: regresar a 0s y reproducir inmediatamente sin descargar de nuevo el video
          sendIframeCommand('seekTo', [0, true]);
          sendIframeCommand('playVideo');
        }
      } catch (_) {}
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, []);

  // Mantener activo el handshake de eventos mientras el video esté visible
  useEffect(() => {
    if (!isVisible) return;
    initIframeApi();
    const interval = setInterval(() => {
      initIframeApi();
    }, 4000);
    return () => clearInterval(interval);
  }, [isVisible]);

  // Controlar reproducción/pausa y audio sin recargar el iframe
  useEffect(() => {
    if (isVisible) {
      initIframeApi();
      sendIframeCommand('playVideo');
      if (!isMuted) {
        sendIframeCommand('unMute');
        sendIframeCommand('setVolume', [100]);
      }
    } else {
      // Cuando se oculta, solo se pausa y silencia (permanece cargado en memoria)
      sendIframeCommand('mute');
      sendIframeCommand('pauseVideo');
    }
  }, [isVisible, isMuted]);

  const toggleSound = (e) => {
    e.stopPropagation();
    if (isMuted) {
      sendIframeCommand('unMute');
      sendIframeCommand('setVolume', [100]);
      setIsMuted(false);
    } else {
      sendIframeCommand('mute');
      setIsMuted(true);
    }
  };

  const handleVideoClick = () => {
    sendIframeCommand('playVideo');
    sendIframeCommand('unMute');
    sendIframeCommand('setVolume', [100]);
    setIsMuted(false);
  };

  const iframeOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div
      className={`fixed inset-0 bg-black overflow-hidden flex items-center justify-center transition-opacity duration-700 select-none cursor-pointer ${
        isVisible ? 'opacity-100 pointer-events-auto z-40' : 'opacity-0 pointer-events-none -z-10'
      }`}
      onClick={handleVideoClick}
    >
      {/* 1. Contenedor del Video en Proporción Adaptativa (Sin loop de playlist para evitar buffering continuo) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center pointer-events-none">
        <iframe
          ref={iframeRef}
          onLoad={initIframeApi}
          src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1&playsinline=1&origin=${encodeURIComponent(iframeOrigin)}`}
          title="Marketing VIP Video Corporativo"
          allow="autoplay; encrypted-media"
          className="w-[100vw] h-[100vh] min-w-[177.78vh] min-h-[56.25vw] max-w-none border-0 object-cover scale-[1.25] md:scale-[1.4] pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />
      </div>

      {/* 2. Banner Superior Corporativo Flotante: Logotipo Centrado Horizontalmente */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none z-20">
        <div
          className="flex items-center justify-center bg-zinc-950/85 backdrop-blur-md border border-[#9AC31C]/60 rounded-2xl shadow-[0_0_25px_rgba(154,195,28,0.3)] pointer-events-auto transition-all"
          style={{
            padding: `${Math.max(8, Math.round(10 * (safeLogoScale / 100)))}px ${Math.max(12, Math.round(16 * (safeLogoScale / 100)))}px`
          }}
        >
          <img
            src="/logotipo.png"
            onError={(e) => { e.currentTarget.src = '/pantalla/logotipo.png'; }}
            alt="Marketing VIP"
            style={{
              height: `${logoHeight}px`
            }}
            className="w-auto object-contain drop-shadow-[0_0_15px_rgba(154,195,28,0.6)] select-none transition-all"
          />
        </div>
      </div>

      {/* Indicadores Fijos en Esquina Superior Derecha: Audio, Stand y Cerrar */}
      <div className="absolute top-6 right-6 flex items-center gap-2 pointer-events-auto z-20">
        <button
          type="button"
          onClick={toggleSound}
          className="flex items-center gap-2 bg-zinc-950/85 hover:bg-zinc-900 backdrop-blur-md border border-[#9AC31C]/60 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all active:scale-95 cursor-pointer"
          title={isMuted ? 'Activar Audio' : 'Silenciar Audio'}
        >
          {isMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-red-400" />
              <span className="text-zinc-300">Activar Audio</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-[#9AC31C] animate-pulse" />
              <span className="text-[#9AC31C]">Audio Activo</span>
            </>
          )}
        </button>

        <div className="bg-zinc-950/85 backdrop-blur-md border border-zinc-800 px-4 py-2 rounded-xl text-zinc-300 text-xs font-semibold flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#9AC31C] animate-ping" />
          <span>Stand #{screenId}</span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="w-8 h-8 rounded-full bg-zinc-900/60 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 border border-zinc-800/80 flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm shadow-md active:scale-95 ml-1"
          title="Cerrar video y mostrar ruleta"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Tarjeta Flotante con Código QR en Esquina Inferior Derecha (Fija y Original) */}
      <div
        className="absolute bottom-8 right-8 z-30 brushed-metal p-5 rounded-3xl border-2 border-[#9AC31C] shadow-[0_0_40px_rgba(154,195,28,0.5)] flex flex-col items-center w-72 text-center backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-2">
          <Smartphone className="w-5 h-5 text-[#9AC31C]" />
          <span className="font-racing text-xs font-black tracking-wider text-[#9AC31C] uppercase">
            ¡Escanea para Girar!
          </span>
          <Sparkles className="w-4 h-4 text-yellow-400" />
        </div>

        {/* Código QR Generado */}
        <div className="bg-white p-3 rounded-2xl shadow-[0_0_20px_rgba(154,195,28,0.5)] border border-[#9AC31C] mb-3">
          <QRCodeSVG
            value={fullQrUrl}
            size={160}
            level="H"
            includeMargin={false}
          />
        </div>

        <p className="text-xs text-zinc-300 font-semibold leading-tight">
          Apunta la cámara de tu celular para registrarte y jugar
        </p>
      </div>
    </div>
  );
}
