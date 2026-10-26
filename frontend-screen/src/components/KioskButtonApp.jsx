import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Printer, Smartphone, Loader2, CheckCircle2, AlertTriangle, Gift } from 'lucide-react';
import { checkPrinter, printTicket } from '../utils/kioskPrint';

/**
 * Pantalla de ABAJO del kiosco: botón JUGAR AHORA (siempre visible, habilitado solo cuando hay un registro)
 * + impresión del ticket en la térmica local. Todo por polling (en producción el API es Lambda, sin WebSockets).
 *
 * URL: /pantalla/?view=kiosk-button&screen=KIOSK_01&k=<clave del kiosco>[&print=image]
 */

const isProduction = typeof window !== 'undefined' && (
  window.location.hostname === 'autos.mvevip.com' ||
  window.location.hostname.endsWith('.mvevip.com')
);
const API_URL = isProduction
  ? (typeof window !== 'undefined' ? window.location.origin : '')
  : (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5500` : 'http://localhost:5500');

const POLL_MS = 1000;
const SHOW_RESULT_MS = 12000; // la pantalla muestra el resultado de la impresión unos segundos tras liberarse el kiosco

function readKioskKey() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('k');
    if (fromUrl) {
      localStorage.setItem('vip_kiosk_key', fromUrl);
      return fromUrl;
    }
    return localStorage.getItem('vip_kiosk_key') || '';
  } catch (e) {
    return '';
  }
}

export default function KioskButtonApp() {
  const kioskKey = useRef(readKioskKey()).current;
  const [state, setState] = useState({ status: 'IDLE', session: null });
  const [online, setOnline] = useState(true);
  const [pressing, setPressing] = useState(false);
  const [printerOk, setPrinterOk] = useState(null);
  const [printUi, setPrintUi] = useState(null); // { phase: 'printing'|'ok'|'failed', ticket, error }
  const attemptedRef = useRef(new Set());
  const resultTimerRef = useRef(null);
  const lastTicketRef = useRef(null);

  const headers = { 'Content-Type': 'application/json', 'x-kiosk-key': kioskKey };

  const reportPrinted = useCallback(async (sessionId, ok) => {
    try {
      await fetch(`${API_URL}/api/kiosk/printed`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ session_id: sessionId, ok })
      });
    } catch (e) {
      // Si no llega, el servidor libera el kiosco solo al vencer el tiempo de gracia
    }
  }, [kioskKey]);

  const runPrint = useCallback(async (ticket, attemptKey) => {
    if (attemptedRef.current.has(attemptKey)) return;
    attemptedRef.current.add(attemptKey);
    lastTicketRef.current = ticket;
    setPrintUi({ phase: 'printing', ticket });
    try {
      await printTicket(ticket);
      setPrintUi({ phase: 'ok', ticket });
      await reportPrinted(ticket.sessionId, true);
    } catch (e) {
      console.warn('[Kiosco] Error de impresión:', e);
      setPrintUi({ phase: 'failed', ticket, error: e.message });
      await reportPrinted(ticket.sessionId, false);
    }
    clearTimeout(resultTimerRef.current);
    resultTimerRef.current = setTimeout(() => setPrintUi((cur) => (cur && cur.phase === 'failed' ? cur : null)), SHOW_RESULT_MS);
  }, [reportPrinted]);

  // Polling del estado del kiosco
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(`${API_URL}/api/kiosk/state?k=${encodeURIComponent(kioskKey)}`, {
          headers: { 'x-kiosk-key': kioskKey },
          cache: 'no-store'
        });
        const json = await res.json();
        if (!alive) return;
        if (json.success) {
          setOnline(true);
          setState(json);
          if (json.print) runPrint(json.print, `p${json.print.sessionId}`);
          else if (json.reprint) runPrint(json.reprint, `r${json.reprint.sessionId}:${json.reprint.ticketCode}`);
        } else {
          setOnline(res.status !== 401);
        }
      } catch (e) {
        if (alive) setOnline(false);
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [kioskKey, runPrint]);

  // Estado de la impresora local
  useEffect(() => {
    let alive = true;
    const probe = async () => { const ok = await checkPrinter(); if (alive) setPrinterOk(ok); };
    probe();
    const id = setInterval(probe, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const status = state.status;
  const canPlay = status === 'REGISTERED' && !pressing;

  const handlePlay = async () => {
    if (!canPlay) return;
    setPressing(true);
    try {
      const res = await fetch(`${API_URL}/api/kiosk/start`, { method: 'POST', headers, body: '{}' });
      const json = await res.json();
      if (json.success) {
        // Bloqueo inmediato (sin esperar al siguiente polling) para evitar un segundo toque
        setState((cur) => ({ ...cur, status: 'SPINNING' }));
      } else {
        console.warn('[Kiosco] No se pudo iniciar:', json.message);
      }
    } catch (e) {
      console.warn('[Kiosco] Error iniciando el giro:', e);
    } finally {
      setPressing(false);
    }
  };

  const retryPrint = () => {
    const ticket = lastTicketRef.current || (printUi && printUi.ticket);
    if (ticket) runPrint(ticket, `retry${Date.now()}`);
  };

  const name = state.session && state.session.leadName;
  let headline = 'Escanea el QR de la pantalla de arriba';
  let sub = 'Regístrate con tu celular para activar el botón';
  if (status === 'REGISTERED') {
    headline = `¡Hola ${name || ''}!`;
    sub = `Presiona JUGAR AHORA · te quedan ${state.session ? state.session.secondsLeft : 0} s`;
  } else if (status === 'SPINNING') {
    headline = '¡Girando!';
    sub = 'Mira la pantalla de arriba';
  } else if (status === 'REVEALED') {
    headline = `¡Felicidades ${name || ''}!`;
    sub = 'Tu premio ya está en tu celular';
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white flex flex-col items-center justify-between px-6 py-8 select-none">
      <div className="flex items-center gap-3">
        <img src="/pantalla/logotipo.png" onError={(e) => { e.currentTarget.src = '/logotipo.png'; }} alt="Marketing VIP" className="h-14 object-contain" />
      </div>

      <div className="flex flex-col items-center text-center gap-8 w-full max-w-2xl">
        <div>
          <h1 className="font-racing font-black text-3xl sm:text-4xl uppercase tracking-wide text-[#9AC31C]">{headline}</h1>
          <p className="text-lg sm:text-xl text-zinc-300 mt-2 font-medium">{sub}</p>
        </div>

        <button
          type="button"
          onClick={handlePlay}
          disabled={!canPlay}
          className={`w-full max-w-md aspect-[16/9] rounded-[2rem] font-racing font-black uppercase tracking-widest text-4xl sm:text-5xl flex flex-col items-center justify-center gap-3 transition-all duration-300 border-4 ${
            canPlay
              ? 'bg-gradient-to-b from-[#b2dc27] to-[#84A816] text-black border-white kiosk-glow cursor-pointer active:scale-95'
              : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
          }`}
        >
          {status === 'SPINNING' || pressing
            ? <Loader2 className="w-14 h-14 animate-spin" />
            : <Play className="w-14 h-14" fill="currentColor" />}
          <span>JUGAR AHORA</span>
        </button>

        {status === 'IDLE' && (
          <div className="flex items-center gap-2 text-zinc-400 text-base">
            <Smartphone className="w-5 h-5" />
            <span>El botón se activa cuando completes tu registro</span>
          </div>
        )}
        {status === 'REVEALED' && state.print && (
          <div className="flex items-center gap-2 text-[#9AC31C] text-lg font-semibold">
            <Gift className="w-6 h-6" />
            <span>{state.print.winner.name}</span>
          </div>
        )}

        {printUi && (
          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border text-lg font-semibold ${
            printUi.phase === 'failed'
              ? 'bg-red-950/60 border-red-500 text-red-200'
              : 'bg-zinc-900/80 border-zinc-600 text-zinc-100'
          }`}>
            {printUi.phase === 'printing' && (<><Printer className="w-6 h-6 animate-pulse" /><span>Imprimiendo tu ticket…</span></>)}
            {printUi.phase === 'ok' && (<><CheckCircle2 className="w-6 h-6 text-[#9AC31C]" /><span>Retira tu ticket de la impresora</span></>)}
            {printUi.phase === 'failed' && (
              <>
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <span>No se pudo imprimir. Avisa a un asesor.</span>
                <button type="button" onClick={retryPrint} className="ml-2 px-4 py-1.5 rounded-xl bg-white text-black font-bold cursor-pointer">Reintentar</button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="w-full flex items-center justify-between text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${online ? 'bg-[#9AC31C]' : 'bg-red-500 animate-pulse'}`} />
          {online ? 'Conectado' : 'Sin conexión con el servidor'}
        </span>
        <span className="flex items-center gap-1.5">
          <Printer className="w-3.5 h-3.5" />
          <span className={`w-2.5 h-2.5 rounded-full ${printerOk === null ? 'bg-zinc-500' : printerOk ? 'bg-[#9AC31C]' : 'bg-red-500 animate-pulse'}`} />
          {printerOk === null ? 'Impresora…' : printerOk ? 'Impresora lista' : 'Impresora sin conexión'}
        </span>
      </div>
    </div>
  );
}
