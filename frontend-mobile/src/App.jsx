import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Header from './components/Header';
import LeadForm from './components/LeadForm';
import EngineStartButton from './components/EngineStartButton';
import SpinningProgress from './components/SpinningProgress';
import PrizeVoucher from './components/PrizeVoucher';
import QueueWaitingProgress from './components/QueueWaitingProgress';
import { mobileAudio } from './utils/mobileSound';
import { ShieldCheck, AlertTriangle, Info } from 'lucide-react';

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

import TurnstileWidget from './components/TurnstileWidget';

// Obtener o generar identificador único de sesión/dispositivo aislado
function getOrCreateDeviceId() {
  try {
    let id = sessionStorage.getItem('vip_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
      sessionStorage.setItem('vip_device_id', id);
    }
    return id;
  } catch (e) {
    return 'temp_' + Date.now();
  }
}

export default function App() {
  const queryParams = new URLSearchParams(window.location.search);
  const screenId = queryParams.get('screen') || 'STAND_01';

  const [gameState, setGameState] = useState('FORM'); // 'FORM' | 'WAITING_QUEUE' | 'SPINNING' | 'WON'
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    accept_privacy: true,
    dream_destination: ''
  });
  const [destinations, setDestinations] = useState([]);
  const [errors, setErrors] = useState({});
  const [spinResult, setSpinResult] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [alreadyPlayedNotice, setAlreadyPlayedNotice] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queueInfo, setQueueInfo] = useState({ queueId: null, position: 1, ticketCode: null });

  const socketRef = useRef(null);
  const deviceIdRef = useRef(getOrCreateDeviceId());
  const queuePollingRef = useRef(null);
  const queueTicketCodeRef = useRef(null);
  const isTriggeringTurnRef = useRef(false);

  // Cargar lista de destinos activos desde la API
  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const res = await fetch(`${API_URL}/api/destinations`);
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          setDestinations(json.data);
          const defaultDest = json.data.find(d => d.is_default);
          if (defaultDest) {
            setFormData(prev => ({
              ...prev,
              dream_destination: prev.dream_destination || defaultDest.name
            }));
          }
        }
      } catch (e) {
        console.warn('Error cargando destinos:', e);
      }
    };
    fetchDestinations();
  }, []);

  // Notificar al stand que un usuario escaneó el QR / abrió la app
  const pingScreenActivity = () => {
    try {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('USER_ENGAGED', { screenId });
      }
      fetch(`${API_URL}/api/screen/activity?screen_id=${screenId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {});
    } catch (e) {}
  };

  useEffect(() => {
    pingScreenActivity();
  }, [screenId]);

  useEffect(() => {
    const socket = io(WS_URL, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Mobile] Conectado a socket:', socket.id);
      socket.emit('JOIN_ROOM', { screenId, role: 'mobile' });
      socket.emit('USER_ENGAGED', { screenId });
    });

    // Evento en tiempo real: ¡Es tu turno de acelerar en la pantalla!
    socket.on('QUEUE_YOUR_TURN', (data) => {
      console.log('[Mobile] Evento QUEUE_YOUR_TURN recibido:', data?.ticketCode, 'esperando:', queueTicketCodeRef.current);
      if (data && data.ticketCode && queueTicketCodeRef.current && data.ticketCode === queueTicketCodeRef.current) {
        console.log('[Mobile] ¡Coincidencia de ticket! Arrancando turno...');
        triggerPlayerTurn();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [screenId]);

  // Transición a disparo de turno: Vibración táctil doble + inicio de ruleta
  const triggerPlayerTurn = () => {
    if (isTriggeringTurnRef.current) return;
    isTriggeringTurnRef.current = true;

    if (queuePollingRef.current) {
      clearInterval(queuePollingRef.current);
      queuePollingRef.current = null;
    }

    // Vibración táctil doble para alertar al usuario que mire la gran pantalla
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 300]);
      }
    } catch (e) {}

    setGameState('SPINNING');
    setIsSubmitting(false);

    // Duración de giro en sincronía con la pantalla: 8 segundos
    setTimeout(() => {
      setGameState('WON');
    }, 8000);
  };

  // Polling de cola de respaldo cada 1.5s en caso de que el socket esté reconectando
  useEffect(() => {
    if (gameState === 'WAITING_QUEUE' && queueInfo.queueId) {
      queuePollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/api/spin/queue/status?queue_id=${queueInfo.queueId}&screen_id=${screenId}`);
          if (!res.ok) return;
          const json = await res.json();
          if (json.success && json.data) {
            const { status, position } = json.data;
            if (status === 'SPINNING') {
              console.log('[Mobile Polling] El backend indica que nuestro turno comenzó!');
              triggerPlayerTurn();
            } else if (status === 'COMPLETED') {
              setGameState('WON');
              if (queuePollingRef.current) clearInterval(queuePollingRef.current);
            } else if (status === 'WAITING') {
              setQueueInfo(prev => ({ ...prev, position }));
            }
          }
        } catch (err) {}
      }, 1500);
    } else {
      if (queuePollingRef.current) {
        clearInterval(queuePollingRef.current);
        queuePollingRef.current = null;
      }
    }

    return () => {
      if (queuePollingRef.current) {
        clearInterval(queuePollingRef.current);
        queuePollingRef.current = null;
      }
    };
  }, [gameState, queueInfo.queueId, screenId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
    pingScreenActivity();
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim() || formData.name.trim().length < 3) {
      newErrors.name = 'Por favor ingresa tu nombre y apellido completos.';
    }

    // Validación estricta celular Ecuador: 10 dígitos iniciando con 09
    const ecuadorRegex = /^09\d{8}$/;
    if (!formData.phone || !ecuadorRegex.test(formData.phone)) {
      newErrors.phone = 'Ingresa un número de celular de Ecuador válido (10 dígitos iniciando con 09, ej: 0991234567).';
    }

    // Validación email RFC
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!formData.email || !emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Ingresa un correo electrónico válido (ej: usuario@gmail.com).';
    }

    // Validación obligatoria: aceptación de políticas de privacidad
    if (!formData.accept_privacy) {
      newErrors.accept_privacy = 'Debes aceptar las políticas de privacidad para participar.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStartSpin = async () => {
    if (isSubmitting) return;

    if (!validate()) {
      setApiError('Por favor revisa los campos obligatorios en rojo.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Si hay llave de Turnstile configurada pero aún no se ha obtenido el token
    if (import.meta.env.VITE_TURNSTILE_SITE_KEY && !turnstileToken) {
      setApiError('Por favor verifica el comprobante anti-bot antes de continuar.');
      return;
    }

    setApiError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/spin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          screen_id: screenId,
          device_id: deviceIdRef.current,
          turnstile_token: turnstileToken || 'BYPASS_DEV'
        })
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Error al procesar el tiro');
      }

      // CASO 1: Si ya jugó previamente y tiene premio asignado
      if (json.already_played) {
        setAlreadyPlayedNotice(true);
        setSpinResult(json.data);
        setIsSubmitting(false);
        // Mostrar directamente su premio sin girar la ruleta
        setGameState('WON');
        return;
      }

      // CASO 2: Entró a la COLA de espera porque la ruleta está ocupada
      if (json.in_queue) {
        setAlreadyPlayedNotice(false);
        setSpinResult(json.data);
        const ticket = json.data?.ticketCode;
        queueTicketCodeRef.current = ticket;
        setQueueInfo({
          queueId: json.queue_id,
          position: json.queue_position || 1,
          ticketCode: ticket
        });
        setGameState('WAITING_QUEUE');
        setIsSubmitting(false);
        return;
      }

      // CASO 3: Primer tiro válido sin cola -> Sincronizar giro inmediato de 8 segundos
      setAlreadyPlayedNotice(false);
      setGameState('SPINNING');
      setSpinResult(json.data);

      setTimeout(() => {
        setIsSubmitting(false);
        setGameState('WON');
      }, 8000);

    } catch (err) {
      console.error('Error enviando tiro:', err);
      setIsSubmitting(false);
      setApiError(err.message || 'No pudimos conectar con el stand. Intenta de nuevo.');
      setGameState('FORM');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 via-zinc-200 to-zinc-300 text-zinc-900 flex flex-col justify-between">
      <Header />

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-5 flex flex-col justify-center">
        {gameState === 'FORM' && (
          <div className="bg-white/95 border border-zinc-200/80 rounded-3xl p-5 shadow-xl shadow-zinc-400/20 backdrop-blur-md flex flex-col items-center">
            {apiError && (
              <div className="w-full mb-3 p-3 rounded-xl bg-red-50 border border-red-300 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            <LeadForm
              formData={formData}
              onChange={handleInputChange}
              errors={errors}
              destinations={destinations}
            />

            <div className="my-2 w-full flex justify-center">
              <TurnstileWidget
                onVerify={(token) => {
                  setTurnstileToken(token);
                  setApiError(null);
                }}
                onError={() => setTurnstileToken(null)}
              />
            </div>

            {/* Alerta de Error Adicional cerca al botón Engine Start */}
            {apiError && (
              <div className="w-full my-2 p-3 rounded-xl bg-red-50 border border-red-300 text-red-700 text-xs flex items-center gap-2 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            <EngineStartButton
              onClick={handleStartSpin}
              disabled={isSubmitting}
              loading={isSubmitting}
            />

            <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] mt-1 text-center font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Stand #{screenId} • Solo 1 participación por persona</span>
            </div>
          </div>
        )}

        {gameState === 'WAITING_QUEUE' && (
          <div className="bg-white/95 border border-zinc-200/80 rounded-3xl p-4 shadow-xl shadow-zinc-400/20 backdrop-blur-md">
            <QueueWaitingProgress
              queuePosition={queueInfo.position}
              leadName={formData.name}
            />
          </div>
        )}

        {gameState === 'SPINNING' && (
          <div className="bg-white/95 border border-zinc-200/80 rounded-3xl p-4 shadow-xl shadow-zinc-400/20 backdrop-blur-md">
            <SpinningProgress />
          </div>
        )}

        {gameState === 'WON' && spinResult && (
          <div className="flex flex-col items-center">
            {alreadyPlayedNotice && (
              <div className="w-full mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-800 text-xs flex items-center gap-2 shadow-sm">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>¡Ya registraste tu tiro con este contacto! Aquí tienes tu pase para canjear en el stand.</span>
              </div>
            )}
            <PrizeVoucher result={spinResult} />
          </div>
        )}
      </main>

      <footer className="w-full py-2.5 px-4 bg-white/80 border-t border-zinc-300 text-center text-[10px] text-zinc-500 font-sans">
        Marketing VIP • Especialistas en sueños • Stand Feria Automotriz 2026
      </footer>
    </div>
  );
}
