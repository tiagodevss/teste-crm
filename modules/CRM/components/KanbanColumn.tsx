import React from 'react';
import { GripVertical, CalendarClock, Megaphone, Siren, Tags } from 'lucide-react';
import { LeadStatus, PipeId, Lead, Pipe, LeadLabel } from '../../../types';
import { LabelChip } from '../../../components/ui/LabelChip';
import { SlaBadge } from '../../../components/ui/SlaBadge';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { LeadFlowAnomalyBadge } from '../../Lead/components/LeadFlowAnomalySection';
import { getCustomFieldValue } from '../../../utils/leadCustomFields';
import { formatDate, formatCurrency } from '../../../utils/formatters';
import { isLeadAnomalyFlagged } from '../../../lib/lead-anomaly';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import type { StageData } from '../schemas';

function getLeadOriginLabel(lead: Lead): string | null {
    if (lead.sourceSubtype?.trim()) return lead.sourceSubtype.trim();
    if (lead.sourceType?.trim()) {
        const sourceMap: Record<string, string> = {
            manual: 'Manual',
            import: 'Importação',
            public: 'Pública',
            campaign: 'Campanha',
            partner: 'Parceiro',
        };
        return sourceMap[lead.sourceType] ?? lead.sourceType;
    }
    if (lead.origin?.trim()) return lead.origin.trim();
    return null;
}

function getAppointmentTypeLabel(type?: string): string {
    if (type === 'visit') return 'Visita';
    if (type === 'follow_up') return 'Retorno';
    if (type === 'meeting') return 'Reunião';
    return 'Retorno';
}

export interface KanbanColumnProps {
    stage: string;
    stageLeads: Lead[];
    stageData: StageData | undefined;
    isLoading: boolean;
    error?: string;
    onRetry?: () => void;
    onLoadMore: () => void | Promise<void>;
    pipeId: PipeId;
    pipes: Pipe[];
    getStageKind: (pipeId: PipeId, s: string) => string | undefined;
    draggedLeadId: string | null;
    isDragging: boolean;
    draggedLead: Lead | null;
    canDropHere: boolean;
    isDragOverThis: boolean;
    handleDragStart: (e: React.DragEvent, id: string) => void;
    handleDragEnd: () => void;
    handleDragOver: (e: React.DragEvent, s: string) => void;
    handleDrop: (e: React.DragEvent, s: string) => void | Promise<void>;
    navigate: (path: string) => void;
    getLeadDetailPath: (id: string) => string;
    dragEnabled?: boolean;
    labelsMinimized?: boolean;
}

export function KanbanColumn({
    stage,
    stageLeads,
    stageData,
    isLoading,
    error,
    onRetry,
    onLoadMore,
    pipeId,
    pipes,
    getStageKind,
    draggedLeadId,
    isDragging,
    draggedLead,
    canDropHere,
    isDragOverThis,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    navigate,
    getLeadDetailPath,
    dragEnabled = true,
    labelsMinimized = false,
}: KanbanColumnProps) {
    const sentinelRef = useInfiniteScroll(onLoadMore, !error && (stageData?.hasMore ?? false), isLoading);
    const isDragEnabled = dragEnabled ?? true;
    const stageKind = getStageKind(pipeId, stage) ?? 'default';
    const isWin = stageKind === 'win';
    const isLoss = stageKind === 'loss';
    const columnHeaderClass = isWin
        ? 'bg-green-50 border-green-200 text-green-800 border-b'
        : isLoss
            ? 'bg-red-50 border-red-200 text-red-800 border-b'
            : 'bg-gray-50 border-gray-200 text-gray-700 border-b';
    const columnBorderClass = isWin
        ? 'border-green-200 bg-green-50/30'
        : isLoss
            ? 'border-red-200 bg-red-50/30'
            : 'border-gray-200 bg-gray-100';
    const displayCount = stageData?.total ?? stageLeads.length;

    return (
        <div
            data-kanban-stage={stage}
            className={`min-w-[280px] w-80 min-h-[70vh] rounded-lg flex flex-col border snap-start ${columnBorderClass}`}
            onDragOver={(e) => isDragEnabled && handleDragOver(e, stage)}
            onDrop={(e) => isDragEnabled && handleDrop(e, stage)}
        >
            <div className={`p-3 font-bold rounded-t-lg flex justify-between items-center border-gray-200 shrink-0 ${columnHeaderClass}`}>
                <span>{stage}</span>
                <span className={`text-xs px-2 py-0.5 rounded border ${isWin ? 'bg-green-100 border-green-200 text-green-700' : isLoss ? 'bg-red-100 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                    {displayCount}
                </span>
            </div>
            <div className="p-2 flex-1 min-h-0 overflow-y-auto space-y-2 custom-scrollbar">
                {isDragOverThis && draggedLead && (
                    <div className={`p-3 rounded shadow-sm border-2 border-dashed pointer-events-none ${canDropHere ? 'bg-green-50 border-green-400 text-green-800' : 'bg-red-50/80 border-red-300 text-red-700 opacity-90'}`}>
                        <div className="flex justify-between items-start mb-1 gap-2">
                            <h4 className="font-semibold text-sm truncate flex-1">{draggedLead.name}</h4>
                        </div>
                        <div className="text-xs text-emerald-700 font-medium bg-emerald-100/80 px-1.5 py-0.5 rounded w-fit">
                                {(getCustomFieldValue(draggedLead, 'regimeTributario') as string) || draggedLead.productName || 'N/A'}
                            </div>
                        <p className={`text-[10px] font-semibold mt-2 ${canDropHere ? 'text-green-700' : 'text-red-600'}`}>
                            {canDropHere ? '✓ Solte aqui' : '✕ Conexão não permitida'}
                        </p>
                    </div>
                )}
                {stageLeads.map((lead) => (
                    <div
                        key={lead.id}
                        draggable={isDragEnabled}
                        onDragStart={(e) => isDragEnabled && handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => !isDragging && lead.id && navigate(getLeadDetailPath(lead.id))}
                        className={`p-3 rounded-lg shadow-sm border hover:shadow-md cursor-pointer active:cursor-grabbing group ${isLeadAnomalyFlagged(lead) ? 'border-red-200 bg-red-50/40' : lead.status === LeadStatus.OPORTUNIDADE ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white'} ${draggedLeadId === lead.id && isDragging ? 'opacity-50' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-2 gap-2">
                            <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-semibold text-sm text-gray-800">{lead.name}</h4>
                                {lead.status === LeadStatus.OPORTUNIDADE && (
                                    <span className="shrink-0 text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/80">Oportunidade</span>
                                )}
                            </div>
                            <GripVertical size={14} className="text-gray-400 opacity-60 group-hover:opacity-100 shrink-0" aria-hidden />
                        </div>
                        <div className="mb-2.5">
                            <div className="text-xs text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded w-fit">{(getCustomFieldValue(lead, 'regimeTributario') as string) || lead.productName || 'N/A'}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            <LeadFlowAnomalyBadge lead={lead} />
                            <SlaBadge
                                status={lead.slaStatus}
                                dueAt={lead.dueAt}
                                pausedAt={lead.slaPausedAt}
                                compact
                                pauseTooltip={lead.nextAppointmentAt ? `SLA pausado até o retorno em ${formatDate(lead.nextAppointmentAt)}.` : undefined}
                            />
                            {getLeadOriginLabel(lead) && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-700 max-w-full">
                                    <Megaphone size={10} className="shrink-0" />
                                    <span className="truncate">{getLeadOriginLabel(lead)}</span>
                                </span>
                            )}
                            {(lead.campaignName ?? lead.campaignId) && (
                                <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 max-w-full" title={lead.campaignName ?? lead.campaignId}>
                                    <span className="truncate">{lead.campaignName ?? lead.campaignId}</span>
                                </span>
                            )}
                            {lead.nextAppointmentAt && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-sky-200 bg-sky-50 text-sky-800" title={`${getAppointmentTypeLabel(lead.nextAppointmentType)} em ${formatDate(lead.nextAppointmentAt)}`}>
                                    <CalendarClock size={10} />
                                    {getAppointmentTypeLabel(lead.nextAppointmentType)} {formatDate(lead.nextAppointmentAt)}
                                </span>
                            )}
                            {lead.latestProposal?.isInactive && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-700">
                                    <Siren size={10} />
                                    Proposta inativa
                                </span>
                            )}
                        </div>
                        <div className="space-y-1 text-[10px] text-gray-500 border-t border-gray-100 pt-2.5">
                            <div className="flex items-center gap-1.5">
                                <span className="text-gray-400">Entrada:</span>
                                <span>{formatDate(lead.createdAt)}</span>
                            </div>
                            {lead.latestProposal?.valueOffered != null && (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-gray-400">Oferta:</span>
                                    <span className="font-semibold text-gray-700">{formatCurrency(lead.latestProposal.valueOffered)}</span>
                                </div>
                            )}
                            {lead.owner && (
                                <div className="flex items-center gap-1.5">
                                    <UserAvatar
                                        name={lead.owner.name}
                                        initials={lead.owner.avatarInitials}
                                        avatarUrl={lead.owner.avatarUrl}
                                        className="w-4 h-4 text-[8px] shrink-0"
                                        fallbackClassName="bg-salesforce-blue"
                                    />
                                    <span className="text-gray-600 truncate">{lead.owner.name}</span>
                                </div>
                            )}
                        </div>
                        {lead.labels && lead.labels.length > 0 && (
                            labelsMinimized ? (
                                <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                                    <span
                                        className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-500"
                                        title={lead.labels.map((label) => label.name).join(', ')}
                                        aria-label={`${lead.labels.length} etiqueta${lead.labels.length === 1 ? '' : 's'}: ${lead.labels.map((label) => label.name).join(', ')}`}
                                    >
                                        <Tags size={11} aria-hidden />
                                        {lead.labels.length}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-gray-100">
                                    {(lead.labels.slice(0, 3) as LeadLabel[]).map((label) => (
                                        <span key={label.id}><LabelChip label={label} /></span>
                                    ))}
                                    {lead.labels.length > 3 && <span className="text-[10px] text-gray-400 self-center">+{lead.labels.length - 3}</span>}
                                </div>
                            )
                        )}
                    </div>
                ))}
                {stageData?.hasMore && <div ref={sentinelRef} className="h-4 flex-shrink-0" aria-hidden />}
                {isLoading && stageLeads.length === 0 && (
                    <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-salesforce-blue border-t-transparent rounded-full animate-spin" /></div>
                )}
                {error && !isLoading && (
                    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        <p>{error}</p>
                        <button type="button" onClick={onRetry} className="mt-2 underline underline-offset-2 font-semibold focus-visible:outline focus-visible:outline-2">Tentar novamente</button>
                    </div>
                )}
                {stageLeads.length === 0 && !isDragOverThis && !isLoading && !error && (
                    <div className="text-center py-4 text-xs text-gray-600 border-2 border-dashed border-gray-200 rounded">Nenhum registro nesta etapa com os filtros atuais</div>
                )}
            </div>
        </div>
    );
}
