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
import { Radio, FlaskConical } from 'lucide-react';

const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.') ||
  window.location.hostname.startsWith('10.')
);

const API_URL = isLocal
  ? (import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5500`)
  : (typeof window !== 'undefined' ? window.location.origin : '');

const WS_URL = isLocal
  ? (import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:5500`)
  : (import.meta.env.VITE_WS_URL || '');

const MOBILE_BASE_URL = isLocal
  ? (import.meta.env.VITE_MOBILE_URL || `${window.location.protocol}//${window.location.hostname}:5503/`)
  : (typeof window !== 'undefined' ? `${window.location.origin}/` : 'https://autos.mvevip.com/');

const SCREEN_ID = 'STAND_01';

export default function App() {
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
  const screenQueueRef = useRef([]); // Cola en frontend para asegurar que cada giro espere su turno ordenadamente
  const isProcessingQueueRef = useRef(false);

  prizesRef.current = prizes;
  isSpinningRef.current = isSpinning;
  winnerRef.current = winner;

  const INACTIVITY_FALLBACK_MS = 4 * 60 * 1000; // 4 minutos (240,000 ms)

  const startIdleTimer = (delay = 10000) => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      // Solo regresar al video si nadie está girando, ni en prueba, ni con modal de ganador, ni hay turnos pendientes en cola
      if (!isSpinningRef.current && !isTestSpinning && !winnerRef.current && screenQueueRef.current.length === 0) {
        setShowVideo(true);
        setActivePilot(null);
      }
    }, delay);
  };

  const dismissVideo = () => {
    setShowVideo(false);
    // Iniciar temporizador de inactividad de 4 minutos: si no se gira la ruleta, vuelve al video
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
          // Si no hay más jugadores en cola, iniciar temporizador de inactividad de 10s para el video
          console.log('[Screen] Cola despejada, esperando 10s antes del video attract');
          startIdleTimer(10000);
        }
      } catch (e) {
        console.warn('[Screen] Error solicitando siguiente turno:', e);
        startIdleTimer(10000);
      }
    }, 3500);
  };

  // Cargar lista de premios desde la API
  const fetchPrizes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/prizes`);
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setPrizes(json.data);
      }
    } catch (err) {
      console.warn('Usando premios semilla corporativos:', err.message);
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

    const totalSlices = data.totalSlices || prizes.length || 8;
    const sliceAngle = 360 / totalSlices;
    const targetSliceIndex = data.sliceIndex || 0;

    const targetSliceCenter = (targetSliceIndex * sliceAngle) + (sliceAngle / 2);
    const extraSpins = 360 * 7;
    const newAngle = currentAngleRef.current + extraSpins + (360 - (targetSliceCenter % 360));

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
  const { displayConfig, lastSyncTime } = useRemoteDisplaySync('roulette', socketRef.current);
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
          
          <div className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-2xl w-72 text-center shadow-lg">
            <div className="flex items-center justify-center gap-2 text-xs font-racing text-zinc-400">
              <Radio className={`w-3.5 h-3.5 ${socketConnected ? 'text-[#9AC31C]' : 'text-red-500 animate-pulse'}`} />
              <span>{socketConnected ? 'TELEMETRÍA STAND ACTIVA' : 'CONECTANDO...'}</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 font-mono">
              Sincronización en vivo 0ms
            </p>
          </div>
        </div>

        {/* Centro: Ruleta Rin Deportivo */}
        <div className="flex-1 flex justify-center items-center">
          <AlloyWheel
            prizes={prizes}
            rotationAngle={rotationAngle}
            isSpinning={isSpinning}
            isTestMode={isTestSpinning}
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
        <span>© {new Date().getFullYear()} Marketing VIP - Especialistas en sueños</span>
        <span className="font-racing text-[#9AC31C] font-bold">Feria del Automóvil 2026 • Stand #{SCREEN_ID}</span>
      </footer>

      {/* Video Corporativo en Bucle Persistente (2x2 Metros) */}
      <VideoAttractOverlay
        isVisible={showVideo && !isSpinning && !winner}
        onDismiss={dismissVideo}
        mobileUrl={MOBILE_BASE_URL}
        screenId={SCREEN_ID}
        videoId={displayConfig?.video_url || 'AzQlHkHx6HI'}
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
