import React, { useEffect, useId, useState } from 'react';
import { ChevronDown, CircleHelp } from 'lucide-react';
import { ACTIVITIES_FOCUS_RING } from '../activitiesUi';

const HELP_SEEN_KEY = 'contabil-activities-help-seen';

export function ActivitiesInlineHelp() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = window.localStorage.getItem(HELP_SEEN_KEY);
    if (!seen) {
      setOpen(true);
      window.localStorage.setItem(HELP_SEEN_KEY, '1');
    }
  }, []);

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 text-left ${ACTIVITIES_FOCUS_RING} rounded-lg`}
      >
        <CircleHelp size={16} className="text-salesforce-blue shrink-0" aria-hidden />
        Como usar esta página
        <ChevronDown
          size={16}
          className={`ml-auto shrink-0 text-gray-400 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          id={panelId}
          className="px-4 pb-3 pt-0 text-sm text-gray-600 leading-relaxed space-y-2 border-t border-gray-200/80"
        >
          <p>
            <strong className="text-gray-800">Minhas atividades</strong> — fila da semana: o que é
            hoje, o que vem nos próximos dias e retornos agendados.
          </p>
          <p>
            <strong className="text-gray-800">Agenda do dia</strong> — compromissos de uma data com
            navegação por setas ou seletor.
          </p>
          <p>
            <strong className="text-gray-800">Carteira por consultor</strong> — leads atribuídos à
            equipe; para retornos e compromissos, use as outras abas.
          </p>
        </div>
      ) : null}
    </div>
  );
}
