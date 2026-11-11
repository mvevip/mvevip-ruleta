import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, Save, Info, PackageX, AlertTriangle } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { PageHeader, EmptyState, Switch } from '../components/ui';
import PrizeIconPicker from '../components/PrizeIconPicker';

/** Premios del evento: stock, probabilidad, tope diario, ícono y estado de cada uno. */
export default function Prizes() {
  const { apiFetch, activeStand, meta, group, toast } = useAdmin();
  const [prizes, setPrizes] = useState(null);
  const [original, setOriginal] = useState({});
  const [saving, setSaving] = useState(null);
  const usesIcons = meta.front === 'mail' || meta.isFair; // la ruleta del celular dibuja íconos

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/admin/prizes?stand=${activeStand}`);
      const json = await res.json();
      if (json.success) {
        setPrizes(json.data);
        setOriginal(Object.fromEntries(json.data.map((p) => [p.id, JSON.stringify(p)])));
      }
    } catch (_) { /* sesión */ }
  }, [apiFetch, activeStand]);

  useEffect(() => { setPrizes(null); load(); }, [load]);

  const change = (id, field, value) => setPrizes((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  const isDirty = (p) => original[p.id] !== JSON.stringify(p);

  const save = async (prize) => {
    setSaving(prize.id);
    try {
      const res = await apiFetch(`/api/admin/prizes/${prize.id}`, { method: 'PUT', body: JSON.stringify(prize) });
      const json = await res.json();
      if (json.success) { toast(`"${prize.name}" guardado`); await load(); }
      else toast(json.message || 'No se pudo guardar el premio', 'error');
    } catch (_) { /* sesión */ } finally { setSaving(null); }
  };

  const activeCount = useMemo(() => (prizes || []).filter((p) => p.active && p.stock > 0).length, [prizes]);
  const totalStock = useMemo(() => (prizes || []).reduce((s, p) => s + (p.active ? Number(p.stock) || 0 : 0), 0), [prizes]);
  const maxStock = useMemo(() => Math.max(1, ...(prizes || []).map((p) => Number(p.stock) || 0)), [prizes]);

  return (
    <div className="space-y-4 anim-fade-in">
      <PageHeader
        title="Premios"
        icon={Award}
        subtitle={meta.isFair ? `Catálogo de la feria de ${group.city}` : `Catálogo de ${meta.title.toLowerCase()}`}
        actions={prizes && <span className="badge-lime">{activeCount} activos · {totalStock} unidades en stock</span>}
      />

      <div className="notice-info">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm leading-relaxed">
          {meta.isFair ? (
            <>La <strong>pantalla gigante, el kiosco y el correo de {group.city}</strong> comparten estos premios y su stock: lo que se entrega en un frente baja en los tres. Los cambios se aplican a todos.</>
          ) : (
            <>Este canal tiene su <strong>propio inventario</strong> de premios, independiente de los demás.</>
          )}
          {' '}La <strong>probabilidad</strong> se calcula con el "peso": a mayor peso, más chances. Un premio sin stock deja de salir solo.
        </div>
      </div>

      {prizes === null ? (
        <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card card-pad space-y-3"><div className="skeleton h-5 w-2/3" /><div className="skeleton h-16 w-full" /></div>)}</div>
      ) : prizes.length === 0 ? (
        <EmptyState title="Este catálogo está vacío" text="Falta cargar los premios de este evento en la base de datos." icon={PackageX} />
      ) : (
        <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {prizes.map((p) => {
            const dirty = isDirty(p);
            const out = Number(p.stock) <= 0;
            const low = !out && Number(p.stock) <= 10;
            return (
              <article key={p.id} className={`card card-pad space-y-4 transition-all ${dirty ? 'ring-2 ring-brand/60' : ''} ${!p.active ? 'opacity-75' : ''}`}>
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-xl shrink-0 border border-line-strong" style={{ backgroundColor: p.color_hex }} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <input
                      value={p.name}
                      onChange={(e) => change(p.id, 'name', e.target.value)}
                      className="w-full bg-transparent font-bold text-ink text-base focus:outline-none border-b border-transparent focus:border-brand pb-0.5"
                      aria-label="Nombre del premio"
                    />
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="badge-lime">{p.probability_percentage}% de probabilidad</span>
                      {out && p.active && <span className="badge-red"><PackageX className="w-3 h-3" /> Agotado</span>}
                      {low && <span className="badge-amber"><AlertTriangle className="w-3 h-3" /> Poco stock</span>}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-ink-muted">Stock disponible</span>
                    <strong className={out ? 'text-red-600' : low ? 'text-amber-700' : 'text-ink'}>{p.stock}</strong>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${out ? 'bg-red-500' : low ? 'bg-amber-400' : 'bg-brand'}`} style={{ width: `${Math.min(100, ((Number(p.stock) || 0) / maxStock) * 100)}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <label className="block">
                    <span className="label">Stock</span>
                    <input type="number" min="0" value={p.stock} onChange={(e) => change(p.id, 'stock', parseInt(e.target.value, 10) || 0)} className="input text-center font-bold" />
                  </label>
                  <label className="block">
                    <span className="label">Peso</span>
                    <input type="number" min="0" max="1000" value={p.weight} onChange={(e) => change(p.id, 'weight', parseInt(e.target.value, 10) || 0)} className="input text-center font-bold" />
                  </label>
                  <label className="block" title="0 = sin límite">
                    <span className="label">Tope/día</span>
                    <input type="number" min="0" value={p.max_daily_wins} onChange={(e) => change(p.id, 'max_daily_wins', parseInt(e.target.value, 10) || 0)} className="input text-center font-bold" />
                  </label>
                </div>

                {usesIcons && <PrizeIconPicker value={p.icon || ''} onChange={(key) => change(p.id, 'icon', key)} />}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <Switch checked={Boolean(p.active)} onChange={(v) => change(p.id, 'active', v ? 1 : 0)} label="Activo en la ruleta" />
                    <span className="text-sm font-semibold text-ink-2">{p.active ? 'Activo en la ruleta' : 'Fuera de la ruleta'}</span>
                  </label>
                  <button type="button" onClick={() => save(p)} disabled={!dirty || saving === p.id} className="btn-primary btn-sm">
                    <Save className="w-4 h-4" /> {saving === p.id ? 'Guardando…' : dirty ? 'Guardar' : 'Guardado'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
