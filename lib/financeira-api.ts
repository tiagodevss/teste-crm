import { api } from './axios';
import type { CustomFieldEntry, Lead } from '../types';

export interface MunicipioOption {
  ibgeCode: number;
  name: string;
  uf: string;
  /** Valor persistido: `<município> - <UF>`. */
  value: string;
}

export interface CreditoConcluidoItem {
  id: string;
  name: string;
  cpfMasked: string | null;
  partnerName: string | null;
  concludedAt: string;
}

export interface CreditosDisponiveisPage {
  total: number;
  page: number;
  limit: number;
  items: CreditoConcluidoItem[];
}

export type OutboundMessageStatus =
  | 'PENDING'
  | 'SENDING'
  | 'ACCEPTED'
  | 'FAILED'
  | 'UNKNOWN'
  | 'CANCELLED';

export interface FinanceiraMessageItem {
  id: string;
  kind: 'SIMULACAO' | 'BOLETO';
  status: OutboundMessageStatus;
  recipientName?: string | null;
  recipientMasked: string | null;
  fileName?: string | null;
  requestedAt: string;
  acceptedAt?: string | null;
  lastErrorCode?: string | null;
  attemptCount: number;
  shareId?: string | null;
  shareStatus?: 'ACTIVE' | 'REVOKED' | null;
  canResend?: boolean;
  requiresDuplicateConfirmation?: boolean;
}

export interface FinanceiraMessagesResponse {
  whatsappConfigured: boolean;
  messages: FinanceiraMessageItem[];
}

export interface SiopiAdvanceResult {
  toStage: string;
  ruleKey: string;
  lead: Lead;
}

export interface StageMoveResult {
  lead: Lead;
  fromStage: string;
  toStage: string;
}

export async function searchMunicipios(query: string, signal?: AbortSignal): Promise<MunicipioOption[]> {
  const { data } = await api.get<MunicipioOption[]>('/financeira/municipios', {
    params: { query, limit: 20 },
    signal,
  });
  return data;
}

export async function listCreditosConcluidos(params: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<CreditosDisponiveisPage> {
  const { data } = await api.get<CreditosDisponiveisPage>('/financeira/credito/concluidos-disponiveis', { params });
  return data;
}

export async function createRepasseFromCredito(creditoLeadId: string) {
  const { data } = await api.post<{ repasseLeadId: string; sourceLeadId: string; stage: string }>(
    '/financeira/repasse/from-credito',
    { creditoLeadId },
  );
  return data;
}

export async function advanceSiopi(leadId: string, expectedUpdatedAt?: string) {
  const { data } = await api.post<SiopiAdvanceResult>(`/financeira/leads/${leadId}/siopi/avancar`, {
    expectedUpdatedAt,
  });
  return data;
}

export async function markPendencia(leadId: string, motivo: string) {
  const { data } = await api.post<StageMoveResult>(`/financeira/leads/${leadId}/pendencia`, { motivo });
  return data;
}

export async function markDesistencia(leadId: string, motivo: string) {
  const { data } = await api.post<StageMoveResult>(`/financeira/leads/${leadId}/desistir`, { motivo });
  return data;
}

export async function resumeLead(leadId: string, targetStepId: string, customFields?: CustomFieldEntry[]) {
  const { data } = await api.post<StageMoveResult>(`/financeira/leads/${leadId}/retomar`, {
    targetStepId,
    customFields,
  });
  return data;
}

export async function listLeadMessages(leadId: string) {
  const { data } = await api.get<FinanceiraMessagesResponse>(`/financeira/leads/${leadId}/mensagens`);
  return data;
}

export async function resendMessage(leadId: string, messageId: string, confirmPossibleDuplicate: boolean) {
  const { data } = await api.post<{ id: string; status: OutboundMessageStatus }>(
    `/financeira/leads/${leadId}/mensagens/${messageId}/reenviar`,
    { confirmPossibleDuplicate },
  );
  return data;
}

export async function revokeDocumentShare(shareId: string) {
  const { data } = await api.post<{ revoked: boolean }>(`/financeira/document-shares/${shareId}/revogar`);
  return data;
}

/** Código de erro padronizado do backend financeiro (`FINANCEIRA_*`), quando houver. */
export function getFinanceiraErrorCode(error: unknown): string | null {
  const data = (error as { response?: { data?: { code?: unknown; details?: unknown } } })?.response?.data;
  return typeof data?.code === 'string' ? data.code : null;
}

export function getFinanceiraErrorDetails(error: unknown): Record<string, unknown> | null {
  const details = (error as { response?: { data?: { details?: unknown } } })?.response?.data?.details;
  return details && typeof details === 'object' ? (details as Record<string, unknown>) : null;
}
