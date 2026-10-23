import { detectRequestedChannel, channelUrl } from './brand';

const isProduction = typeof window !== 'undefined' && (
  window.location.hostname === 'autos.mvevip.com' ||
  window.location.hostname.endsWith('.mvevip.com')
);

const API_URL = isProduction
  ? window.location.origin
  : `${window.location.protocol}//${window.location.hostname}:5500`;

const GATE_TIMEOUT_MS = 2500;
const LOOP_GUARD_KEY = 'vip_gate_redirected_at';

/**
 * Antes de mostrar nada, consulta qué canales están habilitados (Admin) y redirige si hace falta:
 *  - enlace sin parámetros            -> canal por defecto
 *  - canal pedido y deshabilitado     -> canal por defecto
 * Si la consulta falla o tarda, NO se redirige (se muestra el canal pedido como siempre): el acceso nunca depende de esto.
 * Devuelve true si se inició una redirección (no hay que renderizar la app).
 */
export async function resolveChannelRedirect() {
  const timer = {};
  try {
    // Salvaguarda anti-bucle: si acabamos de redirigir, no volver a hacerlo en los próximos 10 s
    const last = Number(sessionStorage.getItem(LOOP_GUARD_KEY) || 0);
    if (Date.now() - last < 10000) return false;

    const controller = new AbortController();
    timer.id = setTimeout(() => controller.abort(), GATE_TIMEOUT_MS);
    const res = await fetch(`${API_URL}/api/channels`, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer.id);
    if (!res.ok) return false;
    const cfg = await res.json();
    if (!cfg.success || !cfg.channels || !cfg.default) return false;

    const requested = detectRequestedChannel();
    let target = null;
    if (requested === null) {
      // Enlace "pelado": Autos es el comportamiento histórico, así que solo se redirige si el por defecto es otro
      if (cfg.default !== 'autos') target = cfg.default;
    } else if (cfg.channels[requested] && !cfg.channels[requested].enabled) {
      target = cfg.default;
    }

    if (target && cfg.channels[target] && cfg.channels[target].enabled) {
      sessionStorage.setItem(LOOP_GUARD_KEY, String(Date.now()));
      window.location.replace(channelUrl(target));
      return true;
    }
  } catch (e) {
    // sin conexión / tiempo agotado: se muestra el canal pedido
  } finally {
    clearTimeout(timer.id);
  }
  return false;
}
