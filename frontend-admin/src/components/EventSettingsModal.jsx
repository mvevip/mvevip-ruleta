import React, { useEffect, useMemo, useState } from 'react';
import { X, Save, MapPin, Copy, AlertTriangle, Lock, Unlock, Link2 } from 'lucide-react';

/**
 * Datos de las ferias (Riobamba / Ambato): nombre, lugar, mapa, fechas, texto del stand, cierre y apertura.
 * Lo que se guarda aplica en pocos segundos a los 3 frentes de la ciudad (pantalla gigante, kiosco y correo):
 * pase del celular, correo, ticket impreso y mensaje de WhatsApp. También muestra los enlaces de la ciudad.
 */

const QUITO_OFFSET_MS = 5 * 3600 * 1000; // Quito = UTC-5 todo el año

function isoToQuitoInput(iso) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  return new Date(ms - QUITO_OFFSET_MS).toISOString().slice(0, 16);
}

function quitoInputToIso(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || '') ? `${value}:00-05:00` : '';
}

const PREFIX = { riobamba: 'RIO', ambato: 'AMB' };

export default function EventSettingsModal({ apiUrl, getAdminHeaders, initialEvent = 'riobamba', linksBase, onClose, onNotification }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [missingTable, setMissingTable] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventKey, setEventKey] = useState(initialEvent);
  const [form, setForm] = useState(null);
  const [copied, setCopied] = useState('');

  const load = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/events`, { headers: getAdminHeaders() });
      const json = await res.json();
      if (json.success) {
        setEvents(json.data);
        setMissingTable(Boolean(json.missingTable));
      } else {
        setError(json.message || 'No se pudo leer la configuración.');
      }
    } catch (e) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const current = useMemo(() => events.find((e) => e.event === eventKey), [events, eventKey]);

  useEffect(() => {
    if (!current) return;
    setError('');
    setForm({
      fairName: current.fairName,
      venue: current.venue,
      mapsUrl: current.mapsUrl,
      datesText: current.datesText,
      standText: current.standText,
      closesAt: isoToQuitoInput(current.closesAt),
      isOpen: current.isOpen
    });
  }, [current]);

  const dirty = Boolean(current && form) && (
    form.fairName !== current.fairName || form.venue !== current.venue || form.mapsUrl !== current.mapsUrl ||
    form.datesText !== current.datesText || form.standText !== current.standText ||
    quitoInputToIso(form.closesAt) !== current.closesAt || form.isOpen !== current.isOpen
  );

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const save = async () => {
    setError('');
    const closesAt = quitoInputToIso(form.closesAt);
    if (!closesAt) { setError('Indica la fecha y hora de cierre.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/events/${eventKey}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          fairName: form.fairName, venue: form.venue, mapsUrl: form.mapsUrl, datesText: form.datesText,
          standText: form.standText, closesAt, isOpen: form.isOpen
        })
      });
      const json = await res.json();
      if (json.success) {
        onNotification && onNotification(`Datos de ${current.city} guardados. Se aplican en unos segundos.`);
        await load();
      } else {
        setError(json.message || 'No se pudo guardar.');
      }
    } catch (e) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 1800);
    } catch (e) {
      window.prompt('Copia el enlace:', text);
    }
  };

  const prefix = PREFIX[eventKey] || 'RIO';
  const base = linksBase || 'https://autos.mvevip.com';
  const links = [
    { key: 'screen', label: 'Pantalla gigante', url: `${base}/pantalla/?screen=${prefix}_STAND` },
    { key: 'qr', label: 'Celular (QR de la pantalla gigante)', url: `${base}/?screen=${prefix}_STAND` },
    { key: 'kt', label: 'Kiosco · pantalla de ARRIBA', url: `${base}/pantalla/?screen=${prefix}_KIOSK` },
    { key: 'kb', label: 'Kiosco · pantalla de ABAJO (pon tu clave en k=)', url: `${base}/pantalla/?view=kiosk-button&screen=${prefix}_KIOSK&k=TU_CLAVE` },
    { key: 'kp', label: 'Kiosco · celular (QR del kiosco)', url: `${base}/?screen=${prefix}_KIOSK` },
    { key: 'mail', label: 'Correo (para Brevo)', url: `${base}/?view=mail&ev=${eventKey}&correo={{ contact.EMAIL }}&c=feria_${eventKey}` }
  ];

  const input = 'w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-[#9AC31C]';
  const label = 'text-[10px] text-zinc-400 font-racing uppercase tracking-wider block mb-1';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-zinc-950 border border-zinc-700 rounded-3xl p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-racing font-black text-sm text-white uppercase flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#9AC31C]" /> Datos de la feria
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-900 rounded-2xl border border-zinc-800">
          {['riobamba', 'ambato'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setEventKey(key)}
              className={`py-2 rounded-xl font-racing font-bold text-[11px] uppercase transition-all cursor-pointer ${
                eventKey === key ? (key === 'riobamba' ? 'bg-sky-500 text-black' : 'bg-rose-500 text-black') : 'text-zinc-400'
              }`}
            >
              {key === 'riobamba' ? '🌄 Riobamba' : '🏔️ Ambato'}
            </button>
          ))}
        </div>

        {loading && <p className="text-xs text-zinc-400 text-center py-6">Cargando…</p>}

        {missingTable && (
          <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-500/60 text-[11px] text-amber-200 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Falta ejecutar la migración 010 (tabla <code>event_settings</code>) en RDS. Mientras tanto rigen los datos por defecto y no se puede guardar.</span>
          </div>
        )}

        {form && current && (
          <>
            <div className="space-y-2.5">
              <div>
                <span className={label}>Nombre de la feria</span>
                <input className={input} value={form.fairName} maxLength={150} onChange={(e) => setField('fairName', e.target.value)} />
              </div>
              <div>
                <span className={label}>Lugar</span>
                <input className={input} value={form.venue} maxLength={200} onChange={(e) => setField('venue', e.target.value)} />
              </div>
              <div>
                <span className={label}>Enlace de Google Maps (https://…)</span>
                <input className={input} value={form.mapsUrl} maxLength={500} onChange={(e) => setField('mapsUrl', e.target.value)} />
              </div>
              <div>
                <span className={label}>Fechas</span>
                <input className={input} value={form.datesText} maxLength={150} onChange={(e) => setField('datesText', e.target.value)} />
              </div>
              <div>
                <span className={label}>Texto del stand (sale en el pase y el ticket impreso)</span>
                <input className={input} value={form.standText} maxLength={150} onChange={(e) => setField('standText', e.target.value)} placeholder="Acércate al stand de Marketing VIP" />
              </div>
              <div>
                <span className={label}>Cierre automático (hora de Quito)</span>
                <input type="datetime-local" className={input} value={form.closesAt} onChange={(e) => setField('closesAt', e.target.value)} />
                <p className="text-[10px] text-zinc-500 mt-1">Después de esta hora no se aceptan participaciones nuevas en la pantalla gigante, el kiosco ni el correo de {current.city}. Quien ya jugó sigue viendo su premio.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setField('isOpen', !form.isOpen)}
              className={`w-full py-2.5 rounded-xl border font-racing font-bold text-[11px] uppercase flex items-center justify-center gap-2 cursor-pointer ${
                form.isOpen ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300' : 'bg-red-950/60 border-red-500/60 text-red-300'
              }`}
            >
              {form.isOpen ? <><Unlock className="w-4 h-4" /> Participaciones ABIERTAS (pulsa para cerrar ya)</> : <><Lock className="w-4 h-4" /> Feria CERRADA manualmente (pulsa para reabrir)</>}
            </button>

            {current.closed && (
              <p className="text-[11px] text-red-300 bg-red-950/50 border border-red-500/40 rounded-xl px-3 py-2">
                {current.isOpen ? 'La hora de cierre ya pasó: la feria está cerrada.' : 'La feria está cerrada manualmente.'} Nadie nuevo puede jugar en {current.city}.
              </p>
            )}

            {error && (
              <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-500/60 text-[11px] text-red-200 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty || missingTable}
              className="w-full py-3 rounded-2xl bg-[#9AC31C] text-black font-racing font-black text-xs uppercase flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar datos de la feria'}
            </button>

            <div className="pt-2 border-t border-zinc-800 space-y-1.5">
              <h4 className="font-racing font-bold text-[11px] text-[#9AC31C] uppercase flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" /> Enlaces de {current.city}
              </h4>
              {links.map((l) => (
                <div key={l.key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-zinc-300 font-bold">{l.label}</span>
                    <button
                      type="button"
                      onClick={() => copy(l.key, l.url)}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> {copied === l.key ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-500 break-all mt-1">{l.url}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
