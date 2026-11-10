import { LeadAppointment } from '../../types';

export const ACTIVITIES_NEW_EVENT = 'wms:activities-new';

export function getAppointmentEntityLabel(item: LeadAppointment): string {
  return item.lead?.name ?? item.prospect?.name ?? 'Sem vínculo';
}

export function formatAppointmentTime(value: string): string {
  return new Date(value).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isOverdueAppointment(item: LeadAppointment): boolean {
  if (item.status !== 'scheduled') return false;
  return new Date(item.scheduledAt).getTime() < Date.now() - 15 * 60 * 1000;
}

export function isDueSoonAppointment(item: LeadAppointment): boolean {
  if (item.status !== 'scheduled') return false;
  const scheduled = new Date(item.scheduledAt).getTime();
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  return scheduled <= now + windowMs && scheduled >= now - windowMs;
}

export function filterByActiveStatus(
  items: LeadAppointment[],
  includeCompleted: boolean,
): LeadAppointment[] {
  if (includeCompleted) return items;
  return items.filter((item) => item.status === 'scheduled');
}

export function isPastDateTimeLocal(value: string): boolean {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeekIso(date: Date): string {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end.toISOString().slice(0, 10);
}

export function sortByScheduledTime(a: LeadAppointment, b: LeadAppointment): number {
  return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
}
