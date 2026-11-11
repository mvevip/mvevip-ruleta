import React, { useState } from 'react';
import { Ticket, Search, CheckCircle2, XCircle, Gift, Phone, User } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { PageHeader, formatQuito } from '../components/ui';
import { standOfScreenId } from '../utils/stands';

/** Canje de premios en el stand: buscar el código del ticket y confirmar la entrega. */
export default function Redeem() {
  const { apiFetch, toast, bumpLeads } = useAdmin();
  const [code, setCode] = useState('');
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const search = async (e) => {
    e && e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    setBusy(true); setError(''); setTicket(null);
    try {
      const res = await apiFetch(`/api/ticket/${encodeURIComponent(clean)}`);
      const json = await res.json();
      if (json.success) setTicket(json.data);
      else setError(json.message || 'No encontramos ese ticket. Revisa el código e inténtalo de nuevo.');
    } catch (_) { /* sesión */ } finally { setBusy(false); }
  };

  const redeem = async () => {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/ticket/${encodeURIComponent(ticket.ticket_code)}/redeem`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        toast('¡Premio entregado! El ticket quedó canjeado.');
        bumpLeads();
        await search();
      } else toast(json.message || 'No se pudo canjear', 'error');
    } catch (_) { /* sesión */ } finally { setBusy(false); }
  };

  const m = ticket ? standOfScreenId(ticket.screen_id) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-5 anim-fade-in">
      <PageHeader title="Canjear premios" icon={Ticket} subtitle="Escribe el código del ticket que muestra la persona (por ejemplo VIP-AB12) y confirma la entrega." />

      <form onSubmit={search} className="card card-pad space-y-3">
        <label className="label" htmlFor="ticket-code">Código del ticket</label>
        <div className="flex gap-2">
          <input
            id="ticket-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="VIP-XXXX"
            autoCapitalize="characters"
            autoComplete="off"
            className="input font-mono text-lg tracking-widest text-center uppercase"
          />
          <button type="submit" disabled={busy || !code.trim()} className="btn-primary px-5"><Search className="w-5 h-5" /> <span className="hidden sm:inline">Buscar</span></button>
        </div>
      </form>

      {error && <div className="notice-danger anim-pop"><XCircle className="w-5 h-5 shrink-0" /><span>{error}</span></div>}

      {ticket && (
        <article className="card overflow-hidden anim-pop">
          <div className={`px-5 py-3 flex items-center justify-between ${ticket.redeemed ? 'bg-emerald-50' : 'bg-brand-soft'}`}>
            <span className="font-mono font-black text-lg text-navy tracking-wider">{ticket.ticket_code}</span>
            {ticket.redeemed ? <span className="badge-green"><CheckCircle2 className="w-3.5 h-3.5" /> Ya canjeado</span> : <span className="badge-lime">Pendiente de entrega</span>}
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-navy-soft text-navy flex items-center justify-center shrink-0"><User className="w-5 h-5" /></span>
              <div>
                <div className="font-bold text-ink text-lg leading-tight">{ticket.lead_name}</div>
                <div className="text-sm text-ink-muted flex items-center gap-1.5 mt-0.5"><Phone className="w-3.5 h-3.5" />{ticket.lead_phone}</div>
                {m && <span className="badge-slate mt-2">{m.emoji} {m.title}</span>}
              </div>
            </div>
            <div className="rounded-2xl bg-surface-2 border border-line p-4 flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-brand-soft text-brand-dark flex items-center justify-center shrink-0"><Gift className="w-5 h-5" /></span>
              <div>
                <div className="section-label">Premio ganado</div>
                <div className="font-bold text-ink text-lg leading-tight">{ticket.prize_name}</div>
                {ticket.prize_description && <div className="text-sm text-ink-muted mt-0.5">{ticket.prize_description}</div>}
              </div>
            </div>
            <div className="text-xs text-ink-muted">Ganado el {formatQuito(ticket.created_at)}{ticket.redeemed && ticket.redeemed_at ? ` · Canjeado el ${formatQuito(ticket.redeemed_at)}` : ''}</div>

            {ticket.redeemed ? (
              <div className="notice-ok"><CheckCircle2 className="w-5 h-5 shrink-0" /><span>Este premio ya fue entregado. No se puede canjear otra vez.</span></div>
            ) : (
              <button type="button" onClick={redeem} disabled={busy} className="btn-primary w-full py-3.5 text-base"><CheckCircle2 className="w-5 h-5" /> Confirmar entrega del premio</button>
            )}
          </div>
        </article>
      )}
    </div>
  );
}
