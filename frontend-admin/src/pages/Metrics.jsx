import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Users, Gift, CheckCircle2, Smartphone, AlertTriangle } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { PageHeader, Stat } from '../components/ui';
import { STAND_META, FRONT_LABEL } from '../utils/stands';

const COMPARE = [
  { key: 'riobamba', title: 'Riobamba', emoji: '🌄', tone: 'bg-sky-500', fronts: ['rio_stand', 'rio_kiosk', 'rio_mail'] },
  { key: 'ambato', title: 'Ambato', emoji: '🏔️', tone: 'bg-rose-500', fronts: ['amb_stand', 'amb_kiosk', 'amb_mail'] },
  { key: 'cuotas', title: 'Cuotas (correo)', emoji: '📧', tone: 'bg-amber-400', fronts: ['mail'] },
  { key: 'general', title: 'General (correo)', emoji: '📬', tone: 'bg-teal-500', fronts: ['gen_mail'] },
  { key: 'autos', title: 'Autos', emoji: '🏎️', tone: 'bg-brand', fronts: ['autos'] },
  { key: 'ford', title: 'Ford', emoji: '🚘', tone: 'bg-navy', fronts: ['ford'] },
  { key: 'kiosk', title: 'Kiosco histórico', emoji: '🖥️', tone: 'bg-fuchsia-500', fronts: ['kiosk'] }
];

/** Cifras del evento elegido y comparativa de todos los eventos. */
export default function Metrics() {
  const { apiFetch, meta, group, leadTick } = useAdmin();
  const [m, setM] = useState(null);

  const load = useCallback(async () => {
    try {
      const q = meta.isFair ? `event=${meta.event}` : `stand=${meta.key}`;
      const res = await apiFetch(`/api/metrics?${q}`);
      const json = await res.json();
      if (json.success) setM(json.data);
    } catch (_) { /* sesión */ }
  }, [apiFetch, meta]);

  useEffect(() => { setM(null); load(); }, [load]);
  useEffect(() => { if (leadTick) load(); }, [leadTick, load]);

  const by = (m && m.byStand) || {};
  const leadsOf = (keys) => keys.reduce((s, k) => s + (by[k] && by[k].leads !== undefined ? by[k].leads : (typeof by[k] === 'number' ? by[k] : 0)), 0);
  const spinsOf = (keys) => keys.reduce((s, k) => s + ((by[k] && by[k].spins) || 0), 0);
  const maxLeads = Math.max(1, ...COMPARE.map((c) => leadsOf(c.fronts)));
  const maxPrize = Math.max(1, ...((m && m.recentPrizes) || []).map((p) => p.count));
  const redeemRate = m && Number(m.totalSpins) > 0 ? Math.round((Number(m.totalRedeemed) / Number(m.totalSpins)) * 100) : 0;

  return (
    <div className="space-y-5 anim-fade-in">
      <PageHeader title="Métricas" icon={BarChart3} subtitle={`Cifras de ${meta.isFair ? `la feria de ${group.city} (pantalla + kiosco + correo)` : meta.title.toLowerCase()}. Los usuarios demo no se cuentan.`} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Leads" value={m ? m.totalLeads : '—'} hint="Personas registradas" icon={Users} tone="lime" loading={!m} />
        <Stat label="Premios entregados al ganar" value={m ? m.totalSpins : '—'} hint="Giros de la ruleta" icon={Gift} tone="navy" loading={!m} />
        <Stat label="Canjeados" value={m ? m.totalRedeemed : '—'} hint={m ? `${redeemRate}% de los premios` : ''} icon={CheckCircle2} tone="green" loading={!m} />
        <Stat label="Celulares distintos" value={m ? m.totalDevices : '—'} hint="Dispositivos únicos" icon={Smartphone} tone="amber" loading={!m} />
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        <section className="card card-pad space-y-4">
          <h2 className="panel-title">Comparativa de eventos</h2>
          <div className="space-y-4">
            {COMPARE.map((c) => {
              const l = leadsOf(c.fronts);
              return (
                <div key={c.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-ink">{c.emoji} {c.title}</span>
                    <span className="text-sm text-ink-2"><strong className="text-ink">{l}</strong> leads · {spinsOf(c.fronts)} giros</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${c.tone} transition-all duration-700`} style={{ width: `${(l / maxLeads) * 100}%` }} /></div>
                  {c.fronts.length > 1 && (
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {c.fronts.map((k) => <span key={k} className="badge-slate">{FRONT_LABEL[STAND_META[k].front]}: {(by[k] && by[k].leads) || 0}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="space-y-5">
          <section className="card card-pad space-y-3">
            <h2 className="panel-title">Premios entregados</h2>
            {m && m.recentPrizes && m.recentPrizes.length > 0 ? (
              <ul className="space-y-3">
                {m.recentPrizes.map((p) => (
                  <li key={p.prize}>
                    <div className="flex justify-between text-sm mb-1"><span className="font-semibold text-ink-2 truncate pr-2">{p.prize}</span><strong className="text-ink">{p.count}</strong></div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-brand" style={{ width: `${(p.count / maxPrize) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-muted">Todavía no se entregaron premios en este evento.</p>}
          </section>

          <section className="card card-pad space-y-3">
            <h2 className="panel-title">Destinos más elegidos</h2>
            {m && m.topDestinations && m.topDestinations.length > 0 ? (
              <ul className="divide-y divide-line">
                {m.topDestinations.map((d, i) => (
                  <li key={i} className="flex justify-between items-center py-2 text-sm"><span className="text-ink-2">{d.dream_destination}</span><span className="badge-slate">{d.count}</span></li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-muted">Sin datos todavía.</p>}
          </section>
        </div>
      </div>

      {m && m.suspiciousDevices && m.suspiciousDevices.length > 0 && (
        <section className="card card-pad space-y-3">
          <h2 className="panel-title flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Celulares con varios registros</h2>
          <p className="text-sm text-ink-muted">Pueden ser personas que intentan participar más de una vez. Revisa sus leads.</p>
          <ul className="divide-y divide-line">
            {m.suspiciousDevices.map((d) => (
              <li key={d.device_id} className="py-2.5 flex items-center justify-between gap-3 text-sm"><span className="text-ink-2 truncate">{d.names}</span><span className="badge-amber shrink-0">{d.leads_count} leads</span></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
