import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { ShieldCheck, AlertTriangle, ArrowRight, Tv, Loader2, Gift, Plane, Clock } from 'lucide-react';
import Header from './components/Header';
import LeadForm from './components/LeadForm';
import { getMobileBrandConfig } from './brand';

/**
 * Celular del kiosco de 2 pantallas: el visitante se registra y espera. El giro NO lo dispara el celular:
 * lo dispara el botón JUGAR AHORA de la pantalla de abajo. Aquí solo se muestra el premio cuando la ruleta termina.
 * Todo por polling (en producción el API es Lambda, sin WebSockets).
 */

const isProduction = typeof window !== 'undefined' && (
  window.location.hostname === 'autos.mvevip.com' ||
  window.location.hostname.endsWith('.mvevip.com')
);
const API_URL = isProduction
  ? window.location.origin
  : `${window.location.protocol}//${window.location.hostname}:5500`;

const POLL_MS = 1500;
const SESSION_KEY = 'vip_kiosk_session';

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

function loadSavedSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
function saveSession(value) {
  try {
    if (value) sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch (e) { /* sin efecto */ }
}

// Ticket con formato de boarding pass y QR de canje
function KioskVoucher({ ticket, alreadyPlayed }) {
  useEffect(() => {
    if (alreadyPlayed) return;
    try {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: ['#9AC31C', '#ef4444', '#ffffff', '#B2DC2B'] });
    } catch (e) { /* sin efecto */ }
  }, [alreadyPlayed]);

  return (
    <div className="w-full flex flex-col items-center animate-fadeIn select-none">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#84A816] to-[#9AC31C] flex items-center justify-center shadow-lg mb-3">
        <Gift className="w-8 h-8 text-black" />
      </div>
      <h2 className="text-2xl font-racing font-black uppercase text-center text-zinc-900 mb-3">
        {alreadyPlayed ? 'Tu ticket' : '¡Ganaste!'}
      </h2>

      <div className="w-full max-w-sm bg-white border-2 border-[#9AC31C] rounded-3xl shadow-xl relative overflow-hidden text-zinc-900 p-5 mb-4">
        <div className="absolute -right-8 -bottom-8 opacity-5 pointer-events-none">
          <Plane className="w-40 h-40 text-black" />
        </div>

        <div className="flex items-center justify-between border-b border-dashed border-zinc-300 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#9AC31C] font-racing font-bold text-xs flex items-center justify-center text-black">VIP</span>
            <span className="font-racing font-bold text-xs text-zinc-700 tracking-wider">BOARDING PASS · PREMIO</span>
          </div>
        </div>

        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pasajero</p>
        <p className="text-base font-bold uppercase leading-tight mb-3">{ticket.leadName}</p>

        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Premio</p>
        <p className="text-xl font-black leading-tight mb-1">{ticket.winner.name}</p>
        {ticket.winner.description && <p className="text-xs text-zinc-600 mb-3">{ticket.winner.description}</p>}

        <div className="flex items-end justify-between border-t border-dashed border-zinc-300 pt-3">
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Código de canje</p>
            <p className="font-mono text-2xl font-black tracking-wider">{ticket.ticketCode}</p>
            <p className="text-[11px] text-zinc-500 mt-1">{ticket.playedAt}</p>
          </div>
          <div className="bg-white p-1.5 rounded-lg border border-zinc-300">
            <QRCodeSVG value={ticket.qrText || ticket.ticketCode} size={96} level="M" fgColor="#000000" bgColor="#ffffff" />
          </div>
        </div>
      </div>

      <p className="text-xs text-zinc-600 text-center max-w-xs">
        Presenta este código o el QR para canjear tu premio. También sale impreso en el kiosco.
      </p>
    </div>
  );
}

export default function KioskApp() {
  const brand = getMobileBrandConfig();
  const screenId = brand.screenId;
  const deviceIdRef = useRef(getOrCreateDeviceId());

  const [phase, setPhase] = useState('FORM'); // FORM | WAITING | SPINNING | REVEALED | EXPIRED | BUSY | ALREADY
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', accept_privacy: true, dream_destination: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [ticket, setTicket] = useState(null);
  const [retryIn, setRetryIn] = useState(0);
  const sessionRef = useRef(loadSavedSession());

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!formData.name.trim() || formData.name.trim().length < 3) next.name = 'Por favor ingresa tu nombre y apellido completos.';
    if (!formData.phone || !/^09\d{8}$/.test(formData.phone)) next.phone = 'Ingresa un número de celular de Ecuador válido (10 dígitos iniciando con 09, ej: 0991234567).';
    if (!formData.email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email.trim())) next.email = 'Ingresa un correo electrónico válido (ej: usuario@gmail.com).';
    if (!formData.accept_privacy) next.accept_privacy = 'Debes aceptar las políticas de privacidad para participar.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // Al abrir el enlace: despertar la pantalla de arriba (muestra la ruleta en lugar del video)
  const pingScreen = useCallback(() => {
    fetch(`${API_URL}/api/screen/activity?screen_id=${screenId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => {});
  }, [screenId]);

  useEffect(() => { pingScreen(); }, [pingScreen]);

  // Reanudar si el visitante recarga la página con una sesión activa
  useEffect(() => {
    const saved = sessionRef.current;
    if (saved && saved.id && saved.token) setPhase('WAITING');
  }, []);

  // Polling del estado de MI sesión
  useEffect(() => {
    if (!['WAITING', 'SPINNING'].includes(phase)) return undefined;
    let alive = true;
    const tick = async () => {
      const saved = sessionRef.current;
      if (!saved) return;
      try {
        const res = await fetch(`${API_URL}/api/kiosk/state?session=${saved.id}&token=${encodeURIComponent(saved.token)}`, { cache: 'no-store' });
        const json = await res.json();
        if (!alive) return;
        if (res.status === 404) {
          sessionRef.current = null; saveSession(null); setPhase('FORM'); return;
        }
        if (!json.success) return;
        if (json.status === 'REGISTERED') {
          setPhase('WAITING');
          setSecondsLeft(json.secondsLeft || 0);
        } else if (json.status === 'SPINNING') {
          setPhase('SPINNING');
        } else if (json.status === 'REVEALED' || json.status === 'DONE') {
          setTicket(json.data);
          setPhase('REVEALED');
        } else if (json.status === 'EXPIRED') {
          sessionRef.current = null; saveSession(null);
          setPhase('EXPIRED');
        }
      } catch (e) { /* red inestable: se reintenta en el siguiente ciclo */ }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [phase]);

  // Cuenta regresiva local mientras se espera el botón
  useEffect(() => {
    if (phase !== 'WAITING') return undefined;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(s - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Reintento automático si el kiosco estaba ocupado
  useEffect(() => {
    if (phase !== 'BUSY' || retryIn <= 0) return undefined;
    const id = setInterval(() => setRetryIn((s) => Math.max(s - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [phase, retryIn]);

  const handleRegister = async () => {
    if (submitting) return;
    if (!validate()) {
      setApiError('Por favor revisa los campos obligatorios en rojo.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setApiError(null);
    setSubmitting(true);
    pingScreen();
    try {
      const res = await fetch(`${API_URL}/api/kiosk/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          device_id: deviceIdRef.current,
          turnstile_token: 'BYPASS_DEV'
        })
      });
      const json = await res.json();

      if (res.status === 409 && json.code === 'KIOSK_BUSY') {
        setRetryIn(Number(json.retryAfterSeconds) || 15);
        setPhase('BUSY');
        return;
      }
      if (!res.ok || !json.success) throw new Error(json.message || 'No pudimos registrarte. Intenta de nuevo.');

      if (json.already_played) {
        setTicket(json.data);
        setPhase('ALREADY');
        return;
      }
      sessionRef.current = { id: json.data.sessionId, token: json.data.token };
      saveSession(sessionRef.current);
      setSecondsLeft(json.data.expiresInSeconds || 120);
      setPhase('WAITING');
    } catch (err) {
      setApiError(err.message || 'No pudimos conectar con el kiosco. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const primaryBtn = 'w-full mt-3 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#9AC31C] via-[#b2dc27] to-[#84A816] text-black font-racing font-black text-base uppercase tracking-wider shadow-lg shadow-[#9AC31C]/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-zinc-100 via-zinc-200 to-zinc-300 text-zinc-900 font-sans">
      <Header />

      <main className="flex-1 w-full max-w-md mx-auto px-4 py-5 flex flex-col justify-center">
        {phase === 'FORM' && (
          <div className="bg-white/95 border border-zinc-200/80 rounded-3xl p-5 shadow-xl backdrop-blur-md">
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
              hideDestinations
              title="Registro de Piloto"
              subtitle="Regístrate y juega en la pantalla del kiosco"
            />
            <button type="button" onClick={handleRegister} disabled={submitting} className={primaryBtn}>
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Registrarme</span><ArrowRight className="w-5 h-5 stroke-[2.5]" /></>}
            </button>
            <div className="flex items-center justify-center gap-1.5 text-zinc-500 text-[11px] mt-2.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Solo 1 participación por persona</span>
            </div>
          </div>
        )}

        {phase === 'WAITING' && (
          <div className="bg-white/95 border-2 border-[#9AC31C] rounded-3xl p-6 shadow-xl text-center">
            <Tv className="w-12 h-12 text-[#7A9E14] mx-auto mb-3" />
            <h2 className="font-racing font-black text-xl uppercase text-zinc-900">¡Registro listo!</h2>
            <p className="text-sm text-zinc-700 mt-2 font-medium">
              Ve a la pantalla de abajo del kiosco y presiona el botón
            </p>
            <p className="font-racing font-black text-2xl text-[#7A9E14] mt-2">JUGAR AHORA</p>
            <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 mt-4">
              <Clock className="w-4 h-4" />
              <span>Tu turno vence en {secondsLeft} s</span>
            </div>
          </div>
        )}

        {phase === 'SPINNING' && (
          <div className="bg-white/95 border-2 border-[#9AC31C] rounded-3xl p-6 shadow-xl text-center">
            <Loader2 className="w-12 h-12 text-[#7A9E14] mx-auto mb-3 animate-spin" />
            <h2 className="font-racing font-black text-xl uppercase text-zinc-900">¡Girando!</h2>
            <p className="text-sm text-zinc-700 mt-2 font-medium">Mira la pantalla de arriba del kiosco</p>
          </div>
        )}

        {(phase === 'REVEALED' || phase === 'ALREADY') && ticket && (
          <KioskVoucher ticket={ticket} alreadyPlayed={phase === 'ALREADY'} />
        )}

        {phase === 'EXPIRED' && (
          <div className="bg-white/95 border border-amber-300 rounded-3xl p-6 shadow-xl text-center">
            <Clock className="w-10 h-10 text-amber-600 mx-auto mb-3" />
            <h2 className="font-racing font-black text-lg uppercase text-zinc-900">Tu turno venció</h2>
            <p className="text-sm text-zinc-700 mt-2">No se presionó el botón a tiempo. Vuelve a registrarte para jugar.</p>
            <button type="button" onClick={() => setPhase('FORM')} className={primaryBtn}>Volver a intentar</button>
          </div>
        )}

        {phase === 'BUSY' && (
          <div className="bg-white/95 border border-amber-300 rounded-3xl p-6 shadow-xl text-center">
            <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto mb-3" />
            <h2 className="font-racing font-black text-lg uppercase text-zinc-900">Kiosco ocupado</h2>
            <p className="text-sm text-zinc-700 mt-2">Hay otra persona jugando. Espera unos segundos e inténtalo de nuevo.</p>
            <button type="button" onClick={() => { setPhase('FORM'); }} disabled={retryIn > 0} className={primaryBtn}>
              {retryIn > 0 ? `Reintentar en ${retryIn} s` : 'Reintentar'}
            </button>
          </div>
        )}
      </main>

      <footer className="w-full py-2.5 px-4 text-center text-[10px] bg-white/80 border-t border-zinc-300 text-zinc-500">
        <div>Marketing VIP • Especialistas en sueños</div>
        {!isProduction && (
          <div className="font-mono font-bold text-amber-600 text-[9px] mt-0.5 tracking-wider">[ENTORNO LOCAL 💻 - KIOSCO #{screenId}]</div>
        )}
      </footer>
    </div>
  );
}
