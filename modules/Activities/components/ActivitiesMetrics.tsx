import React from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import type { ActivitiesDashboardMetrics } from '../hooks/useActivitiesDashboard';

interface ActivitiesMetricsProps {
  metrics: ActivitiesDashboardMetrics;
  isLoading?: boolean;
}

const cards = [
  {
    key: 'pendingToday',
    label: 'Pendentes hoje',
    helper: 'na agenda',
    Icon: CalendarDays,
    iconClass: 'bg-blue-50 text-blue-600 ring-blue-100',
  },
  {
    key: 'completedToday',
    label: 'Concluídas',
    helper: 'finalizadas hoje',
    Icon: CheckCircle2,
    iconClass: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  },
  {
    key: 'overdueToday',
    label: 'Atrasadas',
    helper: 'exigem atenção',
    Icon: AlertTriangle,
    iconClass: 'bg-rose-50 text-rose-600 ring-rose-100',
  },
  {
    key: 'followUpsToday',
    label: 'Follow-ups',
    helper: 'retornos programados',
    Icon: RefreshCw,
    iconClass: 'bg-violet-50 text-violet-600 ring-violet-100',
  },
] as const;

export function ActivitiesMetrics({ metrics, isLoading = false }: ActivitiesMetricsProps) {
  return (
    <section aria-label="Resumo das atividades de hoje" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map(({ key, label, helper, Icon, iconClass }) => (
        <article
          key={key}
          className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5"
        >
          <div className="flex items-start gap-3">
            <span
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${iconClass}`}
              aria-hidden
            >
              <Icon size={20} strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-600">{label}</p>
              {isLoading ? (
                <div className="mt-2 h-7 w-14 animate-pulse rounded bg-slate-100" aria-hidden />
              ) : (
                <p className="mt-0.5 text-2xl font-bold tracking-[-0.02em] text-slate-950 tabular-nums">
                  {metrics[key]}
                </p>
              )}
              <p className="mt-1 truncate text-xs text-slate-500">{helper}</p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
