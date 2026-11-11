import React from 'react';
import { Lock } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { FRONT_LABEL } from '../../utils/stands';

const ACTIVE = {
  lime: 'bg-brand text-ink shadow-sm',
  amber: 'bg-amber-400 text-ink shadow-sm',
  sky: 'bg-sky-500 text-white shadow-sm',
  rose: 'bg-rose-500 text-white shadow-sm',
  teal: 'bg-teal-500 text-white shadow-sm'
};

/**
 * Selector de evento (Autos, Cuotas, Riobamba, Ambato) y, debajo, del frente dentro del evento
 * (Pantalla, Kiosco, Correo). Marca con un candado las ferias cerradas.
 */
export default function EventSwitcher() {
  const { EVENT_GROUPS, STAND_META, group, activeStand, setActiveStand, eventsInfo } = useAdmin();

  const closed = (key) => Boolean(eventsInfo && eventsInfo.data.find((e) => e.event === key && e.closed));

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 overflow-x-auto no-scrollbar">
        {EVENT_GROUPS.map((g) => {
          const selected = g.key === group.key;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => { if (!selected) setActiveStand(g.fronts[0]); }}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selected ? ACTIVE[g.tone] : 'text-ink-muted hover:text-ink hover:bg-white/70'
              }`}
              aria-pressed={selected}
            >
              <span>{g.label}</span>
              {(g.fair || g.campaign) && closed(g.key) && <Lock className="w-3 h-3 opacity-80" aria-label="Feria cerrada" />}
            </button>
          );
        })}
      </div>

      {group.fronts.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {group.fronts.map((standKey) => {
            const m = STAND_META[standKey];
            const selected = standKey === activeStand;
            return (
              <button
                key={standKey}
                type="button"
                onClick={() => setActiveStand(standKey)}
                className={`chip shrink-0 ${selected ? 'chip-active' : ''}`}
                aria-pressed={selected}
              >
                {m.isFair ? FRONT_LABEL[m.front] : m.isFord ? '🚘 Ford' : `${m.emoji} ${m.short.charAt(0)}${m.short.slice(1).toLowerCase()}`}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
