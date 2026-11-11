import React, { useState } from 'react';
import { MoreHorizontal, LogOut, Download, Smartphone } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useInstallPrompt } from '../../lib/pwa';
import { Modal } from '../ui';
import { NAV_GROUPS, BOTTOM_ITEMS } from './nav';

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

/** Barra de navegación inferior de móvil y tablet (< 1024 px) con el panel "Más". */
export default function BottomNav({ onInstallHelp }) {
  const { route, navigate, logout } = useAdmin();
  const [more, setMore] = useState(false);
  const { installed, canPrompt, ios, promptInstall } = useInstallPrompt();
  const main = BOTTOM_ITEMS.map((p) => ALL_ITEMS.find((i) => i.page === p));
  const rest = ALL_ITEMS.filter((i) => !BOTTOM_ITEMS.includes(i.page));
  const moreActive = rest.some((i) => i.page === route.page);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-line pb-safe" aria-label="Menú principal">
        <ul className="grid grid-cols-5 px-1 pt-1.5">
          {main.map((item) => {
            const Icon = item.icon;
            const active = route.page === item.page;
            return (
              <li key={item.page}>
                <button
                  type="button"
                  onClick={() => navigate(item.page)}
                  aria-current={active ? 'page' : undefined}
                  className="w-full flex flex-col items-center gap-0.5 py-1 cursor-pointer"
                >
                  <span className={`w-12 h-7 rounded-full flex items-center justify-center transition-all ${active ? 'bg-brand text-ink' : 'text-ink-muted'}`}>
                    <Icon className="w-[19px] h-[19px]" />
                  </span>
                  <span className={`text-[10px] font-bold ${active ? 'text-navy' : 'text-ink-muted'}`}>{item.label.split(' ')[0]}</span>
                </button>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setMore(true)} className="w-full flex flex-col items-center gap-0.5 py-1 cursor-pointer" aria-haspopup="dialog">
              <span className={`w-12 h-7 rounded-full flex items-center justify-center transition-all ${moreActive ? 'bg-brand text-ink' : 'text-ink-muted'}`}>
                <MoreHorizontal className="w-[19px] h-[19px]" />
              </span>
              <span className={`text-[10px] font-bold ${moreActive ? 'text-navy' : 'text-ink-muted'}`}>Más</span>
            </button>
          </li>
        </ul>
      </nav>

      {more && (
        <Modal title="Más opciones" onClose={() => setMore(false)}>
          <ul className="grid grid-cols-2 gap-2.5">
            {rest.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.page}>
                  <button
                    type="button"
                    onClick={() => { setMore(false); navigate(item.page); }}
                    className="w-full card card-hover p-3.5 flex flex-col items-start gap-2 text-left cursor-pointer"
                  >
                    <span className="w-10 h-10 rounded-xl bg-brand-soft text-brand-dark flex items-center justify-center"><Icon className="w-5 h-5" /></span>
                    <span>
                      <span className="block text-sm font-bold text-ink leading-tight">{item.label}</span>
                      <span className="block text-[11px] text-ink-muted leading-tight">{item.hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 space-y-2">
            {!installed && (canPrompt || ios) && (
              <button type="button" onClick={() => { setMore(false); canPrompt ? promptInstall() : onInstallHelp && onInstallHelp(); }} className="btn-navy w-full">
                {ios ? <Smartphone className="w-4 h-4" /> : <Download className="w-4 h-4" />} Instalar aplicación
              </button>
            )}
            <button type="button" onClick={logout} className="btn-ghost w-full text-red-600"><LogOut className="w-4 h-4" /> Cerrar sesión</button>
          </div>
        </Modal>
      )}
    </>
  );
}
