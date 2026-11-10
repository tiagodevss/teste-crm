import type { Lead } from '../types';

/** Lead com anormalidade sinalizada (API: anomalyFlag). */
export function isLeadAnomalyFlagged(lead: Pick<Lead, 'anomalyFlag' | 'flowAnomalyFlagged'>): boolean {
  return Boolean(lead.anomalyFlag ?? lead.flowAnomalyFlagged);
}

export function getLeadAnomalyNote(
  lead: Pick<Lead, 'anomalyDescription' | 'flowAnomalyNote'>,
): string | undefined {
  return lead.anomalyDescription ?? lead.flowAnomalyNote ?? undefined;
}

export function toAnomalyUpdatePayload(payload: {
  flowAnomalyFlagged: boolean;
  flowAnomalyNote?: string;
}): { anomalyFlag: boolean; anomalyDescription?: string } {
  return {
    anomalyFlag: payload.flowAnomalyFlagged,
    anomalyDescription: payload.flowAnomalyFlagged
      ? payload.flowAnomalyNote?.trim() || undefined
      : undefined,
  };
}
