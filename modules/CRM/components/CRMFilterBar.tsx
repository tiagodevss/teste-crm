import React, { useMemo, useState } from 'react';
import { ChevronDown, Filter, X } from 'lucide-react';
import type { LeadLabel } from '../../../types';
import type { LeadTemperature } from '../../../lib/lead-priority';

export interface CRMFilterBarProps {
    pipeLabels: LeadLabel[];
    appliedLabelId: string | null;
    onAppliedLabelIdChange: (id: string | null) => void;
    temperatureFilter: '' | LeadTemperature;
    onTemperatureFilterChange: (value: '' | LeadTemperature) => void;
    usersList: { id: string; name: string }[];
    selectedOwnerUserId: string | null;
    onSelectedOwnerUserIdChange: (id: string | null) => void;
    dateFieldFilter: 'createdAt' | 'lastContactDate';
    onDateFieldFilterChange: (value: 'createdAt' | 'lastContactDate') => void;
    originFilter: '' | 'manual' | 'import' | 'public' | 'campaign' | 'partner';
    onOriginFilterChange: (value: CRMFilterBarProps['originFilter']) => void;
    sourceSubtypeFilter: string;
    onSourceSubtypeFilterChange: (value: string) => void;
    campaignIdFilter: string;
    onCampaignIdFilterChange: (value: string) => void;
    campaigns: { id: string; name: string }[];
    partnerIdFilter: string;
    onPartnerIdFilterChange: (value: string) => void;
    partners: { id: string; name: string }[];
    productIdFilter: string;
    onProductIdFilterChange: (value: string) => void;
    products: { id: string; name: string }[];
    clientWmsFilter: '' | 'yes' | 'no';
    onClientWmsFilterChange: (value: '' | 'yes' | 'no') => void;
}

const selectClass =
    'text-xs py-1.5 pl-2 pr-7 rounded-lg border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20 focus:border-salesforce-blue transition-colors';

export function CRMFilterBar(props: CRMFilterBarProps) {
    const [expanded, setExpanded] = useState(false);

    const activeCount = useMemo(() => {
        let n = 0;
        if (props.appliedLabelId) n += 1;
        if (props.temperatureFilter) n += 1;
        if (props.selectedOwnerUserId) n += 1;
        if (props.dateFieldFilter !== 'createdAt') n += 1;
        if (props.originFilter) n += 1;
        if (props.sourceSubtypeFilter.trim()) n += 1;
        if (props.campaignIdFilter) n += 1;
        if (props.partnerIdFilter) n += 1;
        if (props.productIdFilter) n += 1;
        if (props.clientWmsFilter) n += 1;
        return n;
    }, [props]);

    const clearAll = () => {
        props.onAppliedLabelIdChange(null);
        props.onTemperatureFilterChange('');
        props.onSelectedOwnerUserIdChange(null);
        props.onDateFieldFilterChange('createdAt');
        props.onOriginFilterChange('');
        props.onSourceSubtypeFilterChange('');
        props.onCampaignIdFilterChange('');
        props.onPartnerIdFilterChange('');
        props.onProductIdFilterChange('');
        props.onClientWmsFilterChange('');
    };

    return (
        <div className="flex flex-col gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2 flex-wrap">
                {props.pipeLabels.length > 0 && (
                    <select
                        value={props.appliedLabelId ?? ''}
                        onChange={(e) => props.onAppliedLabelIdChange(e.target.value || null)}
                        className={`${selectClass} max-w-[14rem] ${props.appliedLabelId ? 'border-salesforce-blue text-salesforce-blue font-medium' : ''}`}
                        aria-label="Filtrar por etiqueta"
                    >
                        <option value="">Etiqueta: todas</option>
                        {props.pipeLabels.map((label) => (
                            <option key={label.id} value={label.id}>
                                {label.name}
                            </option>
                        ))}
                    </select>
                )}
                <select
                    value={props.temperatureFilter}
                    onChange={(e) => {
                        const value = e.target.value;
                        props.onTemperatureFilterChange(
                            value === 'hot' || value === 'warm' || value === 'cold' ? value : '',
                        );
                    }}
                    className={`${selectClass} ${props.temperatureFilter ? 'border-salesforce-blue text-salesforce-blue font-medium' : ''}`}
                    aria-label="Temperatura do lead"
                >
                    <option value="">Temperatura: todas</option>
                    <option value="hot">Temperatura: quentes</option>
                    <option value="warm">Temperatura: mornas</option>
                    <option value="cold">Temperatura: frias</option>
                </select>
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:border-salesforce-blue hover:text-salesforce-blue transition-colors"
                >
                    <Filter size={14} aria-hidden />
                    Filtros avançados
                    {activeCount > 0 && (
                        <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-salesforce-blue text-white text-[10px] font-bold inline-flex items-center justify-center">
                            {activeCount}
                        </span>
                    )}
                    <ChevronDown
                        size={14}
                        className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                        aria-hidden
                    />
                </button>
                {activeCount > 0 && (
                    <button
                        type="button"
                        onClick={clearAll}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue/30 rounded"
                    >
                        <X size={12} aria-hidden />
                        Limpar filtros
                    </button>
                )}
            </div>
            {(props.appliedLabelId || props.temperatureFilter) && (
                <p className="text-xs text-gray-600" role="status">
                    {props.appliedLabelId && props.temperatureFilter
                        ? 'Etiqueta e temperatura são filtros independentes; o período e os demais filtros continuam aplicados.'
                        : props.temperatureFilter
                          ? 'A temperatura é calculada automaticamente pelo avanço recente, inatividade e SLA.'
                          : 'Filtrando etiquetas cadastradas. O período e os demais filtros continuam aplicados; a temperatura automática não é uma etiqueta.'}
                </p>
            )}
            {expanded && (
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-gray-200 bg-white">
                    {props.usersList.length > 0 && (
                        <select
                            value={props.selectedOwnerUserId ?? ''}
                            onChange={(e) => props.onSelectedOwnerUserIdChange(e.target.value || null)}
                            className={selectClass}
                            aria-label="Responsável"
                        >
                            <option value="">Todos os responsáveis</option>
                            {props.usersList.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name}
                                </option>
                            ))}
                        </select>
                    )}
                    <select
                        value={props.dateFieldFilter}
                        onChange={(e) =>
                            props.onDateFieldFilterChange(
                                e.target.value === 'lastContactDate' ? 'lastContactDate' : 'createdAt',
                            )
                        }
                        className={selectClass}
                        aria-label="Campo de data"
                    >
                        <option value="createdAt">Data criação</option>
                        <option value="lastContactDate">Data atendimento</option>
                    </select>
                    <select
                        value={props.originFilter}
                        onChange={(e) =>
                            props.onOriginFilterChange(
                                (e.target.value as CRMFilterBarProps['originFilter']) ?? '',
                            )
                        }
                        className={selectClass}
                        aria-label="Origem do lead"
                    >
                        <option value="">Origem: todas</option>
                        <option value="manual">Manual</option>
                        <option value="import">Importação</option>
                        <option value="public">Pública</option>
                        <option value="campaign">Campanha</option>
                        <option value="partner">Parceiro</option>
                    </select>
                    <input
                        value={props.sourceSubtypeFilter}
                        onChange={(e) => props.onSourceSubtypeFilterChange(e.target.value)}
                        placeholder="Canal/Subtipo"
                        className="text-xs py-1.5 px-2 rounded-lg border border-gray-300 bg-white text-gray-700 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20 focus:border-salesforce-blue transition-colors"
                        aria-label="Canal ou subtipo"
                    />
                    <select
                        value={props.campaignIdFilter}
                        onChange={(e) => props.onCampaignIdFilterChange(e.target.value)}
                        className={selectClass}
                        aria-label="Campanha"
                    >
                        <option value="">Campanha: todas</option>
                        {props.campaigns.map((campaign) => (
                            <option key={campaign.id} value={campaign.id}>
                                {campaign.name}
                            </option>
                        ))}
                    </select>
                    <select
                        value={props.partnerIdFilter}
                        onChange={(e) => props.onPartnerIdFilterChange(e.target.value)}
                        className={selectClass}
                        aria-label="Parceiro"
                    >
                        <option value="">Parceiro: todos</option>
                        {props.partners.map((partner) => (
                            <option key={partner.id} value={partner.id}>
                                {partner.name}
                            </option>
                        ))}
                    </select>
                    <select
                        value={props.productIdFilter}
                        onChange={(e) => props.onProductIdFilterChange(e.target.value)}
                        className={selectClass}
                        aria-label="Serviço"
                    >
                        <option value="">Serviço: todos</option>
                        {props.products.map((product) => (
                            <option key={product.id} value={product.id}>
                                {product.name}
                            </option>
                        ))}
                    </select>
                    <select
                        value={props.clientWmsFilter}
                        onChange={(e) =>
                            props.onClientWmsFilterChange(
                                e.target.value === 'yes' || e.target.value === 'no'
                                    ? (e.target.value as 'yes' | 'no')
                                    : '',
                            )
                        }
                        className={selectClass}
                        aria-label="Cliente WMS"
                    >
                        <option value="">Cliente WMS: todos</option>
                        <option value="yes">Cliente WMS: sim</option>
                        <option value="no">Cliente WMS: não</option>
                    </select>
                </div>
            )}
        </div>
    );
}
