import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Download, Printer, AlertTriangle, MessageCircle, Users, RefreshCw } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { PageHeader, EmptyState, formatQuito, timeAgo } from '../components/ui';
import { STAND_META, EVENT_GROUPS, FRONT_LABEL, groupOfStand } from '../utils/stands';
import StrictAdvisorSelect, { DEFAULT_ADVISORS } from '../components/StrictAdvisorSelect';
import usePolling from '../lib/usePolling';

const PAGE_SIZE = 40;
const BADGE_TONE = { lime: 'badge-lime', ford: 'badge-navy', amber: 'badge-amber', fuchsia: 'badge-fuchsia', sky: 'badge-sky', rose: 'badge-rose' };

function csvEscape(value) {
  const text = String(value == null ? '' : value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Lista de leads del evento/frente elegido: tabla en escritorio, tarjetas en móvil. */
export default function Leads() {
  const { apiFetch, activeStand, setActiveStand, meta, group, route, toast, leadTick, eventsInfo } = useAdmin();
  const [filter, setFilter] = useState(() => (meta.isFair ? `event:${meta.event}` : activeStand));
  const [leads, setLeads] = useState(null);
  const [totals, setTotals] = useState({ events: {} });
  const [advisors, setAdvisors] = useState(DEFAULT_ADVISORS);
  const [query, setQuery] = useState('');
  const [showTests, setShowTests] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);

  // Al abrir desde una notificación (#/leads?event=riobamba) se cambia al evento indicado
  useEffect(() => {
    const ev = route.params && route.params.event;
    if (!ev) return;
    const g = EVENT_GROUPS.find((x) => x.key === ev);
    if (g && groupOfStand(activeStand).key !== g.key) setActiveStand(g.fronts[0]);
  }, [route.params]); // eslint-disable-line react-hooks/exhaustive-deps

  // El filtro sigue al evento/frente del selector superior (en las ferias, toda la ciudad)
  useEffect(() => {
    setFilter(meta.isFair ? `event:${meta.event}` : activeStand);
    setVisible(PAGE_SIZE);
  }, [activeStand]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = String(filter).startsWith('event:') ? `event=${String(filter).slice(6)}` : `stand=${encodeURIComponent(filter)}`;
      const res = await apiFetch(`/api/leads?${q}&limit=1000`);
      const json = await res.json();
      if (json.success) {
        setLeads(json.data);
        if (json.totals) setTotals(json.totals);
        if (Array.isArray(json.advisors) && json.advisors.length) setAdvisors(json.advisors);
      }
    } catch (_) { /* sesión */ } finally { setLoading(false); }
  }, [apiFetch, filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (leadTick) load(); }, [leadTick, load]);
  usePolling(load, 45000);

  const assign = async (leadId, advisorName) => {
    try {
      const res = await apiFetch(`/api/leads/${leadId}/assign`, { method: 'PUT', body: JSON.stringify({ assigned_to: advisorName }) });
      const json = await res.json();
      if (json.success) {
        const saved = json.data && json.data.assigned_to !== undefined ? json.data.assigned_to : (json.assigned_to ?? null);
        setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, assigned_to: saved } : l)));
        toast(saved ? `Asesor asignado: ${saved}` : 'Se quitó la asignación del asesor');
        return true;
      }
      toast(json.message || 'No se pudo asignar el asesor', 'error');
      return false;
    } catch (_) { return false; }
  };

  const reprint = async (code) => {
    try {
      const res = await apiFetch(`/api/admin/kiosk/reprint/${encodeURIComponent(code)}`, { method: 'POST' });
      const json = await res.json();
      toast(json.success ? json.message : (json.message || 'No se pudo pedir la reimpresión'), json.success ? 'ok' : 'error');
    } catch (_) { /* sesión */ }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (leads || []).filter((l) => {
      if (!showTests && l.is_test) return false;
      if (!q) return true;
      return [l.name, l.phone, l.email, l.ticket_code, l.assigned_to, l.prize_name, l.crm_client_id, l.stand_label]
        .some((v) => v !== undefined && v !== null && String(v).toLowerCase().includes(q));
    });
  }, [leads, query, showTests]);

  const shown = filtered.slice(0, visible);
  const countOf = (standKey) => (totals && totals[standKey]) || 0;

  const exportCsv = () => {
    const header = ['Fecha (Quito)', 'Nombre', 'Celular', 'Correo', 'Evento', 'Frente', 'Premio', 'Ticket', 'Asesor', 'Demo'];
    const rows = filtered.map((l) => {
      const m = STAND_META[l.stand] || STAND_META.autos;
      return [formatQuito(l.created_at), l.name, l.phone, l.email, (m.isFair ? group.city : m.short), m.front, l.prize_name || '', l.ticket_code || '', l.assigned_to || '', l.is_test ? 'sí' : ''];
    });
    const csv = '﻿' + [header, ...rows].map((r) => r.map(csvEscape).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${(filter || 'todos').replace(':', '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Se descargaron ${filtered.length} leads (CSV para Excel)`);
  };

  const filterChips = meta.isFair
    ? [
        { key: `event:${meta.event}`, label: `Toda la feria de ${group.city}`, n: (totals.events && totals.events[meta.event]) || 0 },
        ...group.fronts.map((k) => ({ key: k, label: FRONT_LABEL[STAND_META[k].front], n: countOf(k) }))
      ]
    : group.fronts.length > 1
      ? group.fronts.map((k) => ({ key: k, label: STAND_META[k].short.charAt(0) + STAND_META[k].short.slice(1).toLowerCase(), n: countOf(k) }))
      : [];

  return (
    <div className="space-y-4 anim-fade-in">
      <PageHeader
        title="Leads"
        icon={Users}
        subtitle={`Personas registradas en ${meta.isFair ? `la feria de ${group.city}` : meta.title.toLowerCase()}. Se actualiza solo.`}
        actions={
          <>
            <button type="button" onClick={load} className="btn-ghost btn-sm" disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar</button>
            <button type="button" onClick={exportCsv} className="btn-navy btn-sm" disabled={!filtered.length}><Download className="w-4 h-4" /> Descargar CSV</button>
          </>
        }
      />

      <div className="card card-pad space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {filterChips.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="Filtrar por frente">
              {filterChips.map((c) => (
                <button key={c.key} type="button" role="tab" aria-selected={filter === c.key} onClick={() => { setFilter(c.key); setVisible(PAGE_SIZE); }} className={`chip shrink-0 ${filter === c.key ? 'chip-active' : ''}`}>
                  {c.label} <span className={`rounded-full px-1.5 text-[10px] ${filter === c.key ? 'bg-white/20' : 'bg-slate-100 text-ink-muted'}`}>{c.n}</span>
                </button>
              ))}
            </div>
          )}
          <div className="relative flex-1 min-w-0 lg:max-w-md lg:ml-auto">
            <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={(e) => { setQuery(e.target.value); setVisible(PAGE_SIZE); }} placeholder="Buscar nombre, celular, ticket…" className="input pl-10" aria-label="Buscar leads" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-ink-muted">
          <span>Mostrando <strong className="text-ink">{Math.min(visible, filtered.length)}</strong> de <strong className="text-ink">{filtered.length}</strong> leads</span>
          <label className="flex items-center gap-2 cursor-pointer font-semibold">
            <input type="checkbox" checked={showTests} onChange={(e) => setShowTests(e.target.checked)} className="w-4 h-4 accent-[#9AC31C] rounded" />
            Incluir usuarios demo
          </label>
        </div>
      </div>

      {leads === null ? (
        <div className="card divide-y divide-line">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="p-4 flex gap-3"><div className="skeleton w-10 h-10 rounded-full" /><div className="flex-1 space-y-2"><div className="skeleton h-3 w-1/3" /><div className="skeleton h-3 w-1/2" /></div></div>)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No hay leads para mostrar" text={query ? 'Prueba con otra búsqueda o quita los filtros.' : 'Cuando alguien se registre en este evento aparecerá aquí al instante.'} />
      ) : (
        <>
          {/* Escritorio: tabla */}
          <div className="hidden lg:block table-wrap">
            <table className="table-base">
              <thead>
                <tr><th>Registro</th><th>Persona</th><th>Frente</th><th>Premio</th><th className="w-[260px]">Asesor</th><th /></tr>
              </thead>
              <tbody>
                {shown.map((l) => {
                  const m = STAND_META[l.stand] || STAND_META.autos;
                  return (
                    <tr key={l.id}>
                      <td className="whitespace-nowrap">
                        <div className="font-semibold text-ink">{formatQuito(l.created_at).split(' ')[0]}</div>
                        <div className="text-xs text-ink-muted">{formatQuito(l.created_at).split(' ')[1]} · {timeAgo(l.created_at)}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">{l.name}</span>
                          {l.is_test ? <span className="badge-navy">DEMO</span> : null}
                        </div>
                        <a href={`https://wa.me/593${String(l.phone).replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1"><MessageCircle className="w-3 h-3" />{l.phone}</a>
                        {l.email && <div className="text-xs text-ink-muted truncate max-w-[220px]">{l.email}</div>}
                        {l.device_leads_count > 1 && !l.is_test && <div className="badge-amber mt-1"><AlertTriangle className="w-3 h-3" /> {l.device_leads_count} leads desde este celular</div>}
                      </td>
                      <td>
                        <span className={BADGE_TONE[m.tone] || 'badge-slate'}>{m.emoji} {m.isFair ? FRONT_LABEL[m.front] : m.short}</span>
                        {m.front === 'mail' && (
                          <div className="text-[11px] text-ink-muted mt-1">ID cliente: {l.crm_client_id !== undefined && l.crm_client_id !== null ? <strong className="text-ink">{l.crm_client_id}</strong> : 'no está en el CRM'}</div>
                        )}
                      </td>
                      <td>
                        <div className="font-semibold text-ink">{l.prize_name || <span className="text-ink-muted font-normal">Aún sin premio</span>}</div>
                        {l.ticket_code && <div className="font-mono text-xs text-brand-dark font-bold">{l.ticket_code}{l.redeemed ? <span className="ml-2 badge-green">Canjeado</span> : null}</div>}
                      </td>
                      <td><StrictAdvisorSelect leadId={l.id} value={l.assigned_to || ''} advisors={advisors} onAssign={assign} /></td>
                      <td className="text-right">
                        {m.front === 'kiosk' && l.ticket_code && (
                          <button type="button" onClick={() => reprint(l.ticket_code)} className="btn-ghost btn-sm" title="Reimprimir el ticket en el kiosco"><Printer className="w-4 h-4" /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Móvil: tarjetas */}
          <div className="lg:hidden space-y-3">
            {shown.map((l) => {
              const m = STAND_META[l.stand] || STAND_META.autos;
              return (
                <article key={l.id} className="card card-pad space-y-2.5 anim-slide-up">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-ink">{l.name}</h3>
                        {l.is_test ? <span className="badge-navy">DEMO</span> : null}
                      </div>
                      <div className="text-xs text-ink-muted">{formatQuito(l.created_at)} · {timeAgo(l.created_at)}</div>
                    </div>
                    <span className={BADGE_TONE[m.tone] || 'badge-slate'}>{m.emoji} {m.isFair ? FRONT_LABEL[m.front] : m.short}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <a href={`https://wa.me/593${String(l.phone).replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-600 inline-flex items-center gap-1.5"><MessageCircle className="w-4 h-4" />{l.phone}</a>
                    {l.ticket_code && <span className="font-mono text-xs font-bold text-brand-dark bg-brand-soft px-2 py-1 rounded-lg">{l.ticket_code}</span>}
                  </div>
                  <div className="text-sm text-ink-2">Premio: <strong className="text-ink">{l.prize_name || 'Aún sin premio'}</strong>{l.redeemed ? <span className="ml-2 badge-green">Canjeado</span> : null}</div>
                  {m.front === 'mail' && <div className="text-xs text-ink-muted">ID cliente: {l.crm_client_id !== undefined && l.crm_client_id !== null ? <strong className="text-ink">{l.crm_client_id}</strong> : 'no está en el CRM'}</div>}
                  {m.front === 'kiosk' && l.ticket_code && <button type="button" onClick={() => reprint(l.ticket_code)} className="btn-ghost btn-sm"><Printer className="w-4 h-4" /> Reimprimir ticket</button>}
                  <StrictAdvisorSelect leadId={l.id} value={l.assigned_to || ''} advisors={advisors} onAssign={assign} />
                  {l.device_leads_count > 1 && !l.is_test && <div className="notice-warn !py-2 text-xs"><AlertTriangle className="w-4 h-4 shrink-0" /><span>{l.device_leads_count} leads desde este mismo celular</span></div>}
                </article>
              );
            })}
          </div>

          {filtered.length > visible && (
            <div className="text-center"><button type="button" onClick={() => setVisible((v) => v + PAGE_SIZE)} className="btn-ghost">Ver {Math.min(PAGE_SIZE, filtered.length - visible)} más</button></div>
          )}
        </>
      )}
    </div>
  );
}
