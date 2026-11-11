import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { STAND_META, EVENT_GROUPS, isKnownStand, groupOfStand } from '../utils/stands';

/**
 * Estado global del Admin: sesión (PIN), conexión con el API, navegación por hash, evento/frente activo,
 * avisos (toasts) y la señal de "hay un lead nuevo" (notificación push o sondeo).
 */

export const isProduction = typeof window !== 'undefined' && (
  window.location.hostname === 'autos.mvevip.com' ||
  window.location.hostname.endsWith('.mvevip.com')
);

export const API_URL = isProduction
  ? (typeof window !== 'undefined' ? window.location.origin : '')
  : (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5500` : 'http://localhost:5500');

// Origen público para mostrar/copiar enlaces (en local se muestran los de producción)
export const PUBLIC_ORIGIN = isProduction ? window.location.origin : 'https://autos.mvevip.com';

// Páginas del Admin. `stand: true` = la página depende del evento/frente elegido arriba.
export const PAGES = {
  resumen: { label: 'Resumen', stand: false },
  leads: { label: 'Leads', stand: true },
  canje: { label: 'Canjear premios', stand: false },
  premios: { label: 'Premios', stand: true },
  pantallas: { label: 'Pantallas y videos', stand: true },
  destinos: { label: 'Destinos', stand: false },
  metricas: { label: 'Métricas', stand: true },
  ajustes: { label: 'Ajustes', stand: false }
};

function parseHash() {
  const raw = (typeof window !== 'undefined' ? window.location.hash : '').replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const page = PAGES[path] ? path : 'resumen';
  return { page, params: Object.fromEntries(new URLSearchParams(query)) };
}

const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

export function AdminProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try { return localStorage.getItem('vip_admin_auth') === 'true'; } catch (_) { return false; }
  });
  const [route, setRoute] = useState(parseHash);
  const [toasts, setToasts] = useState([]);
  const [leadTick, setLeadTick] = useState(0); // sube cada vez que llega un lead nuevo (push) para refrescar listados
  const [eventsInfo, setEventsInfo] = useState(null); // datos de las ferias (GET /api/admin/events): cierre, lugar, etc.
  const toastId = useRef(0);

  const [activeStand, setActiveStandState] = useState(() => {
    try {
      const saved = localStorage.getItem('vip_admin_stand');
      return isKnownStand(saved) ? saved : 'rio_stand';
    } catch (_) {
      return 'rio_stand';
    }
  });

  // ---------- Navegación (hash) ----------
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((page, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const next = `#/${page}${qs ? `?${qs}` : ''}`;
    if (window.location.hash === next) setRoute(parseHash());
    else window.location.hash = next;
    window.scrollTo({ top: 0 });
  }, []);

  // ---------- Evento / frente activo ----------
  const setActiveStand = useCallback((stand) => {
    if (!isKnownStand(stand)) return;
    setActiveStandState(stand);
    try { localStorage.setItem('vip_admin_stand', stand); } catch (_) {}
  }, []);

  const meta = STAND_META[activeStand] || STAND_META.autos;
  const group = groupOfStand(activeStand);

  // ---------- Avisos ----------
  const toast = useCallback((message, tone = 'ok') => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), tone === 'error' ? 5000 : 3000);
  }, []);

  // ---------- API ----------
  const getAdminHeaders = useCallback(() => {
    let pin = '';
    try { pin = localStorage.getItem('vip_admin_pin') || ''; } catch (_) {}
    return { 'Content-Type': 'application/json', 'x-admin-pin': pin };
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('vip_admin_auth');
      localStorage.removeItem('vip_admin_pin');
    } catch (_) {}
  }, []);

  /** fetch al API con el PIN. Si el servidor responde 401 cierra la sesión y avisa. */
  const apiFetch = useCallback(async (path, options = {}) => {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...getAdminHeaders(), ...(options.headers || {}) }
    });
    if (res.status === 401) {
      logout();
      toast('La sesión expiró o el PIN no es válido. Ingresa de nuevo.', 'error');
      throw new Error('UNAUTHORIZED');
    }
    return res;
  }, [getAdminHeaders, logout, toast]);

  /** Inicio de sesión: el PIN se valida contra el servidor (no está escrito en la aplicación). */
  const login = useCallback(async (pinInput) => {
    const pin = String(pinInput || '').trim().toUpperCase();
    if (!pin) return { ok: false, message: 'Escribe tu clave de acceso.' };
    try {
      const res = await fetch(`${API_URL}/api/admin/events`, { headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin } });
      if (res.status === 401) return { ok: false, message: 'La clave no es correcta.' };
      if (!res.ok) return { ok: false, message: 'El servidor no respondió bien. Intenta de nuevo.' };
      localStorage.setItem('vip_admin_auth', 'true');
      localStorage.setItem('vip_admin_pin', pin);
      setIsAuthenticated(true);
      return { ok: true };
    } catch (_) {
      return { ok: false, message: 'No hay conexión con el servidor.' };
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/events');
      const json = await res.json();
      if (json.success) setEventsInfo({ missingTable: Boolean(json.missingTable), data: json.data });
    } catch (_) { /* sin efecto */ }
  }, [apiFetch]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    refreshEvents();
    const id = setInterval(() => { if (document.visibilityState === 'visible') refreshEvents(); }, 90000);
    return () => clearInterval(id);
  }, [isAuthenticated, refreshEvents]);

  // Señal de lead nuevo: la envía el service worker cuando llega una notificación push
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const onMessage = (event) => {
      if (event.data && event.data.type === 'NEW_LEAD') setLeadTick((n) => n + 1);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  const value = useMemo(() => ({
    isAuthenticated, login, logout, apiFetch, getAdminHeaders,
    route, navigate,
    activeStand, setActiveStand, meta, group,
    toast, toasts, leadTick, bumpLeads: () => setLeadTick((n) => n + 1),
    eventsInfo, refreshEvents,
    EVENT_GROUPS, STAND_META
  }), [isAuthenticated, login, logout, apiFetch, getAdminHeaders, route, navigate, activeStand, setActiveStand, meta, group, toast, toasts, leadTick, eventsInfo, refreshEvents]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
