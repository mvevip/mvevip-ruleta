import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Header from './components/Header';
import LeadForm from './components/LeadForm';
import EngineStartButton from './components/EngineStartButton';
import SpinningProgress from './components/SpinningProgress';
import PrizeVoucher from './components/PrizeVoucher';
import { ShieldCheck, AlertTriangle, Info } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : (window.location.port && ['5500', '5501', '5502', '5503', '5504'].includes(window.location.port))
    ? `${window.location.protocol}//${window.location.hostname}:5500`
    : window.location.origin;

const WS_URL = import.meta.env.VITE_WS_URL
  ? import.meta.env.VITE_WS_URL
  : (window.location.port && ['5500', '5501', '5502', '5503', '5504'].includes(window.location.port))
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:5500`
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}`;

// Obtener o generar identificador único de dispositivo persistente
function getOrCreateDeviceId() {
  try {
    let id = localStorage.getItem('vip_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
      localStorage.setItem('vip_device_id', id);
    }
    return id;
  } catch (e) {
    return 'temp_' + Date.now();
  }
}

export default function App() {
  const queryParams = new URLSearchParams(window.location.search);
  const screenId = queryParams.get('screen') || 'STAND_01';

  const [gameState, setGameState] = useState('FORM'); // 'FORM' | 'SPINNING' | 'WON'
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    dream_destination: '🌴 Cancún'
  });
  const [errors, setErrors] = useState({});
  const [spinResult, setSpinResult] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [alreadyPlayedNotice, setAlreadyPlayedNotice] = useState(false);

  const socketRef = useRef(null);
  const deviceIdRef = useRef(getOrCreateDeviceId());

  useEffect(() => {
    const socket = io(WS_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Mobile] Conectado a socket:', socket.id);
      socket.emit('JOIN_ROOM', { screenId, role: 'mobile' });
    });

    return () => {
      socket.disconnect();
    };
  }, [screenId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStartSpin = async () => {
    if (!validate()) return;
    setApiError(null);

    try {
      const response = await fetch(`${API_URL}/api/spin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          screen_id: screenId,
          device_id: deviceIdRef.current
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
        // Mostrar directamente su premio sin girar la ruleta
        setGameState('WON');
        return;
      }

      // CASO 2: Primer tiro válido -> Sincronizar giro con pantalla gigante
      setAlreadyPlayedNotice(false);
      setGameState('SPINNING');
      setSpinResult(json.data);

      setTimeout(() => {
        setGameState('WON');
      }, 6000);

    } catch (err) {
      console.error('Error enviando tiro:', err);
      setApiError(err.message || 'No pudimos conectar con el stand. Intenta de nuevo.');
      setGameState('FORM');
    }
  };

  return (
    <div className="min-h-screen carbon-bg text-white flex flex-col justify-between">
      <Header />

      <main className="flex-1 max-w-md w-full mx-auto px-5 py-4 flex flex-col justify-center">
        {gameState === 'FORM' && (
          <div className="flex flex-col items-center">
            {apiError && (
              <div className="w-full mb-3 p-3 rounded-xl bg-red-950/80 border border-red-500/80 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            <LeadForm
              formData={formData}
              onChange={handleInputChange}
              errors={errors}
            />

            <EngineStartButton
              onClick={handleStartSpin}
              disabled={false}
              loading={false}
            />

            <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] mt-2 text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Stand #{screenId} • Solo 1 participación por persona</span>
            </div>
          </div>
        )}

        {gameState === 'SPINNING' && (
          <SpinningProgress />
        )}

        {gameState === 'WON' && spinResult && (
          <div className="flex flex-col items-center">
            {alreadyPlayedNotice && (
              <div className="w-full mb-2 p-3 rounded-2xl bg-amber-950/80 border border-amber-400/80 text-amber-200 text-xs flex items-center gap-2 shadow-lg">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>¡Ya registraste tu tiro con este contacto! Aquí tienes tu pase para canjear en el stand.</span>
              </div>
            )}
            <PrizeVoucher result={spinResult} />
          </div>
        )}
      </main>

      <footer className="w-full py-2.5 px-4 bg-zinc-950/90 border-t border-zinc-900 text-center text-[10px] text-zinc-500 font-sans">
        Marketing VIP • Especialistas en sueños • Stand Feria Automotriz 2026
      </footer>
    </div>
  );
}
