import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { LeadAppointment } from '../../../types';
import { useActivitiesStore } from '../store';
import { useUserStore } from '../../Login/store/useUserStore';
import { useAuthorization } from '../../../hooks/useAuthorization';
import { EmptyState } from '../../../components/ui/EmptyState';
import { AppointmentFormModal } from './AppointmentFormModal';
import { ActivitiesListSkeleton } from './ActivitiesListSkeleton';
import { AppointmentActivityRow } from './AppointmentActivityRow';
import { ActivitiesFetchError } from './ActivitiesFetchError';
import { ActivitiesIncludeCompletedToggle } from './ActivitiesIncludeCompletedToggle';
import { useAppointmentMutations } from '../hooks/useAppointmentMutations';
import {
  ACTIVITIES_NEW_EVENT,
  addDays,
  filterByActiveStatus,
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

interface AgendaDayViewProps {
  ownerUserId?: string;
}

const AGENDA_NAV_BUTTON_CLASS = [
  'inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-lg',
  'hover:bg-white text-gray-600 border border-transparent hover:border-gray-200 transition-colors',
  ACTIVITIES_FOCUS_RING,
].join(' ');

export const AgendaDayView: React.FC<AgendaDayViewProps> = ({ ownerUserId }) => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { hasActionPermission } = useAuthorization();
  const { appointments, fetchAppointments, isLoading, error } = useActivitiesStore();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LeadAppointment | null>(null);
  const [includeCompleted, setIncludeCompleted] = useState(false);

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

  const visibleItems = filterByActiveStatus(dayItems, includeCompleted);

  const formattedDay = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const scheduledCount = dayItems.filter((i) => i.status === 'scheduled').length;
  const showPageSkeleton = isLoading && !error;

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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-gray-600" role="status">
          {showPageSkeleton ? (
            'Carregando agenda...'
          ) : error ? null : (
            <>
              <span className="font-semibold text-gray-900 tabular-nums">{scheduledCount}</span>{' '}
              agendada{scheduledCount !== 1 ? 's' : ''} neste dia
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <ActivitiesIncludeCompletedToggle
            checked={includeCompleted}
            onChange={setIncludeCompleted}
          />
          {canCreate ? (
            <button type="button" onClick={() => setModalOpen(true)} className={PRIMARY_BUTTON_CLASS}>
              <Plus size={16} aria-hidden />
              Nova atividade
            </button>
          ) : null}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 bg-gray-50/80">
          <button
            type="button"
            onClick={() => setSelectedDate((d) => addDays(d, -1))}
            className={AGENDA_NAV_BUTTON_CLASS}
            aria-label="Dia anterior"
          >
            <ChevronLeft size={20} aria-hidden />
          </button>

          <div className="flex-1 text-center min-w-0 px-2">
            <p className="text-sm font-semibold text-gray-900 capitalize truncate">{formattedDay}</p>
            <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
              <label htmlFor="agenda-date-picker" className="sr-only">
                Selecionar data da agenda
              </label>
              <input
                id="agenda-date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`${ACTIVITIES_INPUT_CLASS} px-2.5 py-1.5`}
              />
              {isToday ? (
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md">
                  Hoje
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className={`text-xs font-semibold text-salesforce-blue hover:text-salesforce-hover px-2.5 py-1 min-h-[44px] rounded-md hover:bg-blue-50 transition-colors ${ACTIVITIES_FOCUS_RING}`}
                >
                  Ir para hoje
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            className={AGENDA_NAV_BUTTON_CLASS}
            aria-label="Próximo dia"
          >
            <ChevronRight size={20} aria-hidden />
          </button>
        </div>

        {showPageSkeleton ? (
          <div className="p-4">
            <ActivitiesListSkeleton rows={5} showTimeColumn />
          </div>
        ) : visibleItems.length === 0 && !error ? (
          <EmptyState
            icon={CalendarClock}
            title="Nenhuma atividade neste dia"
            description="Use Nova atividade para agendar ou navegue para outro dia."
            compact
            action={
              canCreate ? (
                <button type="button" onClick={() => setModalOpen(true)} className={COMPACT_PRIMARY_BUTTON_CLASS}>
                  <Plus size={14} aria-hidden />
                  Nova atividade
                </button>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-gray-100">
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
              />
            ))}
          </ul>
        )}
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
