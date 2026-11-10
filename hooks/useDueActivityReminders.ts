import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { LeadAppointment } from '../types';
import { api } from '../lib/axios';
import { useUserStore } from '../modules/Login/store/useUserStore';

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function isDueNow(appointment: LeadAppointment) {
  if (appointment.status !== 'scheduled') return false;
  const scheduled = new Date(appointment.scheduledAt).getTime();
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  return scheduled <= now + windowMs && scheduled >= now - windowMs;
}

function isOverdue(appointment: LeadAppointment) {
  if (appointment.status !== 'scheduled') return false;
  return new Date(appointment.scheduledAt).getTime() < Date.now() - 15 * 60 * 1000;
}

export function useDueActivityReminders(enabled = true, ownerUserId?: string) {
  const user = useUserStore((s) => s.user);
  const effectiveOwnerId = ownerUserId ?? user?.id;
  const [dueItems, setDueItems] = useState<LeadAppointment[]>([]);
  const notifiedRef = useRef<Set<string>>(new Set());

  const fetchDue = useCallback(async () => {
    if (!enabled || !effectiveOwnerId) return;
    try {
      const today = todayIsoDate();
      const response = await api.get<{ data: LeadAppointment[] }>('/lead-appointments', {
        params: {
          ownerUserId: effectiveOwnerId,
          dateFrom: today,
          dateTo: today,
          status: 'scheduled',
          limit: 100,
        },
      });
      const items = response.data.data ?? [];
      const urgent = items.filter((a) => isDueNow(a) || isOverdue(a));
      setDueItems(urgent);

      for (const item of urgent) {
        if (notifiedRef.current.has(item.id)) continue;
        notifiedRef.current.add(item.id);
        const label = item.lead?.name ?? item.prospect?.name ?? 'Compromisso';
        const when = new Date(item.scheduledAt).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const title = isOverdue(item) ? 'Retorno atrasado' : 'Retorno agora';
        toast(`${title}: ${label} · ${when}`, {
          duration: 8000,
          id: `reminder-${item.id}`,
        });
      }
    } catch {
      // silencioso — lembretes são best-effort
    }
  }, [enabled, effectiveOwnerId]);

  useEffect(() => {
    void fetchDue();
    const interval = window.setInterval(() => void fetchDue(), 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [fetchDue]);

  return { dueItems, refreshDue: fetchDue };
}
