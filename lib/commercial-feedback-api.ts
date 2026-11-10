import { api } from './axios';
import type { CommercialFeedback, LeadLossInput } from './commercial-feedback';
const path = (id: string) => `/leads/${encodeURIComponent(id)}`;
export async function fetchCommercialFeedback(id: string, signal?: AbortSignal): Promise<CommercialFeedback> {
  return (await api.get<CommercialFeedback>(`${path(id)}/commercial-feedback`, { signal })).data;
}
export async function saveResponseDeadline(id: string, responseDeadline: string | null): Promise<CommercialFeedback> {
  return (await api.put<CommercialFeedback>(`${path(id)}/response-deadline`, { responseDeadline })).data;
}
export async function registerLeadLoss(id: string, input: LeadLossInput): Promise<{ id: string; stage: string; status: string; warnings?: string[] }> {
  return (await api.post(`${path(id)}/loss`, input)).data;
}
