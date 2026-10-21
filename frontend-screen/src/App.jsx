import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import AlloyWheel from './components/AlloyWheel';
import Tachometer from './components/Tachometer';
import QRCodeCard from './components/QRCodeCard';
import WinnerOverlay from './components/WinnerOverlay';
import AttractBanner from './components/AttractBanner';
import VideoAttractOverlay from './components/VideoAttractOverlay';
import DisplayQRView from './components/DisplayQRView';
import DisplaySliderView from './components/DisplaySliderView';
import DisplayComboView from './components/DisplayComboView';
import useRemoteDisplaySync from './hooks/useRemoteDisplaySync';
import { getScreenBrandConfig } from './brand';
import { Radio, FlaskConical } from 'lucide-react';

const isProduction = typeof window !== 'undefined' && (
  window.location.hostname === 'autos.mvevip.com' ||
  window.location.hostname.endsWith('.mvevip.com')
);

const API_URL = isProduction
  ? (typeof window !== 'undefined' ? window.location.origin : '')
  : (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5500` : 'http://localhost:5500');

const WS_URL = isProduction
  ? (import.meta.env.VITE_WS_URL || '')
  : (typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:5500` : 'ws://localhost:5500');

const BRAND_CONFIG = getScreenBrandConfig();
const MOBILE_BASE_URL = BRAND_CONFIG.mobileUrl;
const SCREEN_ID = BRAND_CONFIG.screenId;

export default function App() {
  const brand = BRAND_CONFIG;
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window === 'undefined') return 'roulette';
    const path = window.location.pathname.toLowerCase();
    const search = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();
    const mode = search.get('view') || search.get('mode') || '';

    if (mode === 'qr' || path.endsWith('/qr') || hash.includes('/qr')) return 'qr';
    if (mode === 'slider' || path.endsWith('/slider') || hash.includes('/slider')) return 'slider';
    if (mode === 'combo' || path.endsWith('/combo') || hash.includes('/combo')) return 'combo';
    return 'roulette';
  });

  const [prizes, setPrizes] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [winner, setWinner] = useState(null);
  const [activePilot, setActivePilot] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showVideo, setShowVideo] = useState(true);

  const [isTestSpinning, setIsTestSpinning] = useState(false);

  // Escuchar cambios de URL en navegador
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase();
      const search = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase();
      const mode = search.get('view') || search.get('mode') || '';

      if (mode === 'qr' || path.endsWith('/qr') || hash.includes('/qr')) setCurrentView('qr');
      else if (mode === 'slider' || path.endsWith('/slider') || hash.includes('/slider')) setCurrentView('slider');
      else if (mode === 'combo' || path.endsWith('/combo') || hash.includes('/combo')) setCurrentView('combo');
      else setCurrentView('roulette');
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const socketRef = useRef(null);
  const currentAngleRef = useRef(0);
  const prizesRef = useRef([]);
  const isSpinningRef = useRef(false);
  const lastSpinIdRef = useRef(null);
  const handledTicketsRef = useRef(new Set());
  const idleTimerRef = useRef(null);
  const lastLeadActivityRef = useRef(0);
  const testTimerRef = useRef(null);
  const lastHandledTicketCodeRef = useRef(null);
  const winnerRef = useRef(null);
  const isTestSpinningRef = useRef(false);
  const screenQueueRef = useRef([]); // Cola en frontend para asegurar que cada giro espere su turno ordenadamente
  const isProcessingQueueRef = useRef(false);

  prizesRef.current = prizes;
  isSpinningRef.current = isSpinning;
  winnerRef.current = winner;
  isTestSpinningRef.current = isTestSpinning;

  const ROULETTE_PAUSE_MS = 20 * 1000; // 20 segundos mostrando la ruleta antes de volver al video
  const INACTIVITY_FALLBACK_MS = 4 * 60 * 1000; // 4 minutos de margen cuando un participante está llenando el formulario móvil

  const startIdleTimer = (delay = ROULETTE_PAUSE_MS) => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      // Solo regresar al video si nadie está girando, ni en prueba, ni con modal de ganador, ni hay turnos pendientes en cola
      if (!isSpinningRef.current && !isTestSpinningRef.current && !winnerRef.current && screenQueueRef.current.length === 0) {
        setShowVideo(true);
        setActivePilot(null);
      }
    }, delay);
  };

  // Pausa de 20 segundos mostrando la ruleta (al terminar el video o cerrar manualmente)
  const handleVideoPauseToRoulette = () => {
    setShowVideo(false);
    startIdleTimer(ROULETTE_PAUSE_MS);
  };

  // Despertar pantalla cuando un usuario real interactúa en el móvil
  const dismissVideo = () => {
    setShowVideo(false);
    startIdleTimer(INACTIVITY_FALLBACK_MS);
  };

  // Modo Prueba: Gira la ruleta y mueve odómetro dinámicamente por 1 minuto
  const handleToggleTestSpin = () => {
    if (isTestSpinning) {
      if (testTimerRef.current) {
        clearTimeout(testTimerRef.current);
        testTimerRef.current = null;
      }
      setIsTestSpinning(false);
      setShowVideo(true);
      return;
    }

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    setIsTestSpinning(true);

    testTimerRef.current = setTimeout(() => {
      setIsTestSpinning(false);
      testTimerRef.current = null;
      setShowVideo(true); // Tras 1 minuto completo regresa el video
    }, 60000);
  };

  const handleCloseWinner = () => {
    const finishedTicket = lastHandledTicketCodeRef.current;
    console.log('[Screen] Cerrando modal de ganador para ticket:', finishedTicket);
    setWinner(null);
    winnerRef.current = null;
    isProcessingQueueRef.current = true;

    // Pausa deportiva de 3.5 segundos con el stand despejado antes de que el siguiente jugador arranque
    setTimeout(async () => {
      isProcessingQueueRef.current = false;

      // 1. Notificar socket sobre giro finalizado
      if (socketRef.current) {
        socketRef.current.emit('SPIN_COMPLETED', {
          screenId: SCREEN_ID,
          ticketCode: finishedTicket
        });
      }

      // 2. Si había giros acumulados en la cola local de la pantalla (caso borde)
      if (screenQueueRef.current.length > 0) {
        const nextLocalItem = screenQueueRef.current.shift();
        console.log('[Screen] Procesando turno local encolado:', nextLocalItem?.leadName);
        executeSpin(nextLocalItem);
        // Sincronizar finalización en base de datos en segundo plano
        try {
          fetch(`${API_URL}/api/spin/queue/next`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ screen_id: SCREEN_ID, ticket_code: finishedTicket })
          }).catch(() => {});
        } catch (e) {}
        return;
      }

      // 3. Notificar al backend para que despache al siguiente participante en la cola global
      try {
        const res = await fetch(`${API_URL}/api/spin/queue/next`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ screen_id: SCREEN_ID, ticket_code: finishedTicket })
        });
        const json = await res.json();
        // Si hay un siguiente jugador despachado y aún no fue tomado por socket
        if (json.next) {
          console.log('[Screen] Siguiente participante despachado por backend:', json.next.leadName);
          handleTriggerSpin(json.next);
        } else {
          // Si no hay más jugadores en cola, mostrar la ruleta por 20s antes de volver al video
          console.log('[Screen] Cola despejada, mostrando ruleta 20s antes de volver al video');
          startIdleTimer(ROULETTE_PAUSE_MS);
        }
      } catch (e) {
        console.warn('[Screen] Error solicitando siguiente turno:', e);
        startIdleTimer(ROULETTE_PAUSE_MS);
      }
    }, 3500);
  };

  // Cargar lista de premios desde la API para el stand actual
  const fetchPrizes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/prizes?stand=${encodeURIComponent(brand.stand)}`);
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setPrizes(json.data);
      }
    } catch (err) {
      console.warn('Usando premios semilla corporativos:', err.message);
      if (brand.isFord) {
        setPrizes([
          { id: 101, name: 'Gorra Oficial Ford', color_hex: '#212650', text_color: '#FFFFFF', description: 'Gorra oficial Ford | Quito Motors' },
          { id: 102, name: 'Termo Ford Performance', color_hex: '#FFFFFF', text_color: '#212650', description: 'Termo deportivo edición Ford' },
          { id: 103, name: 'Llavero Metálico Ford', color_hex: '#212650', text_color: '#FFFFFF', description: 'Llavero metálico coleccionable Ford' },
          { id: 104, name: 'Bono Accesorios Ford', color_hex: '#FFFFFF', text_color: '#212650', description: 'Bono especial para accesorios originales' },
          { id: 105, name: 'Camiseta Oficial Ford', color_hex: '#212650', text_color: '#FFFFFF', description: 'Camiseta edición feria Quito Motors' },
          { id: 106, name: 'Kit Souvenir Ford', color_hex: '#FFFFFF', text_color: '#212650', description: 'Kit oficial de souvenirs Ford' },
        ]);
      } else {
        setPrizes([
          { id: 1, name: 'Gorra Oficial VIP', color_hex: '#9AC31C', text_color: '#000', description: 'Gorra oficial Marketing VIP' },
          { id: 2, name: 'Bono $100 Paquetes', color_hex: '#18181B', text_color: '#fff', description: 'Bono de $100 en viajes' },
          { id: 3, name: 'Termo Deportivo', color_hex: '#9AC31C', text_color: '#000', description: 'Termo térmico para viajes' },
          { id: 4, name: 'Bono $200 Vuelos', color_hex: '#27272A', text_color: '#fff', description: 'Bono aplicable en vuelos' },
          { id: 5, name: 'Maleta de Mano', color_hex: '#9AC31C', text_color: '#000', description: 'Maleta de mano cabina' },
          { id: 6, name: 'Upgrade All-Inclusive', color_hex: '#18181B', text_color: '#fff', description: 'Categoría All-Inclusive Luxury' },
          { id: 7, name: 'Vuelo 2x1 Caribe', color_hex: '#27272A', text_color: '#fff', description: 'Segunda persona gratis a Cancún' },
          { id: 8, name: 'Noche Cancún Resort', color_hex: '#9AC31C', text_color: '#000', description: '1 noche en resort 5 estrellas' },
        ]);
      }
    }
  };

  useEffect(() => {
    fetchPrizes();
  }, []);

  // 1. WebSockets en tiempo real (solo para la ruleta principal y si hay servidor WS configurado)
  useEffect(() => {
    if (currentView !== 'roulette' || !WS_URL) {
      return;
    }

    const socket = io(WS_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 2,
      reconnectionDelay: 5000,
      timeout: 3000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Pantalla] Conectada al servidor WebSocket:', socket.id);
      setSocketConnected(true);
      socket.emit('JOIN_ROOM', { screenId: SCREEN_ID, role: 'screen' });
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Despertar la pantalla al detectar conexión de móvil o inicio de registro
    socket.on('USER_CONNECTED', () => {
      console.log('[Pantalla] Usuario conectado en móvil -> Mostrando ruleta');
      dismissVideo();
    });

    socket.on('USER_ENGAGED', () => {
      console.log('[Pantalla] Interacción de usuario en móvil -> Mostrando ruleta');
      dismissVideo();
    });

    socket.on('DRIVER_READY', () => {
      dismissVideo();
    });

    socket.on('TRIGGER_SPIN', (data) => {
      console.log('[Pantalla] Disparo de giro recibido por socket:', data);
      dismissVideo();
      handleTriggerSpin(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 2. Polling ultra ligero de sincronización en tiempo real (1s)
  useEffect(() => {
    let isSubscribed = true;

    // Al montar la pantalla, determinar el estado previo
    const initLatest = async () => {
      try {
        const res = await fetch(`${API_URL}/api/spin/latest?screen_id=${SCREEN_ID}`);
        const json = await res.json();
        if (json.success && json.data) {
          lastSpinIdRef.current = json.data.id;
          // Si el tiro ocurrió hace más de 15 segundos, marcarlo como ya visto
          const ageMs = Date.now() - new Date(json.data.created_at).getTime();
          if (ageMs > 15000) {
            handledTicketsRef.current.add(json.data.ticket_code);
          }
        } else {
          lastSpinIdRef.current = 0;
        }
      } catch (e) {
        lastSpinIdRef.current = 0;
      }
    };
    initLatest();

    const interval = setInterval(async () => {
      if (!isSubscribed || isSpinningRef.current || winnerRef.current || isProcessingQueueRef.current) return;
      try {
        const res = await fetch(`${API_URL}/api/spin/latest?screen_id=${SCREEN_ID}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.success) {
          setSocketConnected(true);

          // Si el lead está activo en el móvil (escaneó o escribe), despertar pantalla
          if (json.lastActivityAt && json.lastActivityAt > lastLeadActivityRef.current) {
            const ageActivity = Date.now() - json.lastActivityAt;
            lastLeadActivityRef.current = json.lastActivityAt;
            if (ageActivity < 25000) {
              dismissVideo();
            }
          }

          if (json.data && json.data.id) {
            const spin = json.data;
            const isNewSpin = (lastSpinIdRef.current === null)
              ? (Date.now() - new Date(spin.created_at).getTime() < 20000)
              : (spin.id > lastSpinIdRef.current);

            if (isNewSpin && !handledTicketsRef.current.has(spin.ticket_code)) {
              lastSpinIdRef.current = spin.id;
              console.log('[Pantalla] ¡Nuevo giro recibido en vivo!', spin);
              dismissVideo();

              const currentPrizes = prizesRef.current.length > 0 ? prizesRef.current : prizes;
              const sliceIndex = currentPrizes.findIndex(p => p.id === spin.prize_id);

              handleTriggerSpin({
                leadName: spin.leadName,
                prize: {
                  id: spin.prize_id,
                  name: spin.prize_name,
                  color_hex: spin.color_hex,
                  text_color: spin.text_color,
                  category: spin.category,
                  description: spin.description
                },
                sliceIndex: sliceIndex >= 0 ? sliceIndex : 0,
                totalSlices: currentPrizes.length || 8,
                ticketCode: spin.ticket_code,
                destination: spin.destination
              });
            } else {
              if (lastSpinIdRef.current === null || spin.id > lastSpinIdRef.current) {
                lastSpinIdRef.current = spin.id;
              }
            }
          }
        }
      } catch (err) {}
    }, 1000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, []);

  // Ejecutar el giro real de ruleta para un participante específico
  const executeSpin = (data) => {
    isSpinningRef.current = true;
    setIsSpinning(true);
    setWinner(null);
    lastHandledTicketCodeRef.current = data.ticketCode;

    // Asignar el piloto activo para mostrar en la cápsula bajo el velocímetro
    setActivePilot({
      name: data.leadName,
      destination: data.destination
    });

    const currentPrizes = prizesRef.current.length > 0 ? prizesRef.current : prizes;
    const totalSlices = currentPrizes.length || data.totalSlices || 8;
    const sliceAngle = 360 / totalSlices;

    // Encontrar índice exacto del premio ganador dentro de la lista de premios actual de la pantalla
    let targetSliceIndex = data.sliceIndex;
    if (data.prize?.id && currentPrizes.length > 0) {
      const foundIdx = currentPrizes.findIndex(p => p.id === data.prize.id);
      if (foundIdx >= 0) {
        targetSliceIndex = foundIdx;
      }
    }
    if (typeof targetSliceIndex !== 'number' || targetSliceIndex < 0) {
      targetSliceIndex = 0;
    }

    // El centro del sector ganador medido en grados desde las 12:00 en sentido horario
    const targetSliceCenter = (targetSliceIndex * sliceAngle) + (sliceAngle / 2);

    // Ángulo absoluto (módulo 360) donde la ruleta debe terminar para que el centro del sector quede bajo la aguja (12:00)
    const targetModAngle = (360 - (targetSliceCenter % 360)) % 360;

    // Ángulo actual de la ruleta módulo 360
    const currentModAngle = currentAngleRef.current % 360;

    // Diferencia angular en sentido horario para alcanzar el ángulo objetivo
    let deltaAngle = (targetModAngle - currentModAngle) % 360;
    if (deltaAngle < 0) {
      deltaAngle += 360;
    }
    if (deltaAngle === 0) {
      deltaAngle = 360;
    }

    const extraSpins = 360 * 7;
    const newAngle = currentAngleRef.current + extraSpins + deltaAngle;

    currentAngleRef.current = newAngle;
    setRotationAngle(newAngle);

    setTimeout(() => {
      isSpinningRef.current = false;
      setIsSpinning(false);

      setWinner({
        leadName: data.leadName,
        prize: data.prize,
        ticketCode: data.ticketCode,
        destination: data.destination
      });
    }, 8000);
  };

  // Procesar cola interna de la pantalla
  const processNextInScreenQueue = () => {
    if (isSpinningRef.current || winnerRef.current || isProcessingQueueRef.current) return;
    if (screenQueueRef.current.length === 0) return;

    isProcessingQueueRef.current = true;
    const nextItem = screenQueueRef.current.shift();

    // Pausa deportiva de 3.5 segundos entre jugadores para que la pantalla respire antes de acelerar
    setTimeout(() => {
      isProcessingQueueRef.current = false;
      executeSpin(nextItem);
    }, 3500);
  };

  const handleTriggerSpin = (data) => {
    if (!data || !data.ticketCode) return;
    if (handledTicketsRef.current.has(data.ticketCode)) return;
    handledTicketsRef.current.add(data.ticketCode);

    if (testTimerRef.current) {
      clearTimeout(testTimerRef.current);
      testTimerRef.current = null;
    }
    setIsTestSpinning(false);

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    setShowVideo(false);

    // Si la ruleta está actualmente girando, celebrando un ganador o en pausa intermedia:
    if (isSpinningRef.current || winnerRef.current || isProcessingQueueRef.current) {
      console.log('[Pantalla] La ruleta está ocupada. Encolando tiro para:', data.leadName);
      screenQueueRef.current.push(data);
      return;
    }

    // Si la pantalla está totalmente libre, ejecutar inmediatamente
    executeSpin(data);
  };

  // Sincronización remota para actualizar premios automáticamente cuando el admin los modifica
  const { displayConfig, isConfigLoaded, lastSyncTime } = useRemoteDisplaySync('roulette', socketRef.current);
  const wheelScaleX = (displayConfig?.wheel_scale_x ? Number(displayConfig.wheel_scale_x) : 100) / 100;
  const wheelFontSize = displayConfig?.wheel_font_size ? Number(displayConfig.wheel_font_size) : 100;

  useEffect(() => {
    if (lastSyncTime) {
      fetchPrizes();
    }
  }, [lastSyncTime]);

  // Vistas dedicadas de Cartelería Digital
  if (currentView === 'qr') {
    return <DisplayQRView mobileUrl={MOBILE_BASE_URL} screenId={SCREEN_ID} />;
  }

  if (currentView === 'slider') {
    return <DisplaySliderView />;
  }

  if (currentView === 'combo') {
    return <DisplayComboView mobileUrl={MOBILE_BASE_URL} screenId={SCREEN_ID} />;
  }

  return (
    <div className="min-h-screen w-screen carbon-bg text-white flex flex-col justify-between overflow-hidden select-none relative">
      <AttractBanner />

      <div className="flex-1 flex items-center justify-between px-6 lg:px-12 py-4 max-w-[1920px] mx-auto w-full">
        {/* Panel Izquierdo: Telemetría de Carreras */}
        <div className="flex flex-col items-center gap-4">
          <Tachometer
            isSpinning={isSpinning}
            isTestMode={isTestSpinning}
            currentPilot={activePilot}
          />
          
          <div className={`${brand.isFord ? 'bg-white border-2 border-[#212650]/30 text-[#212650]' : 'bg-zinc-900/90 border border-zinc-800'} p-3 rounded-2xl w-72 text-center shadow-lg`}>
            <div className={`flex items-center justify-center gap-2 text-xs font-racing ${brand.isFord ? 'text-[#212650] font-bold' : 'text-zinc-400'}`}>
              <Radio className={`w-3.5 h-3.5 ${socketConnected ? (brand.isFord ? 'text-[#212650]' : 'text-[#9AC31C]') : 'text-red-500 animate-pulse'}`} />
              <span>{socketConnected ? 'TELEMETRÍA STAND ACTIVA' : 'CONECTANDO...'}</span>
            </div>
            <p className={`text-[11px] mt-1 font-mono ${brand.isFord ? 'text-[#212650]/70' : 'text-zinc-400'}`}>
              Sincronización en vivo 0ms
            </p>
          </div>
        </div>

        {/* Centro: Ruleta Rin Deportivo */}
        <div className="flex-1 flex justify-center items-center overflow-visible">
          <AlloyWheel
            prizes={prizes}
            rotationAngle={rotationAngle}
            isSpinning={isSpinning}
            isTestMode={isTestSpinning}
            wheelScaleX={wheelScaleX}
            wheelFontSize={wheelFontSize}
          />
        </div>

        {/* Panel Derecho: Tarjeta QR Dinámico */}
        <div className="flex flex-col items-center gap-4">
          <QRCodeCard
            mobileUrl={MOBILE_BASE_URL}
            screenId={SCREEN_ID}
          />
        </div>
      </div>

      <footer className="w-full py-2.5 px-8 bg-zinc-950/80 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-400 font-sans">
        <span>© {new Date().getFullYear()} {brand.name} — {brand.tagline}</span>
        <span className="font-racing text-[#9AC31C] font-bold flex items-center gap-2">
          <span>Feria del Automóvil 2026 • Stand #{SCREEN_ID}</span>
          {!isProduction && (
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded font-mono font-bold tracking-wider animate-pulse">
              [ENTORNO LOCAL 💻]
            </span>
          )}
        </span>
      </footer>

      {/* Video Corporativo en Bucle Persistente (100% Pantalla + Pausa 20s a Ruleta) */}
      <VideoAttractOverlay
        isVisible={showVideo && !isSpinning && !winner}
        onDismiss={handleVideoPauseToRoulette}
        onVideoEnded={handleVideoPauseToRoulette}
        mobileUrl={MOBILE_BASE_URL}
        screenId={SCREEN_ID}
        videoId={displayConfig?.video_url || 'AzQlHkHx6HI'}
        isConfigLoaded={isConfigLoaded}
        logoScale={displayConfig?.video_logo_scale ? Number(displayConfig.video_logo_scale) : 100}
        showLogo={Boolean(displayConfig?.video_logo_visible)}
      />

      {/* Botón Flotante Discreto de Modo Prueba (Giro de 1 Minuto) */}
      {!showVideo && !winner && (
        <button
          type="button"
          onClick={handleToggleTestSpin}
          className={`fixed bottom-4 right-4 z-30 w-9 h-9 rounded-full bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/80 flex items-center justify-center transition-all cursor-pointer shadow-lg backdrop-blur-sm active:scale-95 ${
            isTestSpinning ? 'text-[#9AC31C] border-[#9AC31C]/40 animate-pulse' : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title={isTestSpinning ? 'Detener prueba (Giro de 1 min activo)' : 'Modo prueba (Giro de 1 minuto)'}
        >
          <FlaskConical className="w-4 h-4" />
        </button>
      )}

      {/* Modal de Ganador con Cierre Automático (10s) */}
      {winner && (
        <WinnerOverlay
          winnerData={winner}
          onClose={handleCloseWinner}
        />
      )}
    </div>
  );
}
