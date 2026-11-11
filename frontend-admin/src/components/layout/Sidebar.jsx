import React from 'react';
import { LogOut, Download, Bell, Smartphone } from 'lucide-react';
import { useAdmin, isProduction } from '../../context/AdminContext';
import { useInstallPrompt } from '../../lib/pwa';
import { NAV_GROUPS } from './nav';

/** Menú lateral de escritorio (≥ 1024 px). */
export default function Sidebar({ onInstallHelp }) {
  const { route, navigate, logout } = useAdmin();
  const { installed, canPrompt, ios, promptInstall } = useInstallPrompt();

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[272px] flex-col bg-white border-r border-line">
      <div className="px-5 pt-6 pb-5 flex items-center gap-3 border-b border-line">
        <img src={`${import.meta.env.BASE_URL}logotipo.png`} alt="Marketing VIP" className="h-11 w-auto object-contain" />
        <div className="leading-tight min-w-0">
          <div className="font-racing font-black text-[13px] uppercase tracking-wider text-navy">Marketing VIP</div>
          <div className="text-[11px] font-semibold text-ink-muted">Panel de administración</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Menú principal">
        {NAV_GROUPS.map((g) => (
          <div key={g.label}>
            <div className="px-3 mb-1.5 section-label">{g.label}</div>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const Icon = item.icon;
                const active = route.page === item.page;
                return (
                  <li key={item.page}>
                    <button
                      type="button"
                      onClick={() => navigate(item.page)}
                      aria-current={active ? 'page' : undefined}
                      className={`group relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all cursor-pointer ${
                        active ? 'bg-brand-soft text-navy' : 'text-ink-2 hover:bg-slate-50'
                      }`}
                    >
                      {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-brand" />}
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        active ? 'bg-brand text-ink' : 'bg-slate-100 text-ink-muted group-hover:bg-white group-hover:text-ink'
                      }`}>
                        <Icon className="w-[18px] h-[18px]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold leading-tight">{item.label}</span>
                        <span className="block text-[11px] text-ink-muted leading-tight truncate">{item.hint}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-line space-y-2">
        {!installed && (canPrompt || ios) && (
          <button
            type="button"
            onClick={() => (canPrompt ? promptInstall() : onInstallHelp && onInstallHelp())}
            className="w-full flex items-center gap-3 rounded-xl bg-navy text-white px-3 py-2.5 hover:bg-navy-700 transition-colors cursor-pointer"
          >
            <span className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">{ios ? <Smartphone className="w-[18px] h-[18px]" /> : <Download className="w-[18px] h-[18px]" />}</span>
            <span className="text-left leading-tight">
              <span className="block text-sm font-bold">Instalar aplicación</span>
              <span className="block text-[11px] text-white/70">Acceso directo y avisos</span>
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('ajustes', { seccion: 'notificaciones' })}
          className="w-full flex items-center gap-3 rounded-xl border border-line-strong px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <span className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><Bell className="w-[18px] h-[18px]" /></span>
          <span className="text-left leading-tight">
            <span className="block text-sm font-bold text-ink">Notificaciones</span>
            <span className="block text-[11px] text-ink-muted">Avisos de cada lead nuevo</span>
          </span>
        </button>
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-[11px] text-ink-muted font-semibold">
            {isProduction ? 'autos.mvevip.com' : <span className="badge-amber">LOCAL</span>}
          </span>
          <button type="button" onClick={logout} className="flex items-center gap-1.5 text-xs font-bold text-ink-muted hover:text-red-600 transition-colors cursor-pointer">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </div>
    </aside>
  );
}
