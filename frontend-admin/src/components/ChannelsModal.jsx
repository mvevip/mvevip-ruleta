import React, { useEffect, useState } from 'react';
import { X, Save, Link2, Star, AlertTriangle, Copy } from 'lucide-react';

const CHANNEL_DEFS = [
  { key: 'autos', label: 'Stand AUTOS', emoji: '🏎️', url: '/?screen=STAND_01', hint: 'Formulario del stand Autos (QR de /pantalla)' },
  { key: 'ford', label: 'Stand FORD', emoji: '🚘', url: '/formulario2', hint: 'Formulario del stand Ford (QR de /pantalla2)' },
  { key: 'mail', label: 'CORREO (campaña)', emoji: '📧', url: '/?view=mail', hint: 'Ruleta en el celular del cliente (enlace de Brevo)' }
];

/**
 * Canales de acceso: habilitar/deshabilitar cada uno y elegir el "por defecto".
 *  - Enlace sin parámetros (autos.mvevip.com) -> canal por defecto.
 *  - Acceso explícito a un canal deshabilitado -> canal por defecto.
 */
export default function ChannelsModal({ apiUrl, origin, getAdminHeaders, onClose, onNotification }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [missingTable, setMissingTable] = useState(false);
  const [enabled, setEnabled] = useState({ autos: true, ford: true, mail: true });
  const [defaultChannel, setDefaultChannel] = useState('autos');
  const [saved, setSaved] = useState({ enabled: null, defaultChannel: null });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/admin/channels`, { headers: getAdminHeaders() });
        const json = await res.json();
        if (json.success) {
          const en = { autos: json.channels.autos.enabled, ford: json.channels.ford.enabled, mail: json.channels.mail.enabled };
          setEnabled(en);
          setDefaultChannel(json.default);
          setSaved({ enabled: en, defaultChannel: json.default });
          setMissingTable(Boolean(json.missingTable));
        } else {
          setError(json.message || 'No se pudo leer la configuración.');
        }
      } catch (e) {
        setError('No se pudo conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const enabledCount = Object.values(enabled).filter(Boolean).length;

  const toggle = (key) => {
    setError('');
    const next = { ...enabled, [key]: !enabled[key] };
    if (!Object.values(next).some(Boolean)) {
      setError('Debe quedar al menos un canal habilitado.');
      return;
    }
    setEnabled(next);
    // Si se deshabilita el que era por defecto, el por defecto pasa al primer canal habilitado
    if (!next[defaultChannel]) {
      setDefaultChannel(CHANNEL_DEFS.find((c) => next[c.key]).key);
    }
  };

  const chooseDefault = (key) => {
    if (!enabled[key]) return;
    setDefaultChannel(key);
  };

  const dirty = saved.enabled && (
    JSON.stringify(enabled) !== JSON.stringify(saved.enabled) || defaultChannel !== saved.defaultChannel
  );

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/api/admin/channels`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ channels: enabled, default: defaultChannel })
      });
      const json = await res.json();
      if (json.success) {
        setSaved({ enabled: { ...enabled }, defaultChannel });
        onNotification && onNotification('Canales actualizados');
      } else {
        setMissingTable(Boolean(json.missingTable));
        setError(json.message || 'No se pudo guardar.');
      }
    } catch (e) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const copy = (text) => {
    try { navigator.clipboard.writeText(text); onNotification && onNotification('Enlace copiado'); } catch (_) {}
  };

  const defaultLabel = CHANNEL_DEFS.find((c) => c.key === defaultChannel)?.label;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-4 space-y-3 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-racing font-bold text-sm text-white uppercase tracking-wider">Canales de acceso</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 active:scale-95" title="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-zinc-400">
          Habilita o deshabilita cada acceso y elige el <strong className="text-white">canal por defecto</strong>.
          Quien abra <span className="font-mono text-zinc-200">{origin}</span> sin parámetros irá al canal por defecto;
          quien entre a un canal deshabilitado también.
        </p>

        {missingTable && (
          <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-[11px] flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Falta crear la tabla <strong>channel_settings</strong> en la base de datos (migración 006). Mientras tanto todos los canales funcionan habilitados y no se podrá guardar.</span>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-400 animate-pulse">Cargando…</div>
        ) : (
          <>
            <div className="space-y-2">
              {CHANNEL_DEFS.map(({ key, label, emoji, url, hint }) => {
                const isOn = enabled[key];
                const isDefault = defaultChannel === key;
                return (
                  <div key={key} className={`p-3 rounded-2xl border space-y-2 ${isOn ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-950 border-zinc-800 opacity-70'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-racing font-bold text-xs text-white">{emoji} {label}</div>
                        <div className="text-[10px] text-zinc-500">{hint}</div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isOn}
                        onClick={() => toggle(key)}
                        className={`relative w-12 h-7 rounded-full transition-colors shrink-0 cursor-pointer ${isOn ? 'bg-[#9AC31C]' : 'bg-zinc-700'}`}
                        title={isOn ? 'Habilitado: tocar para deshabilitar' : 'Deshabilitado: tocar para habilitar'}
                      >
                        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${isOn ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => chooseDefault(key)}
                        disabled={!isOn}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-racing font-bold uppercase border transition-all ${
                          isDefault
                            ? 'bg-amber-500 text-black border-amber-400'
                            : isOn
                              ? 'bg-zinc-800 text-zinc-300 border-zinc-700 cursor-pointer'
                              : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                        }`}
                      >
                        <Star className={`w-3 h-3 ${isDefault ? 'fill-black' : ''}`} />
                        {isDefault ? 'Por defecto' : 'Poner por defecto'}
                      </button>
                      <button type="button" onClick={() => copy(`${origin}${url}`)} className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white font-mono cursor-pointer" title="Copiar enlace">
                        <Link2 className="w-3 h-3" /> {url} <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
              <div>🔗 <span className="font-mono">{origin}/</span> (sin parámetros) → <strong className="text-amber-300">{defaultLabel}</strong></div>
              {CHANNEL_DEFS.filter((c) => !enabled[c.key]).map((c) => (
                <div key={c.key} className="text-zinc-400">⛔ {c.label} deshabilitado → sus visitantes van a <strong className="text-amber-300">{defaultLabel}</strong></div>
              ))}
              <div className="text-zinc-500">Quien ya participó sigue viendo su premio y su cita aunque el canal se deshabilite.</div>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-[11px]">{error}</div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty || enabledCount === 0}
              className="w-full py-3 rounded-2xl bg-[#9AC31C] text-black font-racing font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Save className="w-4 h-4" /> {saving ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Sin cambios'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
