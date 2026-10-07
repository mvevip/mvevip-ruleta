import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import AlloyWheel from './components/AlloyWheel';
import Tachometer from './components/Tachometer';
import QRCodeCard from './components/QRCodeCard';
import WinnerOverlay from './components/WinnerOverlay';
import AttractBanner from './components/AttractBanner';
import VideoAttractOverlay from './components/VideoAttractOverlay';
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
  : (typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}` : '');

const MOBILE_BASE_URL = isLocal
  ? (import.meta.env.VITE_MOBILE_URL || `${window.location.protocol}//${window.location.hostname}:5503/`)
  : (typeof window !== 'undefined' ? `${window.location.origin}/` : 'https://autos.mvevip.com/');

const SCREEN_ID = 'STAND_01';

export default function App() {
  const [prizes, setPrizes] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [winner, setWinner] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showVideo, setShowVideo] = useState(true);

  const [isTestSpinning, setIsTestSpinning] = useState(false);

  const socketRef = useRef(null);
  const currentAngleRef = useRef(0);
  const prizesRef = useRef([]);
  const isSpinningRef = useRef(false);
  const lastSpinIdRef = useRef(null);
  const handledTicketsRef = useRef(new Set());
  const idleTimerRef = useRef(null);
  const lastLeadActivityRef = useRef(0);
  const testTimerRef = useRef(null);

  prizesRef.current = prizes;
  isSpinningRef.current = isSpinning;

  const INACTIVITY_FALLBACK_MS = 4 * 60 * 1000; // 4 minutos (240,000 ms)

  const startIdleTimer = (delay = 5000) => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      if (!isSpinningRef.current && !isTestSpinning) {
        setShowVideo(true);
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
    setWinner(null);
    // Esperar 5 segundos mostrando la ruleta y el resultado antes de volver al video
    startIdleTimer(5000);
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

  // 1. WebSockets en tiempo real
  useEffect(() => {
    const socket = io(WS_URL, {
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
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
      if (!isSubscribed || isSpinningRef.current) return;
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

  const handleTriggerSpin = (data) => {
    if (isSpinningRef.current) return;
    if (data.ticketCode && handledTicketsRef.current.has(data.ticketCode)) return;
    if (data.ticketCode) handledTicketsRef.current.add(data.ticketCode);

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
    setIsSpinning(true);
    setWinner(null);

    const totalSlices = data.totalSlices || prizes.length || 8;
    const sliceAngle = 360 / totalSlices;
    const targetSliceIndex = data.sliceIndex || 0;

    const targetSliceCenter = (targetSliceIndex * sliceAngle) + (sliceAngle / 2);
    const extraSpins = 360 * 7;
    const newAngle = currentAngleRef.current + extraSpins + (360 - (targetSliceCenter % 360));

    currentAngleRef.current = newAngle;
    setRotationAngle(newAngle);

    setTimeout(() => {
      setIsSpinning(false);

      setWinner({
        leadName: data.leadName,
        prize: data.prize,
        ticketCode: data.ticketCode,
        destination: data.destination
      });

      if (socketRef.current) {
        socketRef.current.emit('SPIN_COMPLETED', {
          screenId: SCREEN_ID,
          ticketCode: data.ticketCode
        });
      }
    }, 6000);
  };

  return (
    <div className="min-h-screen w-screen carbon-bg text-white flex flex-col justify-between overflow-hidden select-none relative">
      <AttractBanner />

      <div className="flex-1 flex items-center justify-between px-6 lg:px-12 py-4 max-w-[1920px] mx-auto w-full">
        {/* Panel Izquierdo: Telemetría de Carreras */}
        <div className="flex flex-col items-center gap-4">
          <Tachometer isSpinning={isSpinning} isTestMode={isTestSpinning} />
          
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
