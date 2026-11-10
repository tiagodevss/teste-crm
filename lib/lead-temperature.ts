import type { Lead } from '../types';

export type LeadTemperature = 'hot' | 'warm' | 'cold';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOT_ADVANCE_WINDOW_DAYS = 7;

export function isLeadTemperature(
  value: string | null | undefined,
): value is LeadTemperature {
  return value === 'hot' || value === 'warm' || value === 'cold';
}

function ageInDays(value: string | undefined, now: number): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((now - timestamp) / DAY_MS));
}

function latestValidDate(...values: Array<string | undefined>): string | undefined {
  let latestValue: string | undefined;
  let latestTimestamp = Number.NEGATIVE_INFINITY;

  for (const value of values) {
    if (!value) continue;
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp) || timestamp <= latestTimestamp) continue;
    latestTimestamp = timestamp;
    latestValue = value;
  }

  return latestValue;
}

function hasTwoFastStageAdvances(lead: Lead, now: number): boolean {
  const transitions = (lead.timeline ?? [])
    .filter((event) => event.type === 'stage_change')
    .map((event) => new Date(event.date).getTime())
    .filter((timestamp) => !Number.isNaN(timestamp))
    .sort((a, b) => b - a);

  if (transitions.length < 2) return false;
  const [latest, previous] = transitions;
  const latestAdvanceIsRecent = now - latest <= HOT_ADVANCE_WINDOW_DAYS * DAY_MS;
  return latestAdvanceIsRecent && latest - previous <= HOT_ADVANCE_WINDOW_DAYS * DAY_MS;
}

export function getDaysInCurrentStage(lead: Lead, now = Date.now()): number {
  return ageInDays(lead.enteredStageAt ?? lead.createdAt, now) ?? 0;
}

export function getDaysInactive(lead: Lead, now = Date.now()): number {
  const reference = latestValidDate(
    lead.createdAt,
    lead.enteredStageAt,
    lead.lastContactDate,
  );
  return ageInDays(reference, now) ?? 0;
}

/**
 * Usa a temperatura canônica devolvida pela API quando disponível. O cálculo
 * local permanece como fallback para objetos criados/atualizados no cliente que
 * ainda não tenham sido recarregados da listagem.
 */
export function getLeadTemperature(lead: Lead & { temperature?: string }, now = Date.now()): LeadTemperature {
  const serverTemperature = (lead as Lead & { temperature?: string }).temperature;
  if (isLeadTemperature(serverTemperature)) return serverTemperature;

  const stageDays = getDaysInCurrentStage(lead, now);
  const inactiveDays = getDaysInactive(lead, now);

  if (lead.slaStatus === 'overdue' || inactiveDays >= 7) return 'cold';
  if (
    hasTwoFastStageAdvances(lead, now) &&
    stageDays <= 2 &&
    inactiveDays <= 2 &&
    lead.slaStatus !== 'warning'
  ) {
    return 'hot';
  }
  return 'warm';
}

