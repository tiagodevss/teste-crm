import React, { useId, useState } from 'react';
import { ChevronDown, CircleHelp } from 'lucide-react';
import { ACTIVITIES_FOCUS_RING } from '../activitiesUi';

export function ActivitiesInlineHelp() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="rounded-lg border border-slate-200 bg-white/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 ${ACTIVITIES_FOCUS_RING}`}
      >
        <CircleHelp size={15} className="shrink-0 text-salesforce-blue" aria-hidden />
        Como usar esta página
        <ChevronDown
          size={15}
          className={`ml-auto shrink-0 text-slate-400 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          id={panelId}
          className="grid gap-2 border-t border-slate-100 px-3 py-3 text-xs leading-relaxed text-slate-600 md:grid-cols-3"
        >
          <p>
            <strong className="text-slate-800">Minhas atividades</strong> reúne prioridades e
            compromissos da semana.
          </p>
          <p>
            <strong className="text-slate-800">Agenda do dia</strong> organiza compromissos por
            horário e status.
          </p>
          <p>
            <strong className="text-slate-800">Carteira por consultor</strong> mostra os leads
            atribuídos à equipe.
          </p>
        </div>
      ) : null}
    </div>
  );
}
