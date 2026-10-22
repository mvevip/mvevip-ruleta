import React, { useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { PRIZE_ICONS, getPrizeIcon } from '../utils/prizeIcons';

/**
 * Selector de ícono de viaje para un premio (ruleta del canal Correo).
 * `value` es la llave del ícono (o vacío = la ruleta muestra el nombre en texto).
 */
export default function PrizeIconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const Current = getPrizeIcon(value);
  const currentLabel = PRIZE_ICONS.find((i) => i.key === value)?.label;

  return (
    <div className="bg-zinc-900/80 rounded-xl border border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-zinc-300 cursor-pointer"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
            {Current ? <Current className="w-5 h-5 text-[#9AC31C]" strokeWidth={1.8} /> : <span className="text-[10px] text-zinc-500">Aa</span>}
          </span>
          <span className="truncate">
            Ícono en la ruleta: <strong className="text-white">{currentLabel || 'Sin ícono (se muestra el texto)'}</strong>
          </span>
        </span>
        {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          <div className="grid grid-cols-5 gap-1.5">
            {PRIZE_ICONS.map(({ key, label, Icon }) => {
              const selected = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  title={label}
                  onClick={() => { onChange(key); setOpen(false); }}
                  className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-0.5 p-1 cursor-pointer transition-all active:scale-95 ${
                    selected
                      ? 'bg-[#9AC31C]/20 border-[#9AC31C] text-[#9AC31C]'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.8} />
                  <span className="text-[8px] leading-tight text-center truncate w-full">{label}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-3 h-3" /> Quitar ícono (mostrar el nombre en texto)
          </button>
          <p className="text-[10px] text-zinc-500">Recuerda pulsar «Guardar» para aplicar el cambio.</p>
        </div>
      )}
    </div>
  );
}
