import { AppPath } from '../routes';
import { LeadStatus, type LeadSlaStatus } from '../types';

export type CrmFilterParams = {
  ownerUserId?: string;
  status?: LeadStatus | string;
  slaStatus?: LeadSlaStatus;
  productId?: string;
  partnerId?: string;
  stage?: string;
};

/** Monta URL do CRM com filtros de query string para drill-down a partir dos dashboards. */
export function buildCrmFilterPath(params: CrmFilterParams): string {
  const q = new URLSearchParams();
  if (params.ownerUserId?.trim()) q.set('ownerUserId', params.ownerUserId.trim());
  if (params.status) q.set('status', String(params.status));
  if (params.slaStatus) q.set('slaStatus', params.slaStatus);
  if (params.productId?.trim()) q.set('productId', params.productId.trim());
  if (params.partnerId?.trim()) q.set('partnerId', params.partnerId.trim());
  if (params.stage?.trim()) q.set('stage', params.stage.trim());
  const query = q.toString();
  return query ? `${AppPath.CRM}?${query}` : AppPath.CRM;
}

export const CRM_DRILL_DOWN = {
  openOpportunities: (ownerUserId?: string) =>
    buildCrmFilterPath({ status: LeadStatus.OPORTUNIDADE, ownerUserId }),
  slaOverdue: (ownerUserId?: string) =>
    buildCrmFilterPath({ slaStatus: 'overdue', ownerUserId }),
  allLeads: (ownerUserId?: string) => buildCrmFilterPath({ ownerUserId }),
  clients: (ownerUserId?: string) =>
    buildCrmFilterPath({ status: LeadStatus.CLIENTE, ownerUserId }),
  byStage: (stage: string, ownerUserId?: string) =>
    buildCrmFilterPath({ stage, ownerUserId }),
  byPartner: (partnerId: string, status?: LeadStatus | string) =>
    buildCrmFilterPath({ partnerId, status }),
} as const;
