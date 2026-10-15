import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Sparkles, Volume2, VolumeX, X, Move, RotateCcw } from 'lucide-react';

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
  mobileUrl = 'https://autos.mvevip.com/',
  screenId = 'STAND_01',
  videoId = 'AzQlHkHx6HI',
  logoScale = 100
}) {
  const activeVideoId = extractYouTubeId(videoId);
  const safeLogoScale = Math.max(50, Math.min(250, Number(logoScale) || 100));
  const logoHeight = Math.round(54 * (safeLogoScale / 100));
  const iframeRef = useRef(null);
  const cardRef = useRef(null);
  const fullQrUrl = `${mobileUrl}?screen=${screenId}`;
  const [isMuted, setIsMuted] = useState(false);

  // Estados para mover el código QR libremente con memoria de posición
  const storageKey = 'mvevip_screen_qr_pos';
  const [position, setPosition] = useState(null); // { x: number, y: number } | null
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const loadSavedPosition = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const safeX = Math.max(10, Math.min(window.innerWidth - 300, parsed.x));
          const safeY = Math.max(10, Math.min(window.innerHeight - 360, parsed.y));
          setPosition({ x: safeX, y: safeY });
          return;
        }
      }
      setPosition(null);
    } catch (e) {
      console.warn('[VideoAttract] Error leyendo posición guardada del QR:', e);
    }
  };

  // Cargar y sincronizar posición con el resto de la aplicación
  useEffect(() => {
    loadSavedPosition();

    const handleSync = () => loadSavedPosition();
    window.addEventListener('storage', handleSync);
    window.addEventListener('qr-position-updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('qr-position-updated', handleSync);
    };
  }, [isVisible]);

  // Manejadores de arrastre con Pointer Events
  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    if (e.target.closest('button')) return;

    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = position ? position.x : rect.left;
    const currentY = position ? position.y : rect.top;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY
    };

    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    e.stopPropagation();
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    const rawX = dragStartRef.current.initialX + deltaX;
    const rawY = dragStartRef.current.initialY + deltaY;

    const cardWidth = cardRef.current?.offsetWidth || 288;
    const cardHeight = cardRef.current?.offsetHeight || 340;

    const clampedX = Math.max(10, Math.min(window.innerWidth - cardWidth - 10, rawX));
    const clampedY = Math.max(10, Math.min(window.innerHeight - cardHeight - 10, rawY));

    setPosition({ x: clampedX, y: clampedY });
  };

  const handlePointerUp = (e) => {
    e.stopPropagation();
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (position) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(position));
        window.dispatchEvent(new Event('qr-position-updated'));
      } catch (err) {
        console.warn('[VideoAttract] Error guardando posición de QR:', err);
      }
    }
  };

  const handleResetPosition = (e) => {
    e.stopPropagation();
    setPosition(null);
    try {
      localStorage.removeItem(storageKey);
      window.dispatchEvent(new Event('qr-position-updated'));
    } catch (_) {}
  };

  const sendIframeCommand = (func, args = []) => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    } catch (e) {
      console.warn('[VideoAttract] Error controlando iframe postMessage:', e);
    }
  };

  // Controlar reproducción/pausa y audio mediante la API de YouTube sin recargar el iframe
  useEffect(() => {
    if (isVisible) {
      sendIframeCommand('playVideo');
      if (!isMuted) {
        sendIframeCommand('unMute');
        sendIframeCommand('setVolume', [100]);
      }
    } else {
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

  const cardStyle = position
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 60,
        margin: 0
      }
    : {};

  return (
    <div
      className={`fixed inset-0 bg-black overflow-hidden flex items-center justify-center transition-opacity duration-700 select-none cursor-pointer ${
        isVisible ? 'opacity-100 pointer-events-auto z-40' : 'opacity-0 pointer-events-none -z-10'
      }`}
      onClick={handleVideoClick}
    >
      {/* 1. Contenedor del Video en Proporción Adaptativa */}
      <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center pointer-events-none">
        <iframe
          ref={iframeRef}
          src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&mute=0&loop=1&playlist=${activeVideoId}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1`}
          title="Marketing VIP Video Corporativo"
          allow="autoplay; encrypted-media"
          className="w-[100vw] h-[100vh] min-w-[177.78vh] min-h-[56.25vw] max-w-none border-0 object-cover scale-[1.25] md:scale-[1.4] pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />
      </div>

      {/* 2. Banner Superior Corporativo Flotante: Solo Logotipo Agrandado */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-none">
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

        {/* Indicadores: Audio y Stand */}
        <div className="flex items-center gap-2 pointer-events-auto">
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
      </div>

      {/* 3. Tarjeta Flotante con Código QR (Arrastrable con memoria de posición) */}
      <div
        ref={cardRef}
        style={cardStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={(e) => e.stopPropagation()}
        className={`z-50 brushed-metal p-4 rounded-3xl border-2 border-[#9AC31C] shadow-[0_0_40px_rgba(154,195,28,0.5)] flex flex-col items-center w-72 text-center backdrop-blur-xl cursor-grab active:cursor-grabbing select-none transition-shadow ${
          position ? '' : 'absolute bottom-8 right-8'
        } ${isDragging ? 'ring-2 ring-[#9AC31C] shadow-[0_0_60px_rgba(154,195,28,0.7)] scale-[1.02]' : ''}`}
      >
        {/* Barra superior de Mover y Reset */}
        <div className="w-full flex items-center justify-between mb-2 text-zinc-400 text-[10px] tracking-wider uppercase font-semibold border-b border-zinc-800/80 pb-1.5">
          <div className="flex items-center gap-1 text-zinc-400 hover:text-[#9AC31C] transition-colors">
            <Move className="w-3.5 h-3.5 text-[#9AC31C]" />
            <span>Mover QR</span>
          </div>
          {position && (
            <button
              type="button"
              onClick={handleResetPosition}
              title="Restablecer a posición original"
              className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 px-1.5 py-0.5 rounded border border-red-800/50 transition-all cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Smartphone className="w-4 h-4 text-[#9AC31C]" />
          <span className="font-racing text-xs font-black tracking-wider text-[#9AC31C] uppercase">
            ¡Escanea para Girar!
          </span>
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
        </div>

        {/* Código QR Generado */}
        <div className="bg-white p-2.5 rounded-2xl shadow-[0_0_20px_rgba(154,195,28,0.5)] border border-[#9AC31C] mb-2 pointer-events-none">
          <QRCodeSVG
            value={fullQrUrl}
            size={140}
            level="H"
            includeMargin={false}
          />
        </div>

        <p className="text-[11px] text-zinc-300 font-semibold leading-tight">
          Apunta la cámara de tu celular para registrarte y jugar
        </p>
      </div>
    </div>
  );
}
