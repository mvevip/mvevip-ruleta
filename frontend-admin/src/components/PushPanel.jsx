import React, { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Send, Trash2, Smartphone, AlertTriangle, CheckCircle2, ShieldAlert, Info } from 'lucide-react';
import { useAdmin, API_URL } from '../context/AdminContext';
import { useInstallPrompt } from '../lib/pwa';
import { pushSupported, currentSubscription, subscribeDevice, unsubscribeDevice, deviceLabel } from '../lib/push';
import { Switch, formatQuito } from './ui';

const EVENT_OPTIONS = [
  { key: 'riobamba', label: '🌄 Riobamba' },
  { key: 'ambato', label: '🏔️ Ambato' },
  { key: 'cuotas', label: '📧 Cuotas (correo)' },
  { key: 'autos', label: '🏎️ Autos' },
  { key: 'ford', label: '🚘 Ford' },
  { key: 'kiosk', label: '🖥️ Kiosco histórico' }
];
const FRONT_OPTIONS = [
  { key: 'stand', label: 'Pantalla gigante' },
  { key: 'kiosk', label: 'Kiosco' },
  { key: 'mail', label: 'Correo' }
];

function toggleIn(list, key) {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
}

/** Notificaciones de cada lead nuevo en este dispositivo (navegador o app instalada), con filtros por ciudad y frente. */
export default function PushPanel() {
  const { apiFetch, toast } = useAdmin();
  const { installed, ios } = useInstallPrompt();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [server, setServer] = useState({ configured: false, publicKey: null, tableReady: true, devices: 0 });
  const [sub, setSub] = useState(null);
  const [registered, setRegistered] = useState(false);
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const [filters, setFilters] = useState({ events: [], fronts: [], includeDemo: true });
  const [label, setLabel] = useState(deviceLabel());
  const [savedFilters, setSavedFilters] = useState(null);
  const [devices, setDevices] = useState([]);
  const supported = pushSupported();

  const loadDevices = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/push/devices');
      const json = await res.json();
      if (json.success) setDevices(json.data);
    } catch (_) { /* sesión */ }
  }, [apiFetch]);

  const load = useCallback(async () => {
    try {
      const pk = await (await fetch(`${API_URL}/api/push/public-key`)).json();
      const s = supported ? await currentSubscription() : null;
      setSub(s);
      const q = s ? `?endpoint=${encodeURIComponent(s.endpoint)}` : '';
      const res = await apiFetch(`/api/admin/push/status${q}`);
      const st = await res.json();
      if (st.success) {
        setServer({ configured: Boolean(pk.configured && st.configured), publicKey: pk.publicKey, tableReady: st.tableReady, devices: st.devices });
        setRegistered(Boolean(st.registered));
        if (st.registered) { setFilters(st.filters); setSavedFilters(JSON.stringify(st.filters)); if (st.label) setLabel(st.label); }
      }
      await loadDevices();
    } catch (_) { /* sesión */ } finally { setLoading(false); }
  }, [apiFetch, supported, loadDevices]);

  useEffect(() => { load(); }, [load]);

  const enable = async () => {
    setBusy(true);
    try {
      const s = await subscribeDevice(server.publicKey);
      setPermission(Notification.permission);
      const res = await apiFetch('/api/admin/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription: s.toJSON(), filters, label }) });
      const json = await res.json();
      if (json.success) { toast('Notificaciones activadas en este dispositivo'); await load(); }
      else toast(json.message || 'No se pudieron activar las notificaciones', 'error');
    } catch (e) {
      setPermission(typeof Notification !== 'undefined' ? Notification.permission : 'default');
      if (e && e.code === 'PERMISSION_DENIED') toast('Bloqueaste las notificaciones. Actívalas en los ajustes del navegador para este sitio.', 'error');
      else if (e.message !== 'UNAUTHORIZED') toast('No se pudieron activar las notificaciones en este dispositivo.', 'error');
    } finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true);
    try {
      if (sub) {
        await apiFetch('/api/admin/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint: sub.endpoint }) });
        await unsubscribeDevice();
      }
      setRegistered(false); setSub(null);
      toast('Notificaciones desactivadas en este dispositivo');
      await load();
    } catch (_) { /* sesión */ } finally { setBusy(false); }
  };

  const saveFilters = async () => {
    setBusy(true);
    try {
      const res = await apiFetch('/api/admin/push/filters', { method: 'PUT', body: JSON.stringify({ endpoint: sub.endpoint, filters, label }) });
      const json = await res.json();
      if (json.success) { setSavedFilters(JSON.stringify(json.filters)); toast('Preferencias guardadas'); await loadDevices(); }
      else toast(json.message || 'No se pudieron guardar las preferencias', 'error');
    } catch (_) { /* sesión */ } finally { setBusy(false); }
  };

  const sendTest = async () => {
    setBusy(true);
    try {
      const res = await apiFetch('/api/admin/push/test', { method: 'POST', body: JSON.stringify({ endpoint: sub.endpoint }) });
      const json = await res.json();
      toast(json.success ? 'Te enviamos una notificación de prueba. Debe aparecer en unos segundos.' : (json.message || 'No se pudo enviar la prueba'), json.success ? 'ok' : 'error');
    } catch (_) { /* sesión */ } finally { setBusy(false); }
  };

  const removeDevice = async (id) => {
    try { await apiFetch(`/api/admin/push/devices/${id}`, { method: 'DELETE' }); toast('Dispositivo quitado'); await load(); } catch (_) { /* sesión */ }
  };

  const dirty = registered && savedFilters !== null && JSON.stringify(filters) !== savedFilters;
  const filterSummary = (f) => {
    const ev = f.events.length ? f.events.map((k) => EVENT_OPTIONS.find((o) => o.key === k)?.label.replace(/^\S+\s/, '') || k).join(', ') : 'todas las ciudades';
    const fr = f.fronts.length ? f.fronts.map((k) => FRONT_OPTIONS.find((o) => o.key === k)?.label || k).join(', ') : 'todos los frentes';
    return `${ev} · ${fr}${f.includeDemo ? '' : ' · sin demos'}`;
  };

  if (loading) return <div className="card card-pad"><div className="skeleton h-32 w-full" /></div>;

  return (
    <div className="grid xl:grid-cols-5 gap-5">
      <div className="xl:col-span-3 space-y-4">
        <section className="card card-pad space-y-4">
          <div className="flex items-start gap-3">
            <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${registered ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {registered ? <BellRing className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-ink text-lg leading-tight">{registered ? 'Las notificaciones están activas en este dispositivo' : 'Recibe un aviso por cada lead nuevo'}</h3>
              <p className="text-sm text-ink-muted mt-0.5">Te avisamos al instante con el nombre, la ciudad y el premio, aunque no tengas el panel abierto. Funciona en el navegador y en la app instalada.</p>
            </div>
          </div>

          {!supported && (
            <div className="notice-warn"><AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{ios && !installed
                ? <>En iPhone y iPad las notificaciones solo funcionan con la app instalada: toca <strong>Compartir</strong> → <strong>Agregar a inicio</strong>, abre "VIP Admin" desde el ícono y vuelve aquí.</>
                : 'Este navegador no permite notificaciones. Prueba con Chrome, Edge o Firefox actualizados.'}</span></div>
          )}

          {supported && !server.configured && (
            <div className="notice-warn"><ShieldAlert className="w-5 h-5 shrink-0" />
              <div className="text-sm space-y-1"><strong>Falta configurar el servidor.</strong>
                <p>Hay que crear las claves VAPID y agregarlas como variables del Lambda: <code>VAPID_PUBLIC_KEY</code> y <code>VAPID_PRIVATE_KEY</code>. Pídele a quien administra el sistema que siga la guía de la documentación.</p></div></div>
          )}
          {supported && server.configured && !server.tableReady && (
            <div className="notice-warn"><AlertTriangle className="w-5 h-5 shrink-0" /><span className="text-sm">Falta ejecutar la migración 011 (tabla <code>push_subscriptions</code>) en la base de datos.</span></div>
          )}
          {supported && permission === 'denied' && !registered && (
            <div className="notice-danger"><BellOff className="w-5 h-5 shrink-0" /><span className="text-sm">Las notificaciones están <strong>bloqueadas</strong> para este sitio. Toca el candado junto a la dirección, permite las notificaciones y vuelve a intentarlo.</span></div>
          )}

          {supported && server.configured && server.tableReady && !registered && (
            <button type="button" onClick={enable} disabled={busy || permission === 'denied'} className="btn-primary w-full sm:w-auto py-3 px-6 text-base">
              <Bell className="w-5 h-5" /> {busy ? 'Activando…' : 'Activar notificaciones en este dispositivo'}
            </button>
          )}

          {registered && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={sendTest} disabled={busy} className="btn-soft"><Send className="w-4 h-4" /> Enviar una notificación de prueba</button>
              <button type="button" onClick={disable} disabled={busy} className="btn-danger-soft"><BellOff className="w-4 h-4" /> Desactivar en este dispositivo</button>
            </div>
          )}
        </section>

        {supported && server.configured && server.tableReady && (
          <section className="card card-pad space-y-5">
            <div>
              <h3 className="panel-title">¿Qué avisos quieres recibir en este dispositivo?</h3>
              <p className="help">Si no marcas ninguna opción de un grupo, recibes todas las de ese grupo.</p>
            </div>

            <div>
              <label className="label" htmlFor="push-label">Nombre del dispositivo</label>
              <input id="push-label" className="input" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} placeholder="Ej.: Celular de Ana" />
            </div>

            <fieldset>
              <legend className="label">Ciudades y eventos</legend>
              <div className="flex flex-wrap gap-2">
                {EVENT_OPTIONS.map((o) => {
                  const on = filters.events.includes(o.key);
                  return <button key={o.key} type="button" onClick={() => setFilters((f) => ({ ...f, events: toggleIn(f.events, o.key) }))} aria-pressed={on} className={`chip ${on ? 'chip-active' : ''}`}>{o.label}</button>;
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="label">Frentes</legend>
              <div className="flex flex-wrap gap-2">
                {FRONT_OPTIONS.map((o) => {
                  const on = filters.fronts.includes(o.key);
                  return <button key={o.key} type="button" onClick={() => setFilters((f) => ({ ...f, fronts: toggleIn(f.fronts, o.key) }))} aria-pressed={on} className={`chip ${on ? 'chip-active' : ''}`}>{o.label}</button>;
                })}
              </div>
            </fieldset>

            <label className="flex items-center justify-between gap-4 rounded-xl bg-surface-2 border border-line p-3.5 cursor-pointer">
              <span><span className="block text-sm font-bold text-ink">Avisar también de usuarios demo</span><span className="block text-xs text-ink-muted">Sirve para probar. Llegan marcados como DEMO.</span></span>
              <Switch checked={filters.includeDemo} onChange={(v) => setFilters((f) => ({ ...f, includeDemo: v }))} label="Avisar de usuarios demo" />
            </label>

            <div className="notice-info text-sm"><Info className="w-4 h-4 shrink-0 mt-0.5" /><span>Recibirás avisos de: <strong>{filterSummary(filters)}</strong></span></div>

            {registered ? (
              <button type="button" onClick={saveFilters} disabled={busy || !dirty} className="btn-primary">{dirty ? 'Guardar preferencias' : 'Preferencias guardadas'}</button>
            ) : (
              <p className="help">Elige tus preferencias y luego activa las notificaciones; también puedes cambiarlas después.</p>
            )}
          </section>
        )}
      </div>

      <aside className="xl:col-span-2 space-y-4">
        <section className="card card-pad space-y-3">
          <h3 className="panel-title flex items-center gap-2"><Smartphone className="w-4 h-4" /> Dispositivos con avisos ({devices.length})</h3>
          {devices.length === 0 ? (
            <p className="text-sm text-ink-muted">Ningún dispositivo tiene las notificaciones activadas todavía.</p>
          ) : (
            <ul className="divide-y divide-line">
              {devices.map((d) => (
                <li key={d.id} className="py-3 flex items-start gap-3">
                  <span className="w-9 h-9 rounded-lg bg-slate-100 text-ink-muted flex items-center justify-center shrink-0"><Bell className="w-4 h-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-ink truncate">{d.label}</div>
                    <div className="text-xs text-ink-muted">{filterSummary(d.filters)}</div>
                    <div className="text-[11px] text-ink-muted mt-0.5">Activado el {formatQuito(d.created_at)}{d.last_sent_at ? ` · último aviso ${formatQuito(d.last_sent_at)}` : ''}</div>
                  </div>
                  <button type="button" onClick={() => removeDevice(d.id)} className="btn-icon w-9 h-9 text-red-600" aria-label={`Quitar ${d.label}`} title="Quitar este dispositivo"><Trash2 className="w-4 h-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card card-pad space-y-2 text-sm text-ink-2">
          <h3 className="panel-title">Cómo funciona</h3>
          <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
            <li>Cada registro nuevo (pantalla gigante, kiosco o correo) genera un aviso.</li>
            <li>En el kiosco el aviso llega al registrarse la persona, aunque todavía no haya jugado.</li>
            <li>El aviso no incluye teléfono ni correo; al tocarlo se abren los leads de esa ciudad.</li>
            <li>En iPhone/iPad hay que instalar la app primero (iOS 16.4 o superior).</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
