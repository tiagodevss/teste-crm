import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { LeadAppointment } from '../../../types';
import { useActivitiesStore } from '../store';
import { useUserStore } from '../../Login/store/useUserStore';
import { useAuthorization } from '../../../hooks/useAuthorization';
import { formatDateTime } from '../../../utils/formatters';
import { EmptyState } from '../../../components/ui/EmptyState';
import { AppointmentFormModal } from './AppointmentFormModal';
import { ActivitiesListSkeleton } from './ActivitiesListSkeleton';
import { AppointmentActivityRow } from './AppointmentActivityRow';
import { ActivitiesSectionCard } from './ActivitiesSectionCard';
import { ActivitiesFetchError } from './ActivitiesFetchError';
import { ActivitiesIncludeCompletedToggle } from './ActivitiesIncludeCompletedToggle';
import { useAppointmentMutations } from '../hooks/useAppointmentMutations';
import {
  ACTIVITIES_NEW_EVENT,
  endOfWeekIso,
  filterByActiveStatus,
  isDueSoonAppointment,
  isOverdueAppointment,
  sortByScheduledTime,
} from '../activitiesHelpers';
import { announceActivities } from '../activitiesAnnounce';
import { COMPACT_PRIMARY_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from '../activitiesUi';

interface ActivitiesOverviewProps {
  ownerUserId?: string;
}

export const ActivitiesOverview: React.FC<ActivitiesOverviewProps> = ({ ownerUserId }) => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { hasActionPermission } = useAuthorization();
  const { appointments, fetchAppointments, isLoading, error } = useActivitiesStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LeadAppointment | null>(null);
  const [includeCompleted, setIncludeCompleted] = useState(false);

  const effectiveOwnerId = ownerUserId || user?.id;
  const canCreate = hasActionPermission('lead-appointments.create');
  const canEdit = hasActionPermission('lead-appointments.edit');

  const refetch = useCallback(() => {
    if (!effectiveOwnerId) return;
    const today = new Date().toISOString().slice(0, 10);
    void fetchAppointments({
      page: 1,
      ownerUserId: effectiveOwnerId,
      dateFrom: today,
      dateTo: endOfWeekIso(new Date()),
      limit: 200,
    });
  }, [effectiveOwnerId, fetchAppointments]);

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

  const { todayItems, weekItems, returnItems, priorityItems } = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayList: LeadAppointment[] = [];
    const weekList: LeadAppointment[] = [];
    const returnsList: LeadAppointment[] = [];
    const priorityList: LeadAppointment[] = [];

    for (const appt of appointments) {
      const day = appt.scheduledAt.slice(0, 10);
      if (appt.type === 'follow_up') {
        returnsList.push(appt);
        if (
          appt.status === 'scheduled' &&
          day === todayStr &&
          (isOverdueAppointment(appt) || isDueSoonAppointment(appt))
        ) {
          priorityList.push(appt);
        }
        continue;
      }
      if (day === todayStr) {
        todayList.push(appt);
        if (
          appt.status === 'scheduled' &&
          (isOverdueAppointment(appt) || isDueSoonAppointment(appt))
        ) {
          priorityList.push(appt);
        }
      } else if (day > todayStr) {
        weekList.push(appt);
      }
    }

    return {
      todayItems: todayList.sort(sortByScheduledTime),
      weekItems: weekList.sort(sortByScheduledTime),
      returnItems: returnsList.sort(sortByScheduledTime),
      priorityItems: priorityList.sort(sortByScheduledTime),
    };
  }, [appointments]);

  const visibleToday = filterByActiveStatus(todayItems, includeCompleted);
  const visibleWeek = filterByActiveStatus(weekItems, includeCompleted);
  const visibleReturns = filterByActiveStatus(returnItems, includeCompleted);
  const visiblePriority = filterByActiveStatus(priorityItems, includeCompleted);
  const priorityIds = useMemo(
    () => new Set(visiblePriority.map((item) => item.id)),
    [visiblePriority],
  );
  const todayWithoutPriority = visibleToday.filter((item) => !priorityIds.has(item.id));
  const returnsWithoutPriority = visibleReturns.filter((item) => !priorityIds.has(item.id));

  const scheduledToday = todayItems.filter((i) => i.status === 'scheduled').length;
  const scheduledWeek = weekItems.filter((i) => i.status === 'scheduled').length;
  const pendingReturns = returnItems.filter((i) => i.status === 'scheduled').length;

  const renderList = (
    items: LeadAppointment[],
    emptyTitle: string,
    emptyDescription: string,
  ) => {
    if (items.length === 0) {
      return (
        <EmptyState
          icon={CalendarClock}
          title={emptyTitle}
          description={emptyDescription}
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
      );
    }
    return (
      <ul className="divide-y divide-gray-100">
        {items.map((item) => (
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
            showFullDateTime
            formatDateTime={formatDateTime}
            highlightUrgent={isOverdueAppointment(item) || isDueSoonAppointment(item)}
          />
        ))}
      </ul>
    );
  };

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
        {!showPageSkeleton && !error && appointments.length > 0 ? (
          <p className="text-sm text-gray-600" role="status">
            <span className="font-semibold text-gray-900 tabular-nums">{scheduledToday}</span> hoje
            <span className="text-gray-300 mx-2" aria-hidden>
              ·
            </span>
            <span className="font-semibold text-gray-900 tabular-nums">{scheduledWeek}</span> esta
            semana
            <span className="text-gray-300 mx-2" aria-hidden>
              ·
            </span>
            <span className="font-semibold text-gray-900 tabular-nums">{pendingReturns}</span>{' '}
            retornos agendados
          </p>
        ) : !error ? (
          <p className="text-sm text-gray-500">Visão da semana atual</p>
        ) : (
          <span className="text-sm text-gray-500" />
        )}

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

      {showPageSkeleton ? (
        <ActivitiesListSkeleton rows={6} />
      ) : (
        <>
          {visiblePriority.length > 0 ? (
            <ActivitiesSectionCard
              id="activities-priority-heading"
              title="Prioridade agora"
              count={visiblePriority.length}
              description="Itens de hoje no horário atual ou com até 15 minutos de atraso."
            >
              {renderList(
                visiblePriority,
                'Nenhuma urgência no momento',
                'Itens atrasados ou no horário atual aparecerão aqui.',
              )}
            </ActivitiesSectionCard>
          ) : null}

          <div className="grid lg:grid-cols-2 gap-4">
            <ActivitiesSectionCard id="activities-today-heading" title="Hoje" count={todayWithoutPriority.length}>
              {renderList(
                todayWithoutPriority,
                'Nada para hoje',
                'Agende uma reunião, visita ou retorno para manter o pipeline em movimento.',
              )}
            </ActivitiesSectionCard>

            <ActivitiesSectionCard
              id="activities-week-heading"
              title="Esta semana"
              count={visibleWeek.length}
            >
              {renderList(
                visibleWeek,
                'Sem atividades futuras esta semana',
                'Atividades agendadas para os próximos dias aparecerão aqui.',
              )}
            </ActivitiesSectionCard>
          </div>

          <ActivitiesSectionCard
            id="activities-returns-heading"
            title="Retornos agendados"
            count={returnsWithoutPriority.length}
            description="Follow-ups com clientes ou leads — listados à parte para facilitar o acompanhamento."
          >
            {renderList(
              returnsWithoutPriority,
              'Nenhum retorno na semana',
              'Retornos são follow-ups — agende pelo botão Nova atividade.',
            )}
          </ActivitiesSectionCard>
        </>
      )}

      <AppointmentFormModal
        open={modalOpen}
        onClose={closeModal}
        appointment={editingItem}
        defaultOwnerUserId={effectiveOwnerId}
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
