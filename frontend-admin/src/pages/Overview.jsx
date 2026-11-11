import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Gift, CheckCircle2, Hourglass, ArrowRight, AlertTriangle, Lock, Unlock, PackageX } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { PageHeader, Stat, timeAgo, isTodayQuito } from '../components/ui';
import { STAND_META } from '../utils/stands';
import usePolling from '../lib/usePolling';

const CITY_CARDS = [
  { key: 'riobamba', title: 'Riobamba', emoji: '🌄', tone: 'sky', fronts: ['rio_stand', 'rio_kiosk', 'rio_mail'], fair: true },
  { key: 'ambato', title: 'Ambato', emoji: '🏔️', tone: 'rose', fronts: ['amb_stand', 'amb_kiosk', 'amb_mail'], fair: true },
  { key: 'cuotas', title: 'Cuotas (correo)', emoji: '📧', tone: 'amber', fronts: ['mail'] },
  { key: 'autos', title: 'Feria Autos', emoji: '🏎️', tone: 'lime', fronts: ['autos', 'ford', 'kiosk'] }
];
const FRONT_NAME = { stand: 'Pantalla', kiosk: 'Kiosco', mail: 'Correo' };
const BAR = { sky: 'bg-sky-500', rose: 'bg-rose-500', amber: 'bg-amber-400', lime: 'bg-brand' };
const SOFT = { sky: 'bg-sky-50 text-sky-700', rose: 'bg-rose-50 text-rose-700', amber: 'bg-amber-50 text-amber-700', lime: 'bg-brand-soft text-brand-dark' };

/** Pantalla de inicio: cifras de hoy, estado de cada feria, últimos registros en vivo y alertas de stock. */
export default function Overview() {
  const { apiFetch, navigate, setActiveStand, eventsInfo, leadTick } = useAdmin();
  const [leads, setLeads] = useState(null);
  const [totals, setTotals] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    try {
      const [rl, rm] = await Promise.all([
        apiFetch('/api/leads?stand=all&limit=500'),
        apiFetch('/api/metrics?stand=all')
      ]);
      const jl = await rl.json();
      const jm = await rm.json();
      if (jl.success) { setLeads(jl.data); setTotals(jl.totals); }
      if (jm.success) setMetrics(jm.data);
      setUpdatedAt(new Date());
    } catch (_) { /* apiFetch ya avisa de los errores de sesión */ }
  }, [apiFetch]);

  const loadStock = useCallback(async () => {
    try {
      const pools = [['rio_mail', 'Riobamba'], ['amb_mail', 'Ambato'], ['mail', 'Cuotas'], ['autos', 'Autos']];
      const results = await Promise.all(pools.map(async ([stand, label]) => {
        const res = await apiFetch(`/api/admin/prizes?stand=${stand}`);
        const json = await res.json();
        return (json.success ? json.data : []).filter((p) => p.active).map((p) => ({ ...p, pool: label, stand }));
      }));
      setStockAlerts(results.flat().filter((p) => Number(p.stock) <= 10).sort((a, b) => a.stock - b.stock));
    } catch (_) { /* sin efecto */ }
  }, [apiFetch]);

  useEffect(() => { load(); loadStock(); }, [load, loadStock]);
  useEffect(() => { if (leadTick) load(); }, [leadTick, load]);
  usePolling(load, 30000);

  const real = useMemo(() => (leads || []).filter((l) => !l.is_test), [leads]);
  const today = useMemo(() => real.filter((l) => isTodayQuito(l.created_at)), [real]);
  const byEventToday = useMemo(() => {
    const map = {};
    today.forEach((l) => { map[l.stand] = (map[l.stand] || 0) + 1; });
    return map;
  }, [today]);
  const feed = (leads || []).slice(0, 8);

  const eventInfo = (key) => eventsInfo && eventsInfo.data.find((e) => e.event === key);
  const pendingCanje = metrics ? Math.max(Number(metrics.totalSpins) - Number(metrics.totalRedeemed), 0) : null;
  const loading = leads === null;

  const goLeads = (stand) => { setActiveStand(stand); navigate('leads'); };

  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader
        title="Resumen"
        subtitle="Lo más importante de las ferias, en tiempo real."
        actions={updatedAt && (
          <span className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
            <span className="live-dot" aria-hidden="true" /> Actualizado {updatedAt.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guayaquil' })}
          </span>
        )}
      />

      {/* Cifras principales */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Leads de hoy" value={today.length} hint="Personas nuevas hoy (sin demos)" icon={Users} tone="lime" loading={loading} />
        <Stat label="Leads totales" value={metrics ? metrics.totalLeads : '—'} hint="Desde el inicio" icon={Gift} tone="navy" loading={!metrics} />
        <Stat label="Premios canjeados" value={metrics ? metrics.totalRedeemed : '—'} hint="Ya entregados en el stand" icon={CheckCircle2} tone="green" loading={!metrics} />
        <Stat label="Por canjear" value={pendingCanje === null ? '—' : pendingCanje} hint="Premios ganados sin entregar" icon={Hourglass} tone="amber" loading={!metrics} />
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        {/* Estado por evento */}
        <section className="xl:col-span-2 space-y-3" aria-label="Estado por evento">
          <h2 className="panel-title">Estado de cada evento</h2>
          <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
            {CITY_CARDS.map((c) => {
              const info = c.fair ? eventInfo(c.key) : null;
              const totalEvent = totals && totals.events ? (c.key === 'autos'
                ? (totals.events.autos || 0) + (totals.events.ford || 0) + (totals.events.kiosk || 0)
                : totals.events[c.key] || 0) : 0;
              const todayEvent = c.fronts.reduce((s, k) => s + (byEventToday[k] || 0), 0);
              const maxFront = Math.max(1, ...c.fronts.map((k) => byEventToday[k] || 0));
              return (
                <article key={c.key} className="card card-pad space-y-3 card-hover anim-slide-up">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${SOFT[c.tone]}`}>{c.emoji}</span>
                      <div className="min-w-0">
                        <h3 className="font-bold text-ink leading-tight truncate">{c.title}</h3>
                        {info ? (
                          <span className={info.closed ? 'badge-red mt-1' : 'badge-green mt-1'}>
                            {info.closed ? <><Lock className="w-3 h-3" /> Cerrada</> : <><Unlock className="w-3 h-3" /> Abierta</>}
                          </span>
                        ) : (
                          <span className="badge-slate mt-1">Sin fecha de cierre</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-racing font-black text-2xl text-navy leading-none">{todayEvent}</div>
                      <div className="text-[11px] font-semibold text-ink-muted">hoy</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {c.fronts.map((k) => {
                      const m = STAND_META[k];
                      const n = byEventToday[k] || 0;
                      return (
                        <button key={k} type="button" onClick={() => goLeads(k)} className="w-full text-left group cursor-pointer">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-ink-2 group-hover:text-navy">{m.isFair ? FRONT_NAME[m.front] : m.short.charAt(0) + m.short.slice(1).toLowerCase()}</span>
                            <span className="font-bold text-ink">{n}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${BAR[c.tone]}`} style={{ width: `${(n / maxFront) * 100}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-line">
                    <span className="text-xs text-ink-muted"><strong className="text-ink">{totalEvent}</strong> leads en total</span>
                    <button type="button" onClick={() => goLeads(c.fronts[0])} className="text-xs font-bold text-brand-dark hover:underline flex items-center gap-1 cursor-pointer">
                      Ver leads <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Últimos registros */}
        <section className="space-y-3" aria-label="Últimos registros">
          <div className="flex items-center justify-between">
            <h2 className="panel-title flex items-center gap-2"><span className="live-dot" aria-hidden="true" /> Últimos registros</h2>
            <button type="button" onClick={() => navigate('leads')} className="text-xs font-bold text-brand-dark hover:underline cursor-pointer">Ver todos</button>
          </div>
          <div className="card divide-y divide-line">
            {loading && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 flex gap-3"><div className="skeleton w-10 h-10 rounded-full" /><div className="flex-1 space-y-2"><div className="skeleton h-3 w-2/3" /><div className="skeleton h-3 w-1/2" /></div></div>
            ))}
            {!loading && feed.length === 0 && (
              <div className="p-8 text-center text-sm text-ink-muted">Todavía no hay registros. Aparecerán aquí en cuanto alguien juegue.</div>
            )}
            {feed.map((l) => {
              const m = STAND_META[l.stand] || STAND_META.autos;
              return (
                <button key={l.id} type="button" onClick={() => goLeads(l.stand)} className="w-full text-left p-3.5 flex items-center gap-3 hover:bg-surface-2 transition-colors cursor-pointer">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0 ${SOFT[m.tone === 'ford' ? 'lime' : m.tone === 'fuchsia' ? 'rose' : m.tone] || SOFT.lime}`}>{m.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-ink truncate">{l.name}</span>
                      {l.is_test ? <span className="badge-navy">DEMO</span> : null}
                    </span>
                    <span className="block text-xs text-ink-muted truncate">{m.short.charAt(0) + m.short.slice(1).toLowerCase()} · {l.prize_name || 'Aún sin premio'}</span>
                  </span>
                  <span className="text-[11px] text-ink-muted shrink-0">{timeAgo(l.created_at)}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Alertas de stock */}
      <section className="space-y-3" aria-label="Alertas de stock">
        <h2 className="panel-title">Alertas de stock</h2>
        {stockAlerts.length === 0 ? (
          <div className="notice-ok"><CheckCircle2 className="w-5 h-5 shrink-0" /><span>Todos los premios activos tienen más de 10 unidades.</span></div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {stockAlerts.slice(0, 9).map((p) => (
              <button key={`${p.pool}-${p.id}`} type="button" onClick={() => { setActiveStand(p.stand); navigate('premios'); }} className="card card-pad card-hover flex items-center gap-3 text-left cursor-pointer">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${Number(p.stock) <= 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                  {Number(p.stock) <= 0 ? <PackageX className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-sm text-ink truncate">{p.name}</span>
                  <span className="block text-xs text-ink-muted">{p.pool} · {Number(p.stock) <= 0 ? <strong className="text-red-600">Agotado</strong> : <><strong className="text-amber-700">{p.stock}</strong> unidades</>}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {metrics && metrics.suspiciousDevices && metrics.suspiciousDevices.length > 0 && (
        <div className="notice-warn">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span><strong>{metrics.suspiciousDevices.length} celular(es)</strong> registraron más de un lead. Revísalos en Leads (aparecen con una alerta).</span>
        </div>
      )}
    </div>
  );
}
