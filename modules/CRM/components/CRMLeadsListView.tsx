import { UserCheck, CalendarClock, Megaphone, Siren } from 'lucide-react';
import { ReactNode } from 'react';
import { LeadStatus, Lead, PipeId, Pipe, SortOrder, LeadLabel } from '../../../types';
import { getCustomFieldValue } from '../../../utils/leadCustomFields';
import { formatDate, formatCurrency } from '../../../utils/formatters';
import { DataTable } from '../../../components/ui/DataTable';
import { CRMListHeader } from './CRMListHeader';
import { LabelChip } from '../../../components/ui/LabelChip';
import { SlaBadge } from '../../../components/ui/SlaBadge';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { LeadFlowAnomalyBadge } from '../../Lead/components/LeadFlowAnomalySection';

export interface CRMLeadsListViewProps {
    leads: Lead[];
    pipes: Pipe[];
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onSearch: () => void;
    onRefresh?: () => void;
    onNewLead: () => void;
    pagination: { page: number; limit: number; total: number; totalPages: number };
    sortBy?: string;
    sortOrder?: SortOrder;
    onSort: (sortBy: string, sortOrder: SortOrder) => void;
    onPageChange: (page: number) => void;
    onRowClick: (lead: Lead) => void;
    onConvert: (lead: Lead) => void;
    isLoading: boolean;
    getLeadDetailPath: (id: string) => string;
    filterSlot?: ReactNode;
}

export function CRMLeadsListView({
    leads,
    pipes,
    searchTerm,
    onSearchChange,
    onSearch,
    onRefresh,
    onNewLead,
    pagination,
    sortBy,
    sortOrder,
    onSort,
    onPageChange,
    onRowClick,
    onConvert,
    isLoading,
    getLeadDetailPath,
    filterSlot,
}: CRMLeadsListViewProps) {
    const getLeadOriginLabel = (lead: Lead): string | null => {
        if (lead.sourceSubtype?.trim()) return lead.sourceSubtype.trim();
        if (lead.sourceType?.trim()) {
            const map: Record<string, string> = {
                manual: 'Manual',
                import: 'Importação',
                public: 'Pública',
                campaign: 'Campanha',
                partner: 'Parceiro',
            };
            return map[lead.sourceType] ?? lead.sourceType;
        }
        if (lead.origin?.trim()) return lead.origin.trim();
        return null;
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <CRMListHeader
                searchTerm={searchTerm}
                onSearchChange={onSearchChange}
                onSearch={onSearch}
                onRefresh={onRefresh}
                onNewLead={onNewLead}
                filterSlot={filterSlot}
            />
            <DataTable<Lead>
                columns={[
                    {
                        key: 'name',
                        label: 'Nome / Empresa',
                        sortKey: 'name',
                        render: (l) => (
                            <div>
                                <div className="text-sm font-semibold text-gray-900">{l.name}</div>
                                {l.importDate && (
                                    <div className="text-xs font-medium text-red-500 bg-red-50 inline-block px-1.5 py-0.5 rounded mt-1">
                                        Lead Frio ({formatDate(l.importDate)})
                                    </div>
                                )}
                            </div>
                        ),
                    },
                    {
                        key: 'commercial',
                        label: 'Dados comerciais',
                        render: (l) => (
                            <div className="space-y-1.5 min-w-[240px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                        {l.stage}
                                    </span>
                                    <SlaBadge
                                        status={l.slaStatus}
                                        dueAt={l.dueAt}
                                        pausedAt={l.slaPausedAt}
                                        compact
                                        pauseTooltip={
                                            l.nextAppointmentAt
                                                ? `SLA pausado até ${formatDate(l.nextAppointmentAt)} por retorno agendado.`
                                                : undefined
                                        }
                                    />
                                    <LeadFlowAnomalyBadge lead={l} />
                                    {l.latestProposal?.isInactive && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-700">
                                            <Siren size={10} />
                                            Proposta inativa
                                        </span>
                                    )}
                                </div>
                                {getLeadOriginLabel(l) && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-700">
                                        <Megaphone size={12} className="text-gray-400" />
                                        <span className="truncate">{getLeadOriginLabel(l)}</span>
                                    </div>
                                )}
                                {(l.campaignName ?? l.campaignId) && (
                                    <div className="text-xs text-gray-700 truncate" title={l.campaignName ?? l.campaignId}>
                                        Campanha: {l.campaignName ?? l.campaignId}
                                    </div>
                                )}
                                {l.nextAppointmentAt && (
                                    <div className="flex items-center gap-1.5 text-xs text-amber-800">
                                        <CalendarClock size={12} />
                                        <span>Próximo retorno: {formatDate(l.nextAppointmentAt)}</span>
                                    </div>
                                )}
                                {l.owner && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-700">
                                        <UserAvatar
                                            name={l.owner.name}
                                            initials={l.owner.avatarInitials}
                                            avatarUrl={l.owner.avatarUrl}
                                            className="w-4 h-4 text-[8px]"
                                            fallbackClassName="bg-salesforce-blue"
                                        />
                                        <span className="truncate">{l.owner.name}</span>
                                    </div>
                                )}
                            </div>
                        ),
                    },
                    {
                        key: 'values',
                        label: 'Valores',
                        render: (l) => (
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-gray-400 mt-1">Ofertado</span>
                                <span className="font-semibold text-gray-700">
                                    {l.latestProposal?.valueOffered != null
                                        ? formatCurrency(l.latestProposal.valueOffered)
                                        : '-'}
                                </span>
                                <span className="text-xs font-medium text-gray-400 mt-1">Fechado</span>
                                <span className="font-semibold text-emerald-700">
                                    {l.value != null
                                        ? formatCurrency(l.value)
                                        : getCustomFieldValue(l, 'valorSolicitado') != null
                                            ? formatCurrency(getCustomFieldValue(l, 'valorSolicitado') as number)
                                            : '-'}
                                </span>
                            </div>
                        ),
                    },
                    {
                        key: 'pipe',
                        label: 'Pipe',
                        render: (l) => {
                            const label = pipes.find((p) => p.id === l.pipeId)?.name ?? l.pipeId;
                            return (
                                <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                                    {label}
                                </span>
                            );
                        },
                    },
                    {
                        key: 'labels',
                        label: 'Etiquetas',
                        sortable: false,
                        render: (l) =>
                            l.labels && l.labels.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {(l.labels.slice(0, 3) as LeadLabel[]).map((label) => (
                                        <span key={label.id}>
                                            <LabelChip label={label} />
                                        </span>
                                    ))}
                                    {l.labels.length > 3 && (
                                        <span className="text-[10px] text-gray-400 self-center">+{l.labels.length - 3}</span>
                                    )}
                                </div>
                            ) : null,
                    },
                    {
                        key: 'lastContact',
                        label: 'Último Contato',
                        sortKey: 'lastContactDate',
                        render: (l) => (
                            <span className="text-sm text-gray-500 font-medium">{formatDate(l.lastContactDate)}</span>
                        ),
                    },
                    {
                        key: 'actions',
                        label: 'Ações',
                        align: 'right',
                        sortable: false,
                        render: (l) =>
                            l.status !== LeadStatus.CLIENTE ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onConvert(l);
                                    }}
                                    className="text-salesforce-blue hover:text-salesforce-hover flex items-center justify-end w-full gap-1.5"
                                >
                                    <UserCheck size={16} /> Converter
                                </button>
                            ) : null,
                    },
                ]}
                data={leads}
                pagination={pagination}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
                onPageChange={onPageChange}
                isLoading={isLoading}
                emptyMessage="Nenhum lead encontrado para este filtro."
                rowKey={(l) => l.id}
                onRowClick={(l) => onRowClick(l)}
            />
        </div>
    );
}
