import { LeadStatus, type Lead } from '../types';
import { getDaysInactive } from './lead-temperature';
export { getDaysInCurrentStage, getDaysInactive, getLeadTemperature, isLeadTemperature } from './lead-temperature';
export type { LeadTemperature } from './lead-temperature';

function hasFutureAppointment(value?: string): boolean {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return !Number.isNaN(timestamp) && timestamp > Date.now();
}

export function needsFollowUp(lead: Lead, inactivityDays = 3): boolean {
  if (hasFutureAppointment(lead.nextAppointmentAt)) return false;
  if (lead.status === LeadStatus.CLIENTE || lead.status === LeadStatus.PERDIDO) return false;
  return getDaysInactive(lead) >= inactivityDays;
}
