import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Briefcase,
    FileText,
    Link2,
    ArrowRight,
    Megaphone,
    Handshake,
    ExternalLink,
    ChevronDown,
    Download,
    Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Lead, LeadLabel, CustomFieldEntry, PipeUnitType } from '../../../types';
import { formatDate, formatPhone } from '../../../utils/formatters';
import { getLeadDetailPath } from '../../../routes';
import { api } from '../../../lib/axios';
import { getApiErrorMessage } from '../../../lib/api-error';
import { LabelChip } from '../../../components/ui/LabelChip';
import { LabelSelector } from '../../../components/ui/LabelSelector';
import { SlaBadge } from '../../../components/ui/SlaBadge';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { LeadFlowAnomalyBadge } from './LeadFlowAnomalySection';
import { getOperationAccent } from '../../../lib/pipeDisplay';

export interface LeadInfoCardProps {
    lead: Lead;
    pipes: { id: string; name: string; unitType?: PipeUnitType }[];
    campaigns?: { id: string; name: string }[];
    partners?: { id: string; name: string }[];
    getStatusColor: (status: string) => string;
}

const COMPACT_LABEL_LIMIT = 2;

type LeadPdfTemplate = {
    id: string;
    pipeId: string;
    name: string;
    isActive: boolean;
};

function customFieldToDisplayValue(entry?: CustomFieldEntry): string | null {
    if (!entry) return null;
    const value = entry.type === 'attachment' ? entry.url : entry.value;
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
}

function InfoRow({
    icon: Icon,
    label,
    value,
    href,
    external,
}: {
    icon: React.ElementType;
    label: string;
    value?: string | null;
    href?: string;
    external?: boolean;
}) {
    if (!value) return null;
    const content = (
        <span className="text-sm text-gray-900 break-words">{value}</span>
    );
    return (
        <div className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
            <Icon size={16} className="text-gray-400 shrink-0 mt-0.5" aria-hidden />
            <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-600 mb-0.5">{label}</p>
                {href ? (
                    <a
                        href={href}
                        target={external ? '_blank' : undefined}
                        rel={external ? 'noopener noreferrer' : undefined}
                        className="text-sm text-salesforce-blue hover:underline inline-flex items-center gap-1"
                    >
                        {content}
                        {external ? <ExternalLink size={12} aria-hidden /> : null}
                    </a>
                ) : (
                    content
                )}
            </div>
        </div>
    );
}

function filenameFromDisposition(disposition: string | undefined, fallback: string) {
    if (!disposition) return fallback;
    const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    if (utf8) {
        try {
            return decodeURIComponent(utf8);
        } catch {
            return utf8;
        }
    }
    return disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? fallback;
}

export function LeadInfoCard({
    lead,
    pipes,
    campaigns,
    partners,
    getStatusColor,
}: LeadInfoCardProps) {
    const navigate = useNavigate();
    const pdfMenuRef = useRef<HTMLDivElement>(null);
    const pipeName = pipes.find((p) => p.id === lead.pipeId)?.name ?? lead.pipeId;
    const [labels, setLabels] = useState<LeadLabel[]>(lead.labels ?? []);
    const [pdfTemplates, setPdfTemplates] = useState<LeadPdfTemplate[]>([]);
    const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
    const [downloadingTemplateId, setDownloadingTemplateId] = useState<string | null>(null);
    const activeLabels = labels.filter((label) => label.isActive !== false);
    const [labelsExpanded, setLabelsExpanded] = useState(false);
    const compactLabels = !labelsExpanded;
    const visibleLabels = compactLabels ? activeLabels.slice(0, COMPACT_LABEL_LIMIT) : activeLabels;
    const hiddenLabelCount = compactLabels ? Math.max(0, activeLabels.length - COMPACT_LABEL_LIMIT) : 0;
    const inactiveLabels = labels.filter((label) => label.isActive === false);
    const customFields = lead.customFields ?? [];
    const byKey = new Map(customFields.map((entry) => [entry.key, entry]));
    const origemLead = customFieldToDisplayValue(byKey.get('origemLead'));
    const servicoInteresse = customFieldToDisplayValue(byKey.get('servicoInteresse'));
    const tipoAbordagem = customFieldToDisplayValue(byKey.get('tipoAbordagem'));
    const clienteContabil = customFieldToDisplayValue(byKey.get('clienteContabil'));
    const campaignName = lead.campaignName ?? campaigns?.find((c) => c.id === lead.campaignId)?.name ?? lead.campaignId;
    const partnerName = partners?.find((p) => p.id === lead.partnerId)?.name ?? lead.partnerId;
    const sourceLabel =
        lead.sourceSubtype?.trim() ||
        (lead.sourceType
            ? ({
                  manual: 'Manual',
                  import: 'Importação',
                  public: 'Pública',
                  campaign: 'Campanha',
                  partner: 'Parceiro',
              }[lead.sourceType] ?? lead.sourceType)
            : lead.origin);
    const pipeUnitType = pipes.find((p) => p.id === lead.pipeId)?.unitType;
    const operationAccent = getOperationAccent(pipeUnitType);
    const phoneDigits = lead.phone?.replace(/\D/g, '');

    useEffect(() => {
        setLabels(lead.labels ?? []);
    }, [lead.labels]);

    useEffect(() => {
        let cancelled = false;
        setPdfTemplates([]);
        setPdfMenuOpen(false);
        if (!lead.pipeId) return;

        api.get<LeadPdfTemplate[]>(`/pdf-templates?pipeId=${encodeURIComponent(lead.pipeId)}`)
            .then((response) => {
                if (!cancelled) setPdfTemplates(response.data.filter((template) => template.isActive));
            })
            .catch(() => {
                if (!cancelled) setPdfTemplates([]);
            });
        return () => {
            cancelled = true;
        };
    }, [lead.pipeId]);

    useEffect(() => {
        if (!pdfMenuOpen) return;
        const closeWhenOutside = (event: MouseEvent) => {
            if (!pdfMenuRef.current?.contains(event.target as Node)) setPdfMenuOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setPdfMenuOpen(false);
        };
        document.addEventListener('mousedown', closeWhenOutside);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('mousedown', closeWhenOutside);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [pdfMenuOpen]);

    const downloadPdf = async (template: LeadPdfTemplate) => {
        setDownloadingTemplateId(template.id);
        try {
            // O PDF é montado com os dados atuais do lead. Além dos cabeçalhos no
            // backend, uma URL exclusiva por clique impede que proxy/CDN do ambiente
            // devolva uma resposta anterior para este download.
            const cacheBust = Date.now();
            const response = await api.get<Blob>(
                `/pdf-templates/${template.id}/render?leadId=${encodeURIComponent(lead.id)}&_=${cacheBust}`,
                {
                    responseType: 'blob',
                    headers: {
                        'Cache-Control': 'no-cache, no-store, max-age=0',
                        Pragma: 'no-cache',
                    },
                },
            );
            const blobUrl = URL.createObjectURL(response.data);
            const anchor = document.createElement('a');
            anchor.href = blobUrl;
            anchor.download = filenameFromDisposition(
                response.headers['content-disposition'],
                `${template.name}.pdf`,
            );
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            // O navegador ainda pode estar lendo o Blob logo após o click.
            // Revogar no próximo ciclo evita comportamento inconsistente no download.
            window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
            setPdfMenuOpen(false);
            toast.success('PDF gerado com sucesso.');
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Não foi possível gerar o PDF deste lead.'));
        } finally {
            setDownloadingTemplateId(null);
        }
    };

    return (
        <aside className="space-y-4" aria-label="Informações do lead">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                {/* overflow-hidden fica só na barra (não no card) para não cortar dropdowns posicionados dentro do card. */}
                <div className={`h-1 rounded-t-xl ${operationAccent.bar}`} aria-hidden />
                <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <UserAvatar
                            name={lead.name}
                            initials={lead.name.substring(0, 2).toUpperCase()}
                            className="w-12 h-12 text-base shrink-0"
                            fallbackClassName="bg-salesforce-blue"
                        />
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                    className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${getStatusColor(lead.status)}`}
                                >
                                    {lead.status}
                                </span>
                                <span
                                    className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${operationAccent.badge}`}
                                >
                                    {pipeName}
                                </span>
                                <LeadFlowAnomalyBadge lead={lead} />
                            </div>
                            <div className="mt-2">
                                <SlaBadge
                                    status={lead.slaStatus}
                                    dueAt={lead.dueAt}
                                    pausedAt={lead.slaPausedAt}
                                />
                            </div>
                        </div>
                    </div>

                    {lead.pipeId ? (
                        <div className="mb-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                                {visibleLabels.map((label: LeadLabel) => (
                                    <span key={label.id}>
                                        <LabelChip label={label} size="md" />
                                    </span>
                                ))}
                                {hiddenLabelCount > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => setLabelsExpanded(true)}
                                        title={activeLabels.slice(COMPACT_LABEL_LIMIT).map((label) => label.name).join(', ')}
                                        aria-label={`Mostrar mais ${hiddenLabelCount} etiquetas`}
                                        className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-salesforce-blue"
                                    >
                                        +{hiddenLabelCount}
                                    </button>
                                ) : null}
                                <LabelSelector
                                    pipeId={lead.pipeId}
                                    leadId={lead.id}
                                    currentLabels={activeLabels}
                                    onChange={setLabels}
                                />
                            </div>
                            {inactiveLabels.length > 0 ? (
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs text-gray-500">Inativas:</span>
                                    {inactiveLabels.map((label: LeadLabel) => (
                                        <span key={label.id} className="opacity-60 grayscale">
                                            <LabelChip label={label} size="md" />
                                        </span>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {lead.owner ? (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100">
                            <UserAvatar
                                name={lead.owner.name}
                                initials={lead.owner.avatarInitials}
                                avatarUrl={lead.owner.avatarUrl}
                                className="w-8 h-8 text-xs shrink-0"
                                fallbackClassName="bg-salesforce-blue"
                            />
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-600">Responsável</p>
                                <p className="text-sm font-medium text-gray-900 truncate">{lead.owner.name}</p>
                            </div>
                        </div>
                    ) : null}

                    {pdfTemplates.length > 0 ? (
                        <div className="relative mt-3" ref={pdfMenuRef}>
                            <button
                                type="button"
                                onClick={() => setPdfMenuOpen((open) => !open)}
                                aria-expanded={pdfMenuOpen}
                                aria-haspopup="menu"
                                className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue focus-visible:ring-offset-1"
                            >
                                <span className="inline-flex items-center gap-2">
                                    <FileText size={16} className="text-salesforce-blue" aria-hidden />
                                    Gerar PDF
                                </span>
                                <ChevronDown size={15} className={`transition-transform ${pdfMenuOpen ? 'rotate-180' : ''}`} aria-hidden />
                            </button>
                            {pdfMenuOpen ? (
                                <div
                                    className="absolute left-0 right-0 z-30 mt-2 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
                                    role="menu"
                                    aria-label="Modelos de PDF disponíveis"
                                >
                                    {pdfTemplates.map((template) => {
                                        const downloading = downloadingTemplateId === template.id;
                                        return (
                                            <button
                                                key={template.id}
                                                type="button"
                                                role="menuitem"
                                                disabled={Boolean(downloadingTemplateId)}
                                                onClick={() => void downloadPdf(template)}
                                                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue"
                                            >
                                                <span className="min-w-0">
                                                    <span className="block truncate font-medium">{template.name}</span>
                                                </span>
                                                {downloading ? (
                                                    <Loader2 size={15} className="shrink-0 animate-spin" aria-hidden />
                                                ) : (
                                                    <Download size={15} className="shrink-0 text-gray-400" aria-hidden />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-900 mb-3">Contato e cadastro</h2>
                <div>
                    <InfoRow icon={Building} label="Empresa" value={lead.company} />
                    <InfoRow
                        icon={Phone}
                        label="Telefone"
                        value={lead.phone ? formatPhone(lead.phone) : undefined}
                        href={phoneDigits ? `tel:${phoneDigits}` : undefined}
                    />
                    <InfoRow
                        icon={Mail}
                        label="E-mail"
                        value={lead.email}
                        href={lead.email ? `mailto:${lead.email}` : undefined}
                    />
                    <InfoRow icon={MapPin} label="Endereço" value={lead.address} />
                    <InfoRow icon={FileText} label="CPF/CNPJ" value={lead.cpfCnpj} />
                    <InfoRow icon={Briefcase} label="Produto" value={lead.productName} />
                    <InfoRow icon={Briefcase} label="Serviço de interesse" value={servicoInteresse} />
                    <InfoRow icon={Megaphone} label="Origem" value={sourceLabel ?? origemLead} />
                    <InfoRow icon={Megaphone} label="Tipo de abordagem" value={tipoAbordagem} />
                    <InfoRow icon={Megaphone} label="Campanha" value={campaignName} />
                    <InfoRow icon={Handshake} label="Parceiro" value={partnerName} />
                    <InfoRow icon={FileText} label="Cliente do escritório" value={clienteContabil} />
                    <InfoRow
                        icon={Calendar}
                        label="Último contato"
                        value={formatDate(lead.lastContactDate)}
                    />
                    <InfoRow
                        icon={Calendar}
                        label="Entrada na etapa"
                        value={formatDate(lead.enteredStageAt)}
                    />
                    <InfoRow
                        icon={Calendar}
                        label="Prazo da etapa"
                        value={lead.dueAt ? formatDate(lead.dueAt) : '—'}
                    />
                </div>
            </div>

            {(lead.sourceLead || (lead.linkedLeads && lead.linkedLeads.length > 0)) && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Link2 size={14} aria-hidden />
                        Cards vinculados
                    </h2>
                    <div className="flex flex-col gap-2">
                        {lead.sourceLead ? (
                            <button
                                type="button"
                                onClick={() =>
                                    lead.sourceLead?.id && navigate(getLeadDetailPath(lead.sourceLead.id))
                                }
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-800 border border-gray-200 transition-colors text-left"
                            >
                                <ArrowRight size={14} className="rotate-180 shrink-0" />
                                <span className="truncate">Origem: {lead.sourceLead.name}</span>
                            </button>
                        ) : null}
                        {lead.linkedLeads?.map((ll) => (
                            <button
                                key={ll.id}
                                type="button"
                                onClick={() => ll.id && navigate(getLeadDetailPath(ll.id))}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-800 border border-blue-100 transition-colors text-left"
                            >
                                <ArrowRight size={14} className="shrink-0" />
                                <span className="truncate">
                                    {ll.name} ({ll.pipeName ?? ll.pipeId})
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </aside>
    );
}
