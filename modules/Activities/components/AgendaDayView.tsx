import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Target,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import type { LeadAppointment } from '../../../types';
import { useActivitiesStore } from '../store';
import { useUserStore } from '../../Login/store/useUserStore';
import { useAuthorization } from '../../../hooks/useAuthorization';
import { EmptyState } from '../../../components/ui/EmptyState';
import { AppointmentFormModal } from './AppointmentFormModal';
import { ActivitiesListSkeleton } from './ActivitiesListSkeleton';
import { AppointmentActivityRow } from './AppointmentActivityRow';
import { ActivitiesFetchError } from './ActivitiesFetchError';
import { useAppointmentMutations } from '../hooks/useAppointmentMutations';
import {
  ACTIVITIES_NEW_EVENT,
  addDays,
  getAppointmentEntityLabel,
  isDueSoonAppointment,
  isOverdueAppointment,
  sortByScheduledTime,
} from '../activitiesHelpers';
import { announceActivities } from '../activitiesAnnounce';
import {
  ACTIVITIES_FOCUS_RING,
  ACTIVITIES_INPUT_CLASS,
  COMPACT_PRIMARY_BUTTON_CLASS,
  PRIMARY_BUTTON_CLASS,
} from '../activitiesUi';
import { APPOINTMENT_STATUS_LABEL } from '../constants';

interface AgendaDayViewProps {
  ownerUserId?: string;
  dashboardItems?: LeadAppointment[];
  dashboardLoading?: boolean;
}

type AgendaStatusFilter = 'all' | 'scheduled' | 'completed' | 'no_show' | 'canceled';

const STATUS_FILTERS: Array<{ value: AgendaStatusFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'scheduled', label: 'Agendado' },
  { value: 'completed', label: 'Concluído' },
  { value: 'no_show', label: 'Não veio' },
  { value: 'canceled', label: 'Cancelado' },
];

const AGENDA_NAV_BUTTON_CLASS = [
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white',
  'text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900',
  ACTIVITIES_FOCUS_RING,
].join(' ');

function capitalizeFirst(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function formatUpcomingDate(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function buildStatusGradient(items: LeadAppointment[]) {
  if (items.length === 0) return '#e2e8f0';
  const statuses = [
    { key: 'scheduled', color: '#3b82f6' },
    { key: 'completed', color: '#10b981' },
    { key: 'no_show', color: '#f59e0b' },
    { key: 'canceled', color: '#f43f5e' },
  ];
  let cursor = 0;
  const segments: string[] = [];
  for (const status of statuses) {
    const count = items.filter((item) => item.status === status.key).length;
    if (!count) continue;
    const next = cursor + (count / items.length) * 100;
    segments.push(`${status.color} ${cursor}% ${next}%`);
    cursor = next;
  }
  if (cursor < 100) segments.push(`#e2e8f0 ${cursor}% 100%`);
  return `conic-gradient(${segments.join(', ')})`;
}

export const AgendaDayView: React.FC<AgendaDayViewProps> = ({
  ownerUserId,
  dashboardItems = [],
  dashboardLoading = false,
}) => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { hasActionPermission } = useAuthorization();
  const { appointments, fetchAppointments, isLoading, error } = useActivitiesStore();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<AgendaStatusFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LeadAppointment | null>(null);

  const effectiveOwnerId = ownerUserId || user?.id;
  const canCreate = hasActionPermission('lead-appointments.create');
  const canEdit = hasActionPermission('lead-appointments.edit');
  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = selectedDate === todayStr;

  const refetch = useCallback(() => {
    if (!effectiveOwnerId) return;
    void fetchAppointments({
      page: 1,
      ownerUserId: effectiveOwnerId,
      dateFrom: selectedDate,
      dateTo: selectedDate,
      limit: 200,
    });
  }, [effectiveOwnerId, selectedDate, fetchAppointments]);

  const {
    completingId,
    mutatingId,
    handleComplete,
    handleStatusChange,
    ConfirmDialog,
  } = useAppointmentMutations({ onSuccess: refetch });

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const openModal = () => {
      setEditingItem(null);
      setModalOpen(true);
    };
    window.addEventListener(ACTIVITIES_NEW_EVENT, openModal);
    return () => window.removeEventListener(ACTIVITIES_NEW_EVENT, openModal);
  }, []);

  const openEditModal = (item: LeadAppointment) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
  };

  const dayItems = useMemo(
    () => [...appointments].sort(sortByScheduledTime),
    [appointments],
  );

  const visibleItems = useMemo(
    () => statusFilter === 'all'
      ? dayItems
      : dayItems.filter((item) => item.status === statusFilter),
    [dayItems, statusFilter],
  );

  const formattedDay = capitalizeFirst(
    new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
  );

  const scheduledCount = dayItems.filter((item) => item.status === 'scheduled').length;
  const completedCount = dayItems.filter((item) => item.status === 'completed').length;
  const noShowCount = dayItems.filter((item) => item.status === 'no_show').length;
  const canceledCount = dayItems.filter((item) => item.status === 'canceled').length;
  const consideredCount = dayItems.filter((item) => item.status !== 'canceled').length;
  const productivity = consideredCount > 0 ? Math.round((completedCount / consideredCount) * 100) : 0;
  const showPageSkeleton = isLoading && !error;
  const statusGradient = buildStatusGradient(dayItems);

  const upcoming = useMemo(
    () => [...dashboardItems]
      .filter((item) => item.status === 'scheduled' && new Date(item.scheduledAt).getTime() >= Date.now())
      .sort(sortByScheduledTime)
      .slice(0, 4),
    [dashboardItems],
  );

  return (
    <div
      className="space-y-4"
      aria-busy={isLoading && appointments.length > 0 ? true : undefined}
    >
      {error ? (
        <ActivitiesFetchError
          message={error}
          onRetry={refetch}
          isRetrying={isLoading}
          staleData={appointments.length > 0}
        />
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm" aria-label="Filtros da agenda">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
              className={AGENDA_NAV_BUTTON_CLASS}
              aria-label="Dia anterior"
            >
              <ChevronLeft size={18} aria-hidden />
            </button>

            <label htmlFor="agenda-date-picker" className="sr-only">
              Selecionar data da agenda
            </label>
            <input
              id="agenda-date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`${ACTIVITIES_INPUT_CLASS} min-h-[40px] px-3 py-2 font-medium text-slate-700`}
            />

            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              className={AGENDA_NAV_BUTTON_CLASS}
              aria-label="Próximo dia"
            >
              <ChevronRight size={18} aria-hidden />
            </button>

            {!isToday ? (
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`min-h-[40px] rounded-lg px-3 text-xs font-semibold text-salesforce-blue transition-colors hover:bg-blue-50 ${ACTIVITIES_FOCUS_RING}`}
              >
                Hoje
              </button>
            ) : null}

            <span className="hidden h-7 w-px bg-slate-200 md:block" aria-hidden />

            <div className="flex flex-wrap gap-1.5" aria-label="Filtrar por status">
              {STATUS_FILTERS.map((option) => {
                const active = statusFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStatusFilter(option.value)}
                    className={`min-h-[36px] rounded-lg px-3 text-xs font-semibold transition-colors ${ACTIVITIES_FOCUS_RING} ${
                      active
                        ? 'bg-salesforce-blue text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {canCreate ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className={`${PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
              title="Atalho: Alt + N"
            >
              <Plus size={16} aria-hidden />
              Nova atividade
            </button>
          ) : null}
        </div>
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="agenda-day-heading">
          <header className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-salesforce-blue ring-1 ring-inset ring-blue-100" aria-hidden>
                <CalendarDays size={19} />
              </span>
              <div className="min-w-0">
                <h2 id="agenda-day-heading" className="truncate text-base font-bold text-slate-950 sm:text-lg">
                  {formattedDay}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500" role="status">
                  {showPageSkeleton
                    ? 'Carregando agenda...'
                    : `${visibleItems.length} ${visibleItems.length === 1 ? 'atividade exibida' : 'atividades exibidas'} · ${scheduledCount} agendada${scheduledCount === 1 ? '' : 's'}`}
                </p>
              </div>
            </div>
            {statusFilter !== 'all' ? (
              <span className="self-start rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 sm:self-auto">
                {APPOINTMENT_STATUS_LABEL[statusFilter] ?? statusFilter}
              </span>
            ) : null}
          </header>

          <div className="min-h-[24rem] p-4 sm:p-5">
            {showPageSkeleton ? (
              <ActivitiesListSkeleton rows={4} showTimeColumn />
            ) : visibleItems.length === 0 && !error ? (
              <EmptyState
                icon={CalendarDays}
                title="Nenhuma atividade neste filtro"
                description={
                  dayItems.length > 0
                    ? 'Escolha outro status para visualizar os compromissos desta data.'
                    : 'Use Nova atividade para agendar ou navegue para outro dia.'
                }
                compact
                action={
                  canCreate && dayItems.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      className={COMPACT_PRIMARY_BUTTON_CLASS}
                    >
                      <Plus size={14} aria-hidden />
                      Nova atividade
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <ul className="space-y-4">
                {visibleItems.map((item) => (
                  <AppointmentActivityRow
                    key={item.id}
                    item={item}
                    onNavigate={(path) => navigate(path)}
                    onComplete={handleComplete}
                    onEdit={canEdit && item.status === 'scheduled' ? openEditModal : undefined}
                    onStatusChange={canEdit ? handleStatusChange : undefined}
                    canComplete={canEdit}
                    isCompleting={completingId === item.id}
                    isMutating={mutatingId === item.id}
                    showTime
                    formatDateTime={() => ''}
                    highlightUrgent={isOverdueAppointment(item) || isDueSoonAppointment(item)}
                    layout="timeline"
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="min-w-0 space-y-4" aria-label="Resumo da agenda">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-salesforce-blue" aria-hidden>
                <Clock3 size={16} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">Próximas</h3>
                <p className="text-[11px] text-slate-500">próximos 7 dias</p>
              </div>
            </div>

            {dashboardLoading && upcoming.length === 0 ? (
              <div className="mt-4 space-y-3" aria-label="Carregando próximas atividades">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-11 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <p className="mt-4 text-xs leading-relaxed text-slate-500">
                Nenhum compromisso futuro agendado.
              </p>
            ) : (
              <ol className="relative mt-4 space-y-4 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-slate-200">
                {upcoming.map((item) => (
                  <li key={item.id} className="relative pl-5">
                    <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-white" aria-hidden />
                    <time className="block text-[11px] font-semibold text-slate-500 tabular-nums" dateTime={item.scheduledAt}>
                      {formatUpcomingDate(item.scheduledAt)}
                    </time>
                    <button
                      type="button"
                      onClick={() => {
                        const path = item.lead?.id
                          ? `/lead/${item.lead.id}`
                          : item.prospect?.id
                            ? `/prospeccao/${item.prospect.id}`
                            : null;
                        if (path) navigate(path);
                      }}
                      disabled={!item.lead?.id && !item.prospect?.id}
                      className={`mt-0.5 block max-w-full truncate text-left text-xs font-semibold text-slate-800 hover:text-salesforce-blue ${ACTIVITIES_FOCUS_RING} rounded`}
                    >
                      {getAppointmentEntityLabel(item)}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600" aria-hidden>
                <BarChart3 size={16} />
              </span>
              <h3 className="text-sm font-bold text-slate-900">Resumo do dia</h3>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div
                className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full"
                style={{ background: statusGradient }}
                aria-hidden
              >
                <div className="grid h-[4.6rem] w-[4.6rem] place-items-center rounded-full bg-white text-center shadow-inner">
                  <span>
                    <strong className="block text-xl leading-none text-slate-950 tabular-nums">{dayItems.length}</strong>
                    <span className="mt-1 block text-[10px] text-slate-500">atividades</span>
                  </span>
                </div>
              </div>

              <dl className="min-w-0 flex-1 space-y-2 text-[11px]">
                {[
                  ['Agendadas', scheduledCount, 'bg-blue-500'],
                  ['Concluídas', completedCount, 'bg-emerald-500'],
                  ['Não veio', noShowCount, 'bg-amber-500'],
                  ['Canceladas', canceledCount, 'bg-rose-500'],
                ].map(([label, count, dot]) => (
                  <div key={String(label)} className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
                    <dt className="min-w-0 flex-1 truncate text-slate-600">{label}</dt>
                    <dd className="font-semibold text-slate-900 tabular-nums">{count}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600" aria-hidden>
                <Target size={16} />
              </span>
              <h3 className="text-sm font-bold text-slate-900">Produtividade</h3>
              <span className="ml-auto text-sm font-bold text-emerald-700 tabular-nums">{productivity}%</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              {completedCount} de {consideredCount} atividade{consideredCount === 1 ? '' : 's'} considerada{consideredCount === 1 ? '' : 's'} concluída{completedCount === 1 ? '' : 's'} nesta data.
            </p>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Produtividade do dia"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={productivity}
            >
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${productivity}%` }}
              />
            </div>
          </section>
        </aside>
      </div>

      <AppointmentFormModal
        open={modalOpen}
        onClose={closeModal}
        appointment={editingItem}
        defaultOwnerUserId={effectiveOwnerId}
        defaultScheduledAt={selectedDate}
        onSaved={() => {
          closeModal();
          toast.success(editingItem ? 'Atividade atualizada.' : 'Atividade criada.');
          announceActivities(editingItem ? 'Atividade atualizada.' : 'Nova atividade criada.');
          refetch();
        }}
      />

      <ConfirmDialog />
    </div>
  );
};
