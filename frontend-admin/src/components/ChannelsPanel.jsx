import React, { useEffect, useState } from 'react';
import { Save, Link2, Star, AlertTriangle, Copy } from 'lucide-react';
import { useAdmin, PUBLIC_ORIGIN } from '../context/AdminContext';
import { Switch } from './ui';

const CHANNEL_DEFS = [
  { key: 'autos', label: 'Stand Autos', emoji: '🏎️', url: '/?screen=STAND_01', hint: 'Formulario del stand Autos (QR de /pantalla)' },
  { key: 'ford', label: 'Stand Ford', emoji: '🚘', url: '/formulario2', hint: 'Formulario del stand Ford (QR de /pantalla2)' },
  { key: 'mail', label: 'Correo (campaña de cuotas)', emoji: '📧', url: '/?view=mail&ev=cuotas', hint: 'Ruleta en el celular del cliente (enlace de Brevo)' }
];

/**
 * Canales de acceso: habilitar/deshabilitar cada uno y elegir el "por defecto".
 *  - Enlace sin parámetros (autos.mvevip.com) -> canal por defecto.
 *  - Acceso explícito a un canal deshabilitado -> canal por defecto.
 * (Las ferias de Riobamba y Ambato se abren y cierran desde "Datos de la feria".)
 */
export default function ChannelsPanel() {
  const { apiFetch, toast } = useAdmin();
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
        const res = await apiFetch('/api/admin/channels');
        const json = await res.json();
        if (json.success) {
          const en = { autos: json.channels.autos.enabled, ford: json.channels.ford.enabled, mail: json.channels.mail.enabled };
          setEnabled(en); setDefaultChannel(json.default); setSaved({ enabled: en, defaultChannel: json.default }); setMissingTable(Boolean(json.missingTable));
        } else setError(json.message || 'No se pudo leer la configuración.');
      } catch (_) { /* sesión */ } finally { setLoading(false); }
    })();
  }, [apiFetch]);

  const toggle = (key) => {
    setError('');
    const next = { ...enabled, [key]: !enabled[key] };
    if (!Object.values(next).some(Boolean)) { setError('Debe quedar al menos un canal habilitado.'); return; }
    setEnabled(next);
    if (!next[defaultChannel]) setDefaultChannel(CHANNEL_DEFS.find((c) => next[c.key]).key);
  };

  const dirty = saved.enabled && (JSON.stringify(enabled) !== JSON.stringify(saved.enabled) || defaultChannel !== saved.defaultChannel);

  const save = async () => {
    setSaving(true); setError('');
    try {
      const res = await apiFetch('/api/admin/channels', { method: 'PUT', body: JSON.stringify({ channels: enabled, default: defaultChannel }) });
      const json = await res.json();
      if (json.success) { setSaved({ enabled: { ...enabled }, defaultChannel }); toast('Canales actualizados'); }
      else { setMissingTable(Boolean(json.missingTable)); setError(json.message || 'No se pudo guardar.'); }
    } catch (_) { /* sesión */ } finally { setSaving(false); }
  };

  const copy = (text) => { try { navigator.clipboard.writeText(text); toast('Enlace copiado'); } catch (_) {} };
  const defaultLabel = CHANNEL_DEFS.find((c) => c.key === defaultChannel)?.label;

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-ink-2 leading-relaxed">
        Elige qué accesos están abiertos y a cuál va quien entra a <strong className="font-mono">{PUBLIC_ORIGIN}</strong> sin parámetros (el <strong>canal por defecto</strong>).
        Quien entre a un acceso deshabilitado también irá al canal por defecto. Quien ya participó sigue viendo su premio.
      </p>

      {missingTable && <div className="notice-warn"><AlertTriangle className="w-5 h-5 shrink-0" /><span className="text-sm">Falta crear la tabla <strong>channel_settings</strong> (migración 006). Mientras tanto todos los canales funcionan habilitados y no se podrá guardar.</span></div>}

      {loading ? <div className="card card-pad"><div className="skeleton h-32 w-full" /></div> : (
        <>
          <div className="space-y-3">
            {CHANNEL_DEFS.map(({ key, label, emoji, url, hint }) => {
              const isOn = enabled[key];
              const isDefault = defaultChannel === key;
              return (
                <div key={key} className={`card card-pad space-y-3 ${isOn ? '' : 'opacity-70'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">{emoji}</span>
                      <div className="min-w-0"><div className="font-bold text-ink">{label}</div><div className="text-xs text-ink-muted">{hint}</div></div>
                    </div>
                    <Switch checked={isOn} onChange={() => toggle(key)} label={`${isOn ? 'Deshabilitar' : 'Habilitar'} ${label}`} />
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <button type="button" onClick={() => isOn && setDefaultChannel(key)} disabled={!isOn} className={`chip ${isDefault ? '!bg-amber-100 !border-amber-300 !text-amber-800' : ''} ${!isOn ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <Star className={`w-3.5 h-3.5 ${isDefault ? 'fill-amber-500 text-amber-500' : ''}`} /> {isDefault ? 'Canal por defecto' : 'Poner por defecto'}
                    </button>
                    <button type="button" onClick={() => copy(`${PUBLIC_ORIGIN}${url}`)} className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink font-mono cursor-pointer"><Link2 className="w-3.5 h-3.5" /> {url} <Copy className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="notice-info text-sm leading-relaxed">
            <div>
              🔗 <span className="font-mono">{PUBLIC_ORIGIN}/</span> sin parámetros → <strong>{defaultLabel}</strong>
              {CHANNEL_DEFS.filter((c) => !enabled[c.key]).map((c) => <div key={c.key}>⛔ {c.label} deshabilitado → sus visitantes van a <strong>{defaultLabel}</strong></div>)}
            </div>
          </div>

          {error && <div className="notice-danger text-sm">{error}</div>}
          <button type="button" onClick={save} disabled={saving || !dirty} className="btn-primary"><Save className="w-4 h-4" /> {saving ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Sin cambios'}</button>
        </>
      )}
    </div>
  );
}
