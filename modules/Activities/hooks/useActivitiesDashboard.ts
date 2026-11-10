import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/axios';
import type { LeadAppointment, PaginatedResponse } from '../../../types';
import { addDays, isOverdueAppointment, sortByScheduledTime } from '../activitiesHelpers';

export interface ActivitiesDashboardMetrics {
  pendingToday: number;
  completedToday: number;
  overdueToday: number;
  followUpsToday: number;
  todayTotal: number;
  noShowToday: number;
  canceledToday: number;
  productivityPercent: number;
  upcoming: LeadAppointment[];
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function buildActivitiesDashboardMetrics(
  items: LeadAppointment[],
  today = todayIso(),
): ActivitiesDashboardMetrics {
  const todayItems = items.filter((item) => item.scheduledAt.slice(0, 10) === today);
  const completedToday = todayItems.filter((item) => item.status === 'completed').length;
  const pendingToday = todayItems.filter((item) => item.status === 'scheduled').length;
  const noShowToday = todayItems.filter((item) => item.status === 'no_show').length;
  const canceledToday = todayItems.filter((item) => item.status === 'canceled').length;
  const overdueToday = todayItems.filter(isOverdueAppointment).length;
  const followUpsToday = todayItems.filter(
    (item) => item.type === 'follow_up' && item.status === 'scheduled',
  ).length;
  const consideredToday = todayItems.filter((item) => item.status !== 'canceled').length;
  const productivityPercent = consideredToday > 0
    ? Math.round((completedToday / consideredToday) * 100)
    : 0;
  const now = Date.now();
  const upcoming = items
    .filter((item) => item.status === 'scheduled' && new Date(item.scheduledAt).getTime() >= now)
    .sort(sortByScheduledTime)
    .slice(0, 4);

  return {
    pendingToday,
    completedToday,
    overdueToday,
    followUpsToday,
    todayTotal: todayItems.length,
    noShowToday,
    canceledToday,
    productivityPercent,
    upcoming,
  };
}

export function useActivitiesDashboard(ownerUserId?: string) {
  const [items, setItems] = useState<LeadAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!ownerUserId) {
      setItems([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    const today = todayIso();
    const query = new URLSearchParams({
      page: '1',
      limit: '200',
      ownerUserId,
      dateFrom: today,
      dateTo: addDays(today, 7),
    });
    try {
      const response = await api.get<PaginatedResponse<LeadAppointment>>(
        `/lead-appointments?${query.toString()}`,
      );
      setItems(response.data.data ?? []);
    } catch {
      setError('Não foi possível atualizar o resumo das atividades.');
    } finally {
      setIsLoading(false);
    }
  }, [ownerUserId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    const handleChange = () => void refetch();
    window.addEventListener('demo:changed', handleChange);
    return () => window.removeEventListener('demo:changed', handleChange);
  }, [refetch]);

  const metrics = useMemo(() => buildActivitiesDashboardMetrics(items), [items]);

  return { items, metrics, isLoading, error, refetch };
}
