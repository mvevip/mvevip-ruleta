import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useAdmin, PAGES } from '../../context/AdminContext';
import EventSwitcher from './EventSwitcher';

/**
 * Barra superior: logotipo en móvil, título de la página y, en las páginas que dependen del evento
 * (Leads, Premios, Pantallas, Métricas), el selector de evento y frente.
 */
export default function Topbar({ onRefresh }) {
  const { route, meta } = useAdmin();
  const page = PAGES[route.page];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-line pt-safe">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
        <img src={`${import.meta.env.BASE_URL}logotipo.png`} alt="Marketing VIP" className={`lg:hidden h-9 w-auto object-contain shrink-0 ${page.stand ? 'hidden sm:block' : ''}`} />
        <div className="min-w-0 flex-1">
          {page.stand ? (
            <div className="min-w-0">
              <EventSwitcher />
            </div>
          ) : (
            <div className="font-racing font-black text-[13px] uppercase tracking-wider text-navy truncate lg:hidden">Marketing VIP · Admin</div>
          )}
        </div>
        {onRefresh && (
          <button type="button" onClick={onRefresh} className="btn-icon shrink-0" title="Actualizar datos" aria-label="Actualizar datos">
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
      {page.stand && (
        <div className="px-4 sm:px-6 lg:px-8 pb-2.5 -mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
          <span className="live-dot" aria-hidden="true" />
          <span>Estás viendo: <strong className="text-ink">{meta.title}</strong></span>
        </div>
      )}
    </header>
  );
}
