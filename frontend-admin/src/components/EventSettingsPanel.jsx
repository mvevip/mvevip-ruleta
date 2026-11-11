import React, { useEffect, useMemo, useState } from 'react';
import { Save, MapPin, Copy, AlertTriangle, Lock, Unlock, Link2, ExternalLink } from 'lucide-react';
import { useAdmin, PUBLIC_ORIGIN } from '../context/AdminContext';

/**
 * Datos de las ferias (Riobamba / Ambato): nombre, lugar, mapa, fechas, texto del stand, cierre y apertura.
 * Lo que se guarda aplica en pocos segundos a los 3 frentes de la ciudad (pantalla gigante, kiosco y correo):
 * pase del celular, correo, ticket impreso y mensaje de WhatsApp. También muestra los enlaces de la ciudad.
 */

const QUITO_OFFSET_MS = 5 * 3600 * 1000; // Quito = UTC-5 todo el año
const PREFIX = { riobamba: 'RIO', ambato: 'AMB' };

function isoToQuitoInput(iso) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  return new Date(ms - QUITO_OFFSET_MS).toISOString().slice(0, 16);
}
function quitoInputToIso(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || '') ? `${value}:00-05:00` : '';
}

export default function EventSettingsPanel() {
  const { apiFetch, toast, refreshEvents, group } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [missingTable, setMissingTable] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventKey, setEventKey] = useState(group.fair ? group.key : 'riobamba');
  const [form, setForm] = useState(null);
  const [copied, setCopied] = useState('');

  const load = async () => {
    try {
      const res = await apiFetch('/api/admin/events');
      const json = await res.json();
      if (json.success) { setEvents(json.data); setMissingTable(Boolean(json.missingTable)); }
      else setError(json.message || 'No se pudo leer la configuración.');
    } catch (_) { /* sesión */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const current = useMemo(() => events.find((e) => e.event === eventKey), [events, eventKey]);
  useEffect(() => {
    if (!current) return;
    setError('');
    setForm({
      fairName: current.fairName, venue: current.venue, mapsUrl: current.mapsUrl, datesText: current.datesText,
      standText: current.standText, closesAt: isoToQuitoInput(current.closesAt), isOpen: current.isOpen
    });
  }, [current]);

  const dirty = Boolean(current && form) && (
    form.fairName !== current.fairName || form.venue !== current.venue || form.mapsUrl !== current.mapsUrl ||
    form.datesText !== current.datesText || form.standText !== current.standText ||
    quitoInputToIso(form.closesAt) !== current.closesAt || form.isOpen !== current.isOpen
  );
  const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  const save = async () => {
    setError('');
    const closesAt = quitoInputToIso(form.closesAt);
    if (!closesAt) { setError('Indica la fecha y hora de cierre.'); return; }
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/events/${eventKey}`, {
        method: 'PUT',
        body: JSON.stringify({ fairName: form.fairName, venue: form.venue, mapsUrl: form.mapsUrl, datesText: form.datesText, standText: form.standText, closesAt, isOpen: form.isOpen })
      });
      const json = await res.json();
      if (json.success) { toast(`Datos de ${current.city} guardados. Se aplican en unos segundos.`); await load(); refreshEvents(); }
      else setError(json.message || 'No se pudo guardar.');
    } catch (_) { /* sesión */ } finally { setSaving(false); }
  };

  const copy = async (key, text) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1800); }
    catch (_) { window.prompt('Copia el enlace:', text); }
  };

  const prefix = PREFIX[eventKey] || 'RIO';
  const base = PUBLIC_ORIGIN;
  const links = [
    { key: 'screen', label: 'Pantalla gigante', url: `${base}/pantalla/?screen=${prefix}_STAND` },
    { key: 'qr', label: 'Celular (QR de la pantalla gigante)', url: `${base}/?screen=${prefix}_STAND` },
    { key: 'kt', label: 'Kiosco · pantalla de ARRIBA', url: `${base}/pantalla/?screen=${prefix}_KIOSK` },
    { key: 'kb', label: 'Kiosco · pantalla de ABAJO (reemplaza TU_CLAVE por la clave de la ciudad)', url: `${base}/pantalla/?view=kiosk-button&screen=${prefix}_KIOSK&k=TU_CLAVE` },
    { key: 'kp', label: 'Kiosco · celular (QR del kiosco)', url: `${base}/?screen=${prefix}_KIOSK` },
    { key: 'mail', label: 'Correo (enlace para Brevo)', url: `${base}/?view=mail&ev=${eventKey}&correo={{ contact.EMAIL }}&c=feria_${eventKey}` }
  ];

  return (
    <div className="space-y-5">
      <div className="seg" role="tablist" aria-label="Ciudad">
        {[['riobamba', '🌄 Riobamba'], ['ambato', '🏔️ Ambato']].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={eventKey === key} onClick={() => setEventKey(key)} className={`seg-item ${eventKey === key ? 'seg-item-active' : ''}`}>{label}</button>
        ))}
      </div>

      {loading && <div className="card card-pad"><div className="skeleton h-40 w-full" /></div>}

      {missingTable && (
        <div className="notice-warn"><AlertTriangle className="w-5 h-5 shrink-0" /><span className="text-sm">Falta ejecutar la migración 010 (tabla <code>event_settings</code>) en la base de datos. Mientras tanto rigen los datos por defecto y no se puede guardar.</span></div>
      )}

      {form && current && (
        <div className="grid xl:grid-cols-5 gap-5">
          <section className="card card-pad space-y-4 xl:col-span-3">
            <h3 className="panel-title flex items-center gap-2"><MapPin className="w-4 h-4" /> Datos que ve el público</h3>
            <div>
              <label className="label" htmlFor="ev-name">Nombre de la feria</label>
              <input id="ev-name" className="input" value={form.fairName} maxLength={150} onChange={(e) => setField('fairName', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="ev-venue">Lugar</label>
              <input id="ev-venue" className="input" value={form.venue} maxLength={200} onChange={(e) => setField('venue', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="ev-maps">Enlace de Google Maps</label>
              <div className="flex gap-2">
                <input id="ev-maps" className="input" value={form.mapsUrl} maxLength={500} onChange={(e) => setField('mapsUrl', e.target.value)} placeholder="https://maps.app.goo.gl/…" />
                <a href={form.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-icon shrink-0" title="Abrir el mapa" aria-label="Abrir el mapa"><ExternalLink className="w-4 h-4" /></a>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="ev-dates">Fechas</label>
                <input id="ev-dates" className="input" value={form.datesText} maxLength={150} onChange={(e) => setField('datesText', e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="ev-stand">Texto del stand</label>
                <input id="ev-stand" className="input" value={form.standText} maxLength={150} onChange={(e) => setField('standText', e.target.value)} placeholder="Acércate al stand de Marketing VIP" />
              </div>
            </div>
            <p className="help">El texto del stand sale en el pase del premio, en el ticket impreso y en el mensaje de WhatsApp.</p>
          </section>

          <section className="card card-pad space-y-4 xl:col-span-2 self-start">
            <h3 className="panel-title">Apertura y cierre</h3>
            <div>
              <label className="label" htmlFor="ev-close">Cierre automático (hora de Quito)</label>
              <input id="ev-close" type="datetime-local" className="input" value={form.closesAt} onChange={(e) => setField('closesAt', e.target.value)} />
              <p className="help">Después de esa hora nadie nuevo puede jugar en {current.city}. Quien ya jugó sigue viendo su premio.</p>
            </div>
            <button type="button" onClick={() => setField('isOpen', !form.isOpen)} className={`w-full rounded-2xl border-2 p-4 flex items-center gap-3 text-left transition-all cursor-pointer ${form.isOpen ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${form.isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{form.isOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}</span>
              <span>
                <span className="block font-bold text-ink">{form.isOpen ? 'Participaciones abiertas' : 'Feria cerrada manualmente'}</span>
                <span className="block text-xs text-ink-muted">{form.isOpen ? 'Toca para cerrar ahora mismo' : 'Toca para volver a abrir'}</span>
              </span>
            </button>
            {current.closed && <div className="notice-danger text-sm"><Lock className="w-4 h-4 shrink-0 mt-0.5" /><span>{current.isOpen ? 'La hora de cierre ya pasó: la feria está cerrada.' : 'La feria está cerrada manualmente.'}</span></div>}
          </section>

          <div className="xl:col-span-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <button type="button" onClick={save} disabled={saving || !dirty || missingTable} className="btn-primary sm:w-auto px-6"><Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar cambios'}</button>
            {dirty && !saving && <span className="text-xs font-semibold text-amber-700">Tienes cambios sin guardar</span>}
            {error && <span className="notice-danger !py-2 text-sm flex-1"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</span>}
          </div>

          <section className="card card-pad space-y-3 xl:col-span-5">
            <h3 className="panel-title flex items-center gap-2"><Link2 className="w-4 h-4" /> Enlaces de {current.city}</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {links.map((l) => (
                <div key={l.key} className="rounded-xl bg-surface-2 border border-line p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-ink-2 leading-snug">{l.label}</span>
                    <button type="button" onClick={() => copy(l.key, l.url)} className="btn-ghost btn-sm shrink-0"><Copy className="w-3.5 h-3.5" /> {copied === l.key ? 'Copiado' : 'Copiar'}</button>
                  </div>
                  <p className="text-[11px] font-mono text-ink-muted break-all">{l.url}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
