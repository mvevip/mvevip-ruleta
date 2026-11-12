import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Plus, Pencil, Trash2, Copy, Download, ExternalLink, BarChart3, Info, AlertTriangle, ScanLine } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { PageHeader, EmptyState, Switch, Modal, Spinner } from '../components/ui';

/**
 * QR dinámicos: el QR impreso apunta a un enlace corto fijo (https://autos.mvevip.com/api/q/<slug>) que redirige
 * al destino que se elige aquí. Cambiar el destino NO cambia el QR: no hay que reimprimir.
 */
const SITE = 'https://autos.mvevip.com';
export const shortUrl = (slug) => `${SITE}/api/q/${slug}`;

const PRESETS = [
  { group: 'Riobamba', label: 'Pantalla gigante (stand)', url: `${SITE}/?screen=RIO_STAND` },
  { group: 'Riobamba', label: 'Kiosco', url: `${SITE}/?screen=RIO_KIOSK` },
  { group: 'Riobamba', label: 'Correo de la feria', url: `${SITE}/?view=mail&ev=riobamba&c=feria_riobamba` },
  { group: 'Ambato', label: 'Pantalla gigante (stand)', url: `${SITE}/?screen=AMB_STAND` },
  { group: 'Ambato', label: 'Kiosco', url: `${SITE}/?screen=AMB_KIOSK` },
  { group: 'Ambato', label: 'Correo de la feria', url: `${SITE}/?view=mail&ev=ambato&c=feria_ambato` },
  { group: 'Otros', label: 'Correo general (clientes normales)', url: `${SITE}/?view=mail&ev=general&c=campana_general` },
  { group: 'Otros', label: 'Autos (inicio)', url: `${SITE}/` },
  { group: 'Otros', label: 'Kiosco de Autos', url: `${SITE}/?screen=KIOSK_01` }
];
const presetName = (url) => { const p = PRESETS.find((x) => x.url === url); return p ? `${p.group} · ${p.label}` : null; };

const QR_OPTS = { errorCorrectionLevel: 'H', margin: 4 };
const slugOk = (s) => /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(s);
const fileBase = (slug) => `qr-${slug}`;

function download(href, filename) {
  const a = document.createElement('a');
  a.href = href; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}

/** Vista previa del QR (SVG en línea, nítida a cualquier tamaño). */
function QrPreview({ slug, className = '' }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toString(shortUrl(slug), { ...QR_OPTS, type: 'svg' }).then((s) => { if (alive) setSvg(s); }).catch(() => {});
    return () => { alive = false; };
  }, [slug]);
  return <div className={`bg-white rounded-xl border border-line p-1.5 [&>svg]:w-full [&>svg]:h-full ${className}`} aria-label={`QR de ${shortUrl(slug)}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

async function exportPng(slug) {
  // 2400 px de lado: alcanza para imprimir hasta ~20 cm a 300 ppp
  const href = await QRCode.toDataURL(shortUrl(slug), { ...QR_OPTS, width: 2400 });
  download(href, `${fileBase(slug)}.png`);
}
async function exportSvg(slug) {
  const svg = await QRCode.toString(shortUrl(slug), { ...QR_OPTS, type: 'svg' });
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  download(url, `${fileBase(slug)}.svg`);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function QrForm({ item, onSave, onClose, busy }) {
  const editing = Boolean(item);
  const [name, setName] = useState(item ? item.name : '');
  const [target, setTarget] = useState(item ? item.target_url : PRESETS[3].url);
  const [slug, setSlug] = useState(item ? item.slug : '');
  const [custom, setCustom] = useState(item ? !PRESETS.some((p) => p.url === item.target_url) : false);

  const groups = useMemo(() => PRESETS.reduce((acc, p) => { (acc[p.group] = acc[p.group] || []).push(p); return acc; }, {}), []);
  const slugChanged = editing && slug !== item.slug;
  const targetOk = /^https:\/\/\S+$/.test(target.trim());
  const valid = name.trim() && targetOk && (!slug || slugOk(slug));

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid) onSave({ name: name.trim(), target_url: target.trim(), slug: slug.trim() }); }} className="space-y-4">
      <div>
        <label className="label" htmlFor="qr-name">Nombre (solo para ti)</label>
        <input id="qr-name" autoFocus className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: QR mesa de entrada" maxLength={80} />
      </div>

      <div>
        <label className="label" htmlFor="qr-dest">¿A dónde lleva?</label>
        <select
          id="qr-dest" className="input"
          value={custom ? '__custom' : target}
          onChange={(e) => { if (e.target.value === '__custom') { setCustom(true); } else { setCustom(false); setTarget(e.target.value); } }}
        >
          {Object.entries(groups).map(([g, list]) => (
            <optgroup key={g} label={g}>{list.map((p) => <option key={p.url} value={p.url}>{p.label}</option>)}</optgroup>
          ))}
          <option value="__custom">Otro enlace (escribirlo)…</option>
        </select>
        {custom && <input className="input mt-2" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="https://…" inputMode="url" autoCapitalize="none" spellCheck="false" aria-label="Enlace de destino" />}
        {!targetOk && <p className="text-xs font-semibold text-red-600 mt-1.5">El enlace debe empezar con https://</p>}
        <p className="text-xs text-ink-muted mt-1.5 break-all">{target}</p>
      </div>

      <div>
        <label className="label" htmlFor="qr-slug">Enlace corto {editing ? '' : '(opcional)'}</label>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-ink-muted shrink-0">…/api/q/</span>
          <input id="qr-slug" className="input font-mono" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="se genera solo" maxLength={40} autoCapitalize="none" spellCheck="false" />
        </div>
        {slug && !slugOk(slug) && <p className="text-xs font-semibold text-red-600 mt-1.5">Usa 3 a 40 letras minúsculas, números o guiones.</p>}
        {slugChanged && (
          <div className="notice-warn mt-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span className="text-xs">Si cambias el enlace corto, el QR ya impreso con el enlace anterior dejará de funcionar. Solo cambia el destino para conservar el QR.</span></div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="btn-soft flex-1">Cancelar</button>
        <button type="submit" disabled={!valid || busy} className="btn-primary flex-1">{busy ? <Spinner className="w-4 h-4" /> : editing ? 'Guardar' : 'Crear QR'}</button>
      </div>
    </form>
  );
}

function ScansChart({ id }) {
  const { apiFetch } = useAdmin();
  const [days, setDays] = useState(null);
  useEffect(() => {
    let alive = true;
    apiFetch(`/api/admin/qr/${id}/stats`).then((r) => r.json()).then((j) => { if (alive && j.success) setDays(j.data); }).catch(() => {});
    return () => { alive = false; };
  }, [apiFetch, id]);
  if (!days) return <div className="skeleton h-16 w-full" />;
  const max = Math.max(1, ...days.map((d) => d.total));
  return (
    <div>
      <div className="flex items-end gap-[3px] h-16" role="img" aria-label="Escaneos por día, últimos 30 días">
        {days.map((d) => (
          <div key={d.day} className="flex-1 bg-brand/80 rounded-t-sm min-h-[2px]" style={{ height: `${Math.max(3, (d.total / max) * 100)}%`, opacity: d.total ? 1 : 0.25 }} title={`${d.day}: ${d.total}`} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-ink-muted mt-1"><span>hace 30 días</span><span>hoy</span></div>
    </div>
  );
}

function QrCard({ item, onEdit, onToggle, onDelete, toast }) {
  const [showStats, setShowStats] = useState(false);
  const url = shortUrl(item.slug);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast('Enlace copiado'); } catch (_) { toast(url, 'info'); }
  };
  return (
    <li className={`card card-pad !p-4 space-y-3 ${item.active ? '' : 'opacity-70'}`}>
      <div className="flex items-start gap-3">
        <QrPreview slug={item.slug} className="w-24 h-24 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-ink leading-tight break-words">{item.name}</h3>
            <Switch checked={item.active} onChange={onToggle} label="QR activo" />
          </div>
          <button type="button" onClick={copy} className="flex items-center gap-1.5 text-xs font-mono text-navy hover:underline cursor-pointer break-all text-left"><Copy className="w-3.5 h-3.5 shrink-0" />{url}</button>
          <p className="text-xs text-ink-muted break-all"><span className="font-semibold text-ink-2">Lleva a:</span> {presetName(item.target_url) || item.target_url}</p>
          {!item.active && <p className="text-xs font-semibold text-amber-600">Desactivado: quien lo escanee irá al inicio.</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[['Hoy', item.scans_today], ['7 días', item.scans_7d], ['Total', item.scans_total]].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-slate-50 py-2"><div className="text-lg font-black text-navy leading-none">{v}</div><div className="text-[11px] text-ink-muted font-semibold mt-1">{l}</div></div>
        ))}
      </div>

      {showStats && <ScansChart id={item.id} />}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary !py-2 text-sm" onClick={() => exportPng(item.slug).catch(() => toast('No se pudo generar el PNG', 'error'))}><Download className="w-4 h-4" /> PNG</button>
        <button type="button" className="btn-primary !py-2 text-sm" onClick={() => exportSvg(item.slug).catch(() => toast('No se pudo generar el SVG', 'error'))}><Download className="w-4 h-4" /> SVG</button>
        <a href={url} target="_blank" rel="noreferrer" className="btn-soft !py-2 text-sm"><ExternalLink className="w-4 h-4" /> Probar</a>
        <button type="button" className="btn-soft !py-2 text-sm" onClick={() => setShowStats((v) => !v)}><BarChart3 className="w-4 h-4" /> Escaneos</button>
        <button type="button" className="btn-soft !py-2 text-sm" onClick={onEdit}><Pencil className="w-4 h-4" /> Cambiar destino</button>
        <button type="button" className="btn-icon w-9 h-9 text-red-600" onClick={onDelete} aria-label="Eliminar QR"><Trash2 className="w-4 h-4" /></button>
      </div>
    </li>
  );
}

export default function QrCodes() {
  const { apiFetch, toast } = useAdmin();
  const [items, setItems] = useState(null);
  const [missing, setMissing] = useState(false);
  const [modal, setModal] = useState(null); // null | 'new' | item
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/qr');
      const json = await res.json();
      if (json.success) { setItems(json.data); setMissing(false); } else if (json.code === 'MISSING_TABLE') { setMissing(true); setItems([]); }
    } catch (_) { /* sesión */ }
  }, [apiFetch]);
  useEffect(() => { load(); }, [load]);

  const call = async (path, method, body, okMsg) => {
    setBusy(true);
    try {
      const res = await apiFetch(path, { method, body: body ? JSON.stringify(body) : undefined });
      const json = await res.json();
      if (json.success) { if (okMsg) toast(okMsg); await load(); return true; }
      toast(json.message || 'No se pudo completar la acción', 'error');
    } catch (_) { /* sesión */ } finally { setBusy(false); }
    return false;
  };

  const save = async (data) => {
    const ok = modal === 'new'
      ? await call('/api/admin/qr', 'POST', data, 'QR creado')
      : await call(`/api/admin/qr/${modal.id}`, 'PUT', data, 'Destino guardado: el QR ya apunta al nuevo sitio');
    if (ok) setModal(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 anim-fade-in">
      <PageHeader
        title="Códigos QR"
        icon={QrCode}
        subtitle="Imprime el QR una sola vez y cambia a dónde lleva cuando quieras."
        actions={<button type="button" className="btn-primary" onClick={() => setModal('new')} disabled={missing}><Plus className="w-4 h-4" /> Nuevo QR</button>}
      />

      <div className="notice-info"><Info className="w-5 h-5 shrink-0 mt-0.5" /><span className="text-sm">El QR contiene un enlace corto fijo. Al cambiar el <strong>destino</strong> aquí, el cambio es inmediato y el QR impreso sigue sirviendo. Se cuenta cada persona que lo abre (no las vistas previas automáticas de WhatsApp).</span></div>

      {missing && (
        <div className="notice-warn"><AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" /><span className="text-sm">Falta ejecutar la migración <code>013_qr_dinamicos.sql</code> en la base de datos para usar esta sección.</span></div>
      )}

      {items === null ? (
        <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="card card-pad"><div className="skeleton h-28" /></div>)}</div>
      ) : items.length === 0 ? (
        !missing && <EmptyState icon={ScanLine} title="Todavía no hay QR" text="Crea el primero: elige a dónde lleva y descarga el QR en PNG o SVG." action={<button type="button" className="btn-primary" onClick={() => setModal('new')}><Plus className="w-4 h-4" /> Nuevo QR</button>} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((it) => (
            <QrCard
              key={it.id} item={it} toast={toast}
              onEdit={() => setModal(it)}
              onToggle={(v) => call(`/api/admin/qr/${it.id}`, 'PUT', { active: v }, v ? 'QR activado' : 'QR desactivado')}
              onDelete={() => { if (window.confirm(`¿Eliminar "${it.name}"? El QR impreso dejará de llevar a un destino (irá al inicio) y se perderá su conteo.`)) call(`/api/admin/qr/${it.id}`, 'DELETE', null, 'QR eliminado'); }}
            />
          ))}
        </ul>
      )}

      {modal && (
        <Modal title={modal === 'new' ? 'Nuevo QR' : 'Cambiar destino'} onClose={() => setModal(null)}>
          <QrForm item={modal === 'new' ? null : modal} onSave={save} onClose={() => setModal(null)} busy={busy} />
        </Modal>
      )}
    </div>
  );
}
