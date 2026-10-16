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
  onVideoEnded,
  mobileUrl = '',
  screenId = 'STAND_01',
  videoId = 'AzQlHkHx6HI',
  isConfigLoaded = true,
  logoScale = 100,
  showLogo = false
}) {
  const activeVideoId = extractYouTubeId(videoId);
  const safeLogoScale = Math.max(50, Math.min(250, Number(logoScale) || 100));
  const logoHeight = Math.round(54 * (safeLogoScale / 100));
  const iframeRef = useRef(null);
  const isVisibleRef = useRef(isVisible);
  const onVideoEndedRef = useRef(onVideoEnded);
  const endHandledRef = useRef(false);

  isVisibleRef.current = isVisible;
  onVideoEndedRef.current = onVideoEnded;

  // Medir tamaño real de la pantalla para ajuste exacto 100% horizontal y 100% vertical
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080
  }));

  // Relación de aspecto nativa del video de YouTube (16/9 por defecto, detectada vía oEmbed para soportar cualquier formato)
  const [videoAspect, setVideoAspect] = useState(16 / 9);

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!activeVideoId) return;
    let isCancelled = false;
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${activeVideoId}&format=json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isCancelled && data && data.width && data.height) {
          setVideoAspect(data.width / data.height);
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [activeVideoId]);

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

  // Inicializar comunicación con el iframe de YouTube y configurar listener para control en memoria sin recarga
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

  // Manejar eventos postMessage de YouTube para detectar el fin del video, rebobinar en memoria a 0s, pausar y mostrar la ruleta por 20s
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

        if (isEnded && isVisibleRef.current && !endHandledRef.current) {
          endHandledRef.current = true;
          // Posicionar en 0s y pausar en memoria sin recargar el iframe
          sendIframeCommand('seekTo', [0, true]);
          sendIframeCommand('pauseVideo');
          sendIframeCommand('mute');

          // Notificar a App.jsx para mostrar la ruleta durante 20 segundos
          if (onVideoEndedRef.current) {
            onVideoEndedRef.current();
          } else if (onDismiss) {
            onDismiss();
          }
        }
      } catch (_) {}
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [onDismiss]);

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
      // Si viene de haber finalizado el ciclo de video, asegurar inicio desde 0s en memoria
      if (endHandledRef.current) {
        sendIframeCommand('seekTo', [0, true]);
        setTimeout(() => {
          endHandledRef.current = false;
        }, 1500);
      }
      sendIframeCommand('playVideo');
      if (!isMuted) {
        sendIframeCommand('unMute');
        sendIframeCommand('setVolume', [100]);
      }
    } else {
      // Cuando se oculta (pausa de 20s en la ruleta), solo se pausa y silencia (permanece cargado en memoria)
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

  // Dimensiones base fieles a la relación de aspecto del video y factores de escala para ocupar el 100% horizontal y vertical sin recortes
  const baseWidth = 1920;
  const baseHeight = Math.max(100, Math.round(baseWidth / (videoAspect || 16 / 9)));
  const scaleX = viewportSize.width / baseWidth;
  const scaleY = viewportSize.height / baseHeight;

  return (
    <div
      className={`fixed inset-0 bg-black overflow-hidden flex items-center justify-center transition-opacity duration-700 select-none cursor-pointer ${
        isVisible ? 'opacity-100 pointer-events-auto z-40' : 'opacity-0 pointer-events-none -z-10'
      }`}
      onClick={handleVideoClick}
    >
      {/* 1. Contenedor del Video Ajustado al 100% Horizontal y Vertical (Sin recortes ni recargas) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center pointer-events-none">
        {isConfigLoaded && (
          <iframe
            ref={iframeRef}
            onLoad={initIframeApi}
            src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1&playsinline=1&origin=${encodeURIComponent(iframeOrigin)}`}
            title="Marketing VIP Video Corporativo"
            allow="autoplay; encrypted-media"
            style={{
              width: `${baseWidth}px`,
              height: `${baseHeight}px`,
              transform: `scale(${scaleX}, ${scaleY})`,
              transformOrigin: 'center center'
            }}
            className="max-w-none border-0 pointer-events-none shrink-0"
          />
        )}
      </div>

      {/* 2. Banner Superior Corporativo Flotante: Logotipo Centrado Horizontalmente (Oculto por defecto, controlable desde Admin) */}
      <div
        className={`absolute top-6 left-1/2 -translate-x-1/2 z-20 transition-opacity duration-300 ${
          showLogo ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none hidden'
        }`}
      >
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

      {/* Controles Compactos en Esquina Superior Derecha: Solo Iconos (Audio y Cerrar) */}
      <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto z-20">
        <button
          type="button"
          onClick={toggleSound}
          className="w-9 h-9 rounded-full bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-700 flex items-center justify-center p-0 transition-all cursor-pointer backdrop-blur-md shadow-lg active:scale-95"
          title={isMuted ? 'Activar Audio' : 'Silenciar Audio'}
          aria-label={isMuted ? 'Activar Audio' : 'Silenciar Audio'}
        >
          {isMuted ? (
            <VolumeX size={18} strokeWidth={2.5} className="text-red-400 shrink-0" />
          ) : (
            <Volume2 size={18} strokeWidth={2.5} className="text-[#9AC31C] shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="w-9 h-9 rounded-full bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-700 flex items-center justify-center p-0 transition-all cursor-pointer backdrop-blur-md shadow-lg active:scale-95"
          title="Cerrar video y mostrar ruleta"
          aria-label="Cerrar video y mostrar ruleta"
        >
          <X size={18} strokeWidth={2.5} className="text-white hover:text-[#9AC31C] shrink-0 transition-colors" />
        </button>
      </div>

      {/* Tag Discreto del Stand en Esquina Inferior Izquierda */}
      <div className="absolute bottom-3 left-3 bg-zinc-950/60 backdrop-blur-sm border border-zinc-800/60 px-2.5 py-1 rounded-lg text-zinc-400/85 text-[10px] font-medium flex items-center gap-1.5 pointer-events-none z-20">
        <span className="w-1.5 h-1.5 rounded-full bg-[#9AC31C]/80 shrink-0" />
        <span>Stand #{screenId}</span>
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
