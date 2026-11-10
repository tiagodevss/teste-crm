import type { Campaign, CampaignStatus } from '../types';
export function resolveCampaignStatus(campaign: Campaign): CampaignStatus {
    if (campaign.computedStatus) return campaign.computedStatus;
    if (campaign.status) return campaign.status;
    return 'draft';
}
export function getCampaignStatusLabel(status: CampaignStatus): string {
    if (status === 'active') return 'Ativa';
    if (status === 'paused') return 'Pausada';
    if (status === 'finished') return 'Finalizada';
    return 'Rascunho';
}
export function canCampaignReceiveLeads(campaign: Campaign): boolean { return resolveCampaignStatus(campaign) === 'active'; }
