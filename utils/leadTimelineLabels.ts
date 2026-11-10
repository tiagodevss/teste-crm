import type { LeadTimelineEvent, LeadTimelineEventType } from '../types';
export function getLeadTimelineTypeLabel(type: LeadTimelineEventType | string): string {
    const map: Record<string, string> = {
        created: 'Entrada', stage_change: 'Etapa', status_change: 'Status', contact_attempt: 'Contato',
        comment: 'Comentário', value_change: 'Valor', owner_assigned: 'Responsável', conversion: 'Conversão',
        converted_from_prospect: 'Prospecção', loss: 'Perda', response_deadline_changed: 'Prazo de resposta',
        client_record_synced: 'Cliente', commercial_origin_updated: 'Origem comercial',
        proposal_created: 'Proposta criada', proposal_sent: 'Proposta enviada', proposal_accepted: 'Proposta aceita',
        proposal_rejected: 'Proposta rejeitada', department_handoff: 'Handoff', department_task_status_changed: 'Setor',
        department_task_completed: 'Setor concluído', appointment_scheduled: 'Retorno agendado',
        appointment_updated: 'Retorno atualizado', appointment_status_changed: 'Retorno', appointment_removed: 'Retorno removido',
    };
    return map[type] ?? 'Evento';
}
export function getLeadTimelineSourceLabel(event: Pick<LeadTimelineEvent, 'type' | 'source' | 'metadata'>): string | null {
    if (event.type === 'owner_assigned' && event.metadata?.source === 'stage_rule') return 'Regra da etapa';
    if (event.source === 'rule') return 'Regra da etapa';
    if (event.source === 'import') return 'Importação';
    if (event.source === 'system') return 'Sistema';
    return null;
}
