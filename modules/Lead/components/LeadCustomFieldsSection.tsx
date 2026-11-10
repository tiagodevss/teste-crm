import React from 'react';
import { ListChecks, Tag, LayoutList, ChevronUp, ChevronDown, Paperclip } from 'lucide-react';
import { CustomFieldEntry } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import { AttachmentLink } from '../../../components/AttachmentLink';
import { AttachmentFilesLinks } from '../../../components/AttachmentFilesLinks';
import { COMMERCIAL_FLOW_REQUIRED_FIELDS_BY_STAGE } from '../../CRM/components/pipeConfigConstants';
import { LeadDetailSection } from './LeadDetailSection';

export interface InitialFieldData {
    label: string;
    value: unknown;
    type: string;
}

export interface ByStageData {
    stageName: string;
    fields: CustomFieldEntry[];
}

export interface LeadCustomFieldsSectionProps {
    initialFieldsData: InitialFieldData[];
    byStageData: ByStageData[];
    otherCustomFields: CustomFieldEntry[];
    openStages: Set<string>;
    onToggleStage: (stageName: string) => void;
    getTypeLabel: (type: string) => string;
    formatCustomFieldValue: (value: unknown, type?: string) => string;
    renderCustomFieldValue: (entry: CustomFieldEntry) => React.ReactNode;
}

function formatCustomFieldValueDefault(value: unknown, type?: string): string {
    if (value === undefined || value === null || value === '') return '—';
    if (type === 'currency') {
        const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
        return Number.isFinite(n) ? formatCurrency(n) : String(value);
    }
    if (type === 'checkbox') return value ? 'Sim' : 'Não';
    if (type === 'multi_select') {
        const arr = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(',').map(s => s.trim()) : []);
        return arr.filter(Boolean).join(', ') || '—';
    }
    if (type === 'date' && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
        const [year, month, day] = value.slice(0, 10).split('-');
        return `${day}/${month}/${year}`;
    }
    if (type === 'datetime' && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
        const [datePart, timePart] = value.split('T');
        const [year, month, day] = datePart.split('-');
        return `${day}/${month}/${year} ${timePart?.slice(0, 5) ?? ''}`.trim();
    }
    return String(value);
}

function renderCustomFieldValueDefault(entry: CustomFieldEntry): React.ReactNode {
    if (entry.type === 'attachment' && entry.url) {
        return (
            <AttachmentFilesLinks entry={entry} />
        );
    }
    if (entry.type === 'email' && entry.value) {
        return (
            <a href={`mailto:${entry.value}`} className="text-salesforce-blue hover:underline">
                {String(entry.value)}
            </a>
        );
    }
    if (entry.type === 'url' && entry.value) {
        return (
            <a href={String(entry.value)} target="_blank" rel="noopener noreferrer" className="text-salesforce-blue hover:underline truncate block max-w-[200px]">
                {String(entry.value)}
            </a>
        );
    }
    if (entry.type === 'multi_select') {
        const arr = Array.isArray(entry.value)
            ? (entry.value as string[])
            : (typeof entry.value === 'string' ? entry.value.split(',').map(s => s.trim()) : []);
        if (!arr.length || (arr.length === 1 && !arr[0])) return '—';
        return (
            <div className="flex flex-wrap gap-1 mt-0.5">
                {arr.filter(Boolean).map((v) => (
                    <span key={v} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-salesforce-blue/10 text-salesforce-blue">
                        {v}
                    </span>
                ))}
            </div>
        );
    }
    if (entry.type === 'label' && entry.value) {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-salesforce-blue/10 text-salesforce-blue">
                {String(entry.value)}
            </span>
        );
    }
    if (entry.type === 'textarea' && typeof entry.value === 'string') {
        return (
            <span className="whitespace-pre-line text-sm font-medium text-gray-900">
                {entry.value || '—'}
            </span>
        );
    }
    return formatCustomFieldValueDefault(entry.value, entry.type);
}

export function LeadCustomFieldsSection({
    initialFieldsData,
    byStageData,
    otherCustomFields,
    openStages,
    onToggleStage,
    getTypeLabel,
    formatCustomFieldValue = formatCustomFieldValueDefault,
    renderCustomFieldValue = renderCustomFieldValueDefault,
}: LeadCustomFieldsSectionProps) {
    if (initialFieldsData.length === 0 && byStageData.length === 0 && otherCustomFields.length === 0) {
        return null;
    }

    return (
        <LeadDetailSection
            title="Dados preenchidos"
            description="Informações coletadas no cadastro e em cada etapa do funil."
            icon={<ListChecks size={18} />}
        >
            <div className="space-y-6 -mx-1">
                {initialFieldsData.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                            <Tag size={14} /> Informações iniciais (cadastro — produto)
                        </h4>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {initialFieldsData.map(({ label, value, type }) => (
                                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        {label}
                                    </dt>
                                    <dd className="text-sm font-medium text-gray-900 mt-0.5">
                                        {typeof value === 'string' && (value.startsWith('http') || value.startsWith('/')) ? (
                                            <AttachmentLink url={value} />
                                        ) : (
                                            formatCustomFieldValue(value, type)
                                        )}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                )}
                {byStageData.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                            <LayoutList size={14} /> Informações por etapa
                        </h4>
                        <div className="space-y-2">
                            {byStageData.map(({ stageName, fields }, idx) => {
                                const isOpen = openStages.has(stageName);
                                const regionId = `stage-content-${idx}`;
                                const headingId = `stage-heading-${idx}`;
                                const requiredKeys = new Set(COMMERCIAL_FLOW_REQUIRED_FIELDS_BY_STAGE[stageName] ?? []);
                                return (
                                    <div key={stageName} className="border border-gray-200 rounded-lg overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => onToggleStage(stageName)}
                                            className="w-full flex items-center justify-between gap-2 bg-gray-100 px-3 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wide hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-salesforce-blue focus:ring-inset"
                                            aria-expanded={isOpen}
                                            aria-controls={regionId}
                                            id={headingId}
                                        >
                                            <span>{stageName}</span>
                                            <span className="text-gray-500 shrink-0">
                                                {isOpen ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
                                            </span>
                                        </button>
                                        <div
                                            id={regionId}
                                            role="region"
                                            aria-labelledby={headingId}
                                            className={isOpen ? 'block' : 'hidden'}
                                        >
                                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-white border-t border-gray-100">
                                                {fields.map((entry) => (
                                                    <div key={entry.key} className="bg-gray-50 rounded px-2 py-1.5 border border-gray-100">
                                                        <dt className="text-xs font-medium text-gray-500">
                                                            {entry.label}
                                                            {requiredKeys.has(entry.key) && (
                                                                <span className="ml-1 inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                                                                    Obrigatorio
                                                                </span>
                                                            )}
                                                        </dt>
                                                        <dd className="text-sm font-medium text-gray-900 mt-0.5">{renderCustomFieldValue(entry)}</dd>
                                                    </div>
                                                ))}
                                            </dl>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                {otherCustomFields.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-gray-600 mb-2">Outros dados</h4>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {otherCustomFields.map((entry) => (
                                <div key={entry.key} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{entry.label}</dt>
                                    <dd className="text-sm font-medium text-gray-900 mt-0.5">{renderCustomFieldValue(entry)}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                )}
            </div>
        </LeadDetailSection>
    );
}
