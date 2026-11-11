import React, { useEffect } from 'react';
import { X, Inbox, Loader2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

/** Primitivas de interfaz del Admin claro (ver docs/admin_design_system.md). */

export function PageHeader({ title, subtitle, actions, icon: Icon }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="page-title flex items-center gap-2.5">
          {Icon && <span className="hidden sm:flex w-9 h-9 rounded-xl bg-brand-soft text-brand-dark items-center justify-center shrink-0"><Icon className="w-5 h-5" /></span>}
          <span className="truncate">{title}</span>
        </h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, icon: Icon, tone = 'lime', loading }) {
  const tones = {
    lime: 'bg-brand-soft text-brand-dark',
    sky: 'bg-sky-50 text-sky-700',
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    navy: 'bg-navy-soft text-navy',
    green: 'bg-emerald-50 text-emerald-700'
  };
  return (
    <div className="kpi anim-slide-up">
      <div className="flex items-center justify-between gap-2">
        <span className="kpi-label">{label}</span>
        {Icon && <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${tones[tone] || tones.lime}`}><Icon className="w-4 h-4" /></span>}
      </div>
      {loading ? <div className="skeleton h-8 w-20 mt-1" /> : <span className="kpi-value">{value}</span>}
      {hint && <span className="kpi-hint">{hint}</span>}
    </div>
  );
}

export function EmptyState({ title, text, action, icon: Icon = Inbox }) {
  return (
    <div className="card card-pad text-center py-10 anim-fade-in">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3"><Icon className="w-6 h-6" /></div>
      <h3 className="font-bold text-ink">{title}</h3>
      {text && <p className="text-sm text-ink-muted mt-1 max-w-sm mx-auto">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className = '' }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange && onChange(!checked)}
      className={`switch ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className="switch-dot" />
    </button>
  );
}

/** Ventana modal / panel inferior en móvil. */
export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] bg-navy/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6 anim-fade-in" onClick={onClose}>
      <div
        className={`w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-pop anim-slide-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="panel-title">{title}</h2>
          <button type="button" onClick={onClose} className="btn-icon w-9 h-9" aria-label="Cerrar"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const TOAST_STYLE = {
  ok: { cls: 'border-emerald-200 bg-white text-ink', icon: CheckCircle2, ic: 'text-emerald-600' },
  error: { cls: 'border-red-200 bg-white text-ink', icon: AlertTriangle, ic: 'text-red-600' },
  info: { cls: 'border-sky-200 bg-white text-ink', icon: Info, ic: 'text-sky-600' }
};

export function Toasts() {
  const { toasts } = useAdmin();
  return (
    <div className="fixed z-[70] top-3 right-3 left-3 sm:left-auto sm:w-96 flex flex-col gap-2 pointer-events-none pt-safe">
      {toasts.map((t) => {
        const s = TOAST_STYLE[t.tone] || TOAST_STYLE.ok;
        const I = s.icon;
        return (
          <div key={t.id} className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-pop anim-slide-up ${s.cls}`}>
            <I className={`w-5 h-5 shrink-0 mt-0.5 ${s.ic}`} />
            <span className="text-sm font-semibold leading-snug">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Formato de fecha/hora de Quito (UTC-5). La API entrega UTC (ISO). */
export function formatQuito(value, withTime = true) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const opts = { timeZone: 'America/Guayaquil', day: '2-digit', month: '2-digit', year: 'numeric' };
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const parts = new Intl.DateTimeFormat('es-EC', opts).formatToParts(d).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
  return withTime ? `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}` : `${parts.day}/${parts.month}/${parts.year}`;
}

/** "hace 5 min" para el feed en vivo. */
export function timeAgo(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const s = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (s < 45) return 'hace instantes';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
}

/** ¿La fecha ISO cae hoy en hora de Quito? */
export function isTodayQuito(value) {
  return formatQuito(value, false) === formatQuito(new Date().toISOString(), false);
}
