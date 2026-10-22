import React from 'react';
import { MousePointerClick, Gift, CalendarCheck, ChevronsUp } from 'lucide-react';

const STEPS = [
  { n: 1, Icon: MousePointerClick, text: 'Gira la ruleta.' },
  { n: 2, Icon: Gift, text: 'Descubre tu premio y tu código de canje.' },
  { n: 3, Icon: CalendarCheck, text: 'Agenda tu cita para canjear tu premio.' }
];

/** Panel "3 pasos" + mensaje inferior del diseño de campaña. */
export default function MailSteps({ hint }) {
  return (
    <div className="w-full">
      <div className="bg-[#0B2A4A]/95 rounded-2xl px-2.5 py-3 flex items-start justify-between gap-1 shadow-xl border border-white/10">
        {STEPS.map(({ n, Icon, text }, i) => (
          <React.Fragment key={n}>
            <div className="flex-1 flex flex-col items-center text-center gap-1.5 min-w-0">
              <div className="relative w-12 h-12 rounded-full border-2 border-white/80 flex items-center justify-center text-white">
                <Icon className="w-6 h-6" strokeWidth={1.8} />
                <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-[#C6F03A] text-[#0B2A4A] text-[11px] font-black flex items-center justify-center">
                  {n}
                </span>
              </div>
              <span className="text-[11px] leading-tight text-white font-semibold px-0.5">{text}</span>
            </div>
            {i < STEPS.length - 1 && (
              <span className="text-white/70 text-xl font-light self-center pb-4 shrink-0">›</span>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="mt-3 mx-auto w-full bg-[#0B2A4A]/95 rounded-full px-3 py-2 flex items-center justify-center gap-2 text-white text-[11px] leading-tight font-medium shadow-lg border border-white/10">
        <ChevronsUp className="w-4 h-4 text-[#C6F03A] shrink-0" />
        <span>{hint}</span>
      </div>
    </div>
  );
}
