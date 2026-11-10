import { isDemo } from '../../config/demo';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { AlertCircle, Paperclip } from 'lucide-react';
import { DetailPageSkeleton } from '../../components/ui/Skeletons';
import {
    LeadStatus,
    LeadComment,
    CustomFieldEntry,
    FieldConfig,
    FieldConfigType,
    ContactActivityType,
    ContactChannel,
    ContactResult,
} from '../../types';
import {
    getAttachmentFormValue,
    getNormalizedCustomFields,
    mergeCustomFieldEntriesForFields,
} from '../../utils/leadCustomFields';
import { filterVisibleFields } from '../../lib/field-rules';
import { toAnomalyUpdatePayload } from '../../lib/lead-anomaly';
import { formatCurrency } from '../../utils/formatters';
import { useCRMStore, useSettingsStore, useUserStore, usePartnerStore } from './store';
import { AttachmentFilesLinks } from '../../components/AttachmentFilesLinks';
import { AppPath, getCRMPipePath } from '../../routes';
import { prepareContactDates, toLocalDateTimeValue } from '../../lib/contact-record';
import { getApiErrorMessage } from '../../lib/api-error';
import { buildDynamicSchema } from './schemas';
import { useLeadDetail, useLeadDetailForms } from './hooks';
import { useAuthorization } from '../../hooks/useAuthorization';
import {
    canCampaignReceiveLeads,
    getCampaignStatusLabel,
    resolveCampaignStatus,
} from '../../utils/campaignStatus';
import {
    LeadHeader,
    LeadInfoCard,
    LeadCustomFieldsSection,
    LeadTimelineSection,
    LeadFlowAnomalySection,
    EditLeadModal,
    LeadStageChangeModal,
} from './components';

import { LeadLossDialog } from '../../components/crm/LeadLossDialog';
import { CommercialFeedbackPanel } from './components/CommercialFeedbackPanel';
import { FinancialJourneyExternalSection } from './components/FinancialJourneyExternalSection';
import { useFinanceiraPipe } from '../../lib/financeira-pipes';
import { buildStageTransitionFields } from '../../lib/stage-transition-fields';
import { classifyRepasseTransition } from '../../lib/financeira-transitions';
import { advanceSiopi } from '../../lib/financeira-api';
import { FinanceiraStagePanel } from '../Financeira/components/FinanceiraStagePanel';
import { FinanceiraDocumentSharePanel } from '../Financeira/components/FinanceiraDocumentSharePanel';
import { FinanceiraLegacyDataSection } from '../Financeira/components/FinanceiraLegacyDataSection';

const POST_SALE_CHECKLIST_CUSTOM_FIELD_KEY = 'post_sale_initial_checklist';

export const LeadDetail: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, usersList, fetchUsers } = useUserStore();
    const { updateLead, campaigns, fetchCampaigns } = useCRMStore();
    const { partners, fetchPartners } = usePartnerStore();
    const pipeDetailByPipeId = useSettingsStore((state) => state.pipeDetailByPipeId);
    const { hasActionPermission, canEditPipe } = useAuthorization();

    const {
        lead,
        isLeadDetailLoading,
        leadDetailError,
        products,
        pipes,
        refreshLeadIfFetchedById,
        getStageFields,
        getPipeLevelFields,
        getPipelineStagesOrdered,
        getNextStages,
        getNextStageOptions,
        getStageKind,
        fetchPipeFlow,
    } = useLeadDetail();

    const [newComment, setNewComment] = useState('');
    const [contactType, setContactType] = useState<ContactActivityType>('ligacao_realizada');
    const [contactChannel, setContactChannel] = useState<ContactChannel>('telefone');
    const [contactResult, setContactResult] = useState<ContactResult>('sucesso');
    const [contactNotes, setContactNotes] = useState('');
    const [followUpDate, setFollowUpDate] = useState('');
    const [contactEffectiveAt, setContactEffectiveAt] = useState(() => toLocalDateTimeValue());
    const [contactError, setContactError] = useState<string | null>(null);
    const contactRequestId = useRef(0);
    const [isRegisteringContactAttempt, setIsRegisteringContactAttempt] = useState(false);
    const [lossTarget, setLossTarget] = useState<{ stage?: string } | null>(null);
    const [feedbackRevision, setFeedbackRevision] = useState(0);
    const [isAdvancing, setIsAdvancing] = useState(false);
    const [isEditLeadModalOpen, setIsEditLeadModalOpen] = useState(false);
    const [stageChangeModal, setStageChangeModal] = useState<{ targetStage: string } | null>(null);
    const [uploadingAttachmentKey, setUploadingAttachmentKey] = useState<string | null>(null);
    const [editUploadingAttachmentKey, setEditUploadingAttachmentKey] = useState<string | null>(null);
    const [openStages, setOpenStages] = useState<Set<string>>(new Set());
    const prevLeadIdRef = useRef<string | null>(null);
    const pipeLevelFieldsForEdit = useMemo(() => {
        if (!lead?.pipeId) return [];
        const all = getPipeLevelFields(lead.pipeId);
        if (!all.length) return [];
        const normalized = getNormalizedCustomFields(lead);
        const fromCustom: Record<string, string | number | boolean | string[] | null | undefined> = {};
        for (const e of normalized) {
            fromCustom[e.key] = e.type === 'attachment' ? e.url ?? null : e.value ?? null;
        }
        const fieldValues = {
            name: lead.name,
            company: lead.company ?? '',
            cpfCnpj: lead.cpfCnpj ?? '',
            phone: lead.phone ?? '',
            email: lead.email ?? '',
            address: lead.address ?? '',
            productName: lead.productName ?? '',
            productId: lead.productId ?? '',
            campaignId: lead.campaignId ?? '',
            partnerId: lead.partnerId ?? '',
            ownerUserId: lead.ownerUserId ?? '',
            value: lead.value ?? null,
            nomeRazaoSocial: lead.name,
            telefoneWhatsapp: lead.phone ?? '',
            valorSolicitado: lead.value ?? null,
            ...fromCustom,
        };
        return filterVisibleFields(all, {
            fieldValues,
            currentStage: lead.stage,
            userProfileCode: user?.profile?.code ?? user?.role,
        });
    }, [lead, getPipeLevelFields, user?.profile?.code, user?.role, pipeDetailByPipeId]);

    const forms = useLeadDetailForms({
        lead,
        products,
        pipeLevelFields: pipeLevelFieldsForEdit,
        refreshLeadIfFetchedById,
        isEditLeadModalOpen,
        onEditLeadModalClose: () => setIsEditLeadModalOpen(false),
    });

    useEffect(() => {
        if (isEditLeadModalOpen) fetchUsers({ page: 1, limit: 200 });
    }, [isEditLeadModalOpen, fetchUsers]);

    useEffect(() => {
        if (isEditLeadModalOpen) {
            fetchCampaigns({ page: 1, limit: 200 });
            fetchPartners();
        }
    }, [isEditLeadModalOpen, fetchCampaigns, fetchPartners]);

    useEffect(() => {
        if (isEditLeadModalOpen) setEditUploadingAttachmentKey(null);
    }, [isEditLeadModalOpen]);

    const fin = useFinanceiraPipe(lead?.pipeId);
    const standardStageChange = useMemo(() => {
        if (!lead || !stageChangeModal || fin.isFinanceira) return null;
        return buildStageTransitionFields(
            getStageFields(lead.pipeId, lead.stage),
            getStageFields(lead.pipeId, stageChangeModal.targetStage),
        );
    }, [lead, stageChangeModal, fin.isFinanceira, getStageFields]);
    const stageChangeFields = useMemo(
        () => standardStageChange?.fields ?? [],
        [standardStageChange],
    );

    const editCampaignOptions = useMemo(() => {
        const active = campaigns.filter(canCampaignReceiveLeads);
        const options = active.map((campaign) => ({
            id: campaign.id,
            name: campaign.name,
        }));

        if (!lead?.campaignId) return options;

        const selected = campaigns.find((campaign) => campaign.id === lead.campaignId);
        if (!selected) {
            return [
                ...options,
                {
                    id: lead.campaignId,
                    name: 'Campanha histórica (encerrada)',
                },
            ];
        }

        if (!canCampaignReceiveLeads(selected)) {
            return [
                ...options,
                {
                    id: selected.id,
                    name: `${selected.name} (${getCampaignStatusLabel(resolveCampaignStatus(selected)).toLowerCase()} - histórico)`,
                },
            ];
        }

        return options;
    }, [campaigns, lead?.campaignId]);
    const stageChangeSchema = useMemo(
        () => buildDynamicSchema(stageChangeFields, undefined, { requireKanbanObservation: !fin.isFinanceira }),
        [stageChangeFields, fin.isFinanceira],
    );
    const {
        register: registerStageChange,
        handleSubmit: handleSubmitStageChange,
        control: controlStageChange,
        setValue: setValueStageChange,
        reset: resetStageChange,
        formState: { errors: errorsStageChange },
    } = useForm({
        resolver: zodResolver(stageChangeSchema),
    });

    const handleAddComment = async () => {
        if (!newComment.trim() || !lead || !user) return;
        const comment: LeadComment = { id: `comment-${Date.now()}`, text: newComment, date: new Date().toISOString(), userId: user.id, userName: user.name, userInitials: user.avatarInitials };
        await updateLead(lead.id, { comments: [...(lead.comments || []), comment], lastContactDate: new Date().toISOString() });
        refreshLeadIfFetchedById();
        setNewComment('');
        toast.success('Comentário adicionado.');
    };

    useEffect(() => {
        contactRequestId.current += 1;
        setLossTarget(null);
        setContactNotes(''); setFollowUpDate(''); setContactError(null);
        setContactEffectiveAt(toLocalDateTimeValue());
        setContactType('ligacao_realizada'); setContactChannel('telefone'); setContactResult('sucesso');
        setIsRegisteringContactAttempt(false);
        return () => { contactRequestId.current += 1; };
    }, [lead?.id]);

    const handleRegisterContactAttempt = async () => {
        if (!lead || !user || isRegisteringContactAttempt) return;
        const requestId = ++contactRequestId.current;
        setContactError(null);
        try {
            const dates = prepareContactDates({ contactDate: contactEffectiveAt, followUpDate, notes: contactNotes, type: contactType, result: contactResult });
            setIsRegisteringContactAttempt(true);
            await updateLead(lead.id, { contactAttempt: { type: contactType, channel: contactChannel, result: contactResult, ...dates } });
            if (requestId !== contactRequestId.current) return;
            setContactNotes(''); setFollowUpDate(''); setContactEffectiveAt(toLocalDateTimeValue());
            refreshLeadIfFetchedById();
            toast.success('Atendimento registrado no histórico.');
        } catch (error) {
            if (requestId === contactRequestId.current) {
                setContactError(getApiErrorMessage(error, 'Não foi possível registrar o atendimento. Seus dados foram mantidos para tentar novamente.'));
            }
        } finally {
            if (requestId === contactRequestId.current) setIsRegisteringContactAttempt(false);
        }
    };

    const nextStageOptions = useMemo(() => {
        if (!lead) return [];
        if (lead.availableTransitions && lead.availableTransitions.length > 0) {
            return lead.availableTransitions
                .filter((transition) => !(transition.autoExecute || transition.kind === 'automatic'))
                .map((transition) => ({
                    actionId: transition.id,
                    stageName: transition.stageName,
                    actionLabel: transition.actionLabel,
                    kind: transition.kind,
                    autoExecute: transition.autoExecute,
                }));
        }
        return getNextStageOptions(lead.pipeId, lead.stage);
    }, [lead, getNextStageOptions, pipeDetailByPipeId]);

    const handleAdvanceToStage = async (targetStage: string) => {
        if (!lead) return;
        if (fin.isRepasse) {
            const kind = classifyRepasseTransition(lead, targetStage);
            if (kind === 'siopi') {
                setIsAdvancing(true);
                try {
                    const result = await advanceSiopi(lead.id, lead.updatedAt);
                    toast.success(`SIOPI concluída. Card movido para "${result.toStage}".`);
                    refreshLeadIfFetchedById();
                } catch (error) {
                    toast.error(getApiErrorMessage(error, 'Não foi possível concluir a SIOPI.'));
                } finally {
                    setIsAdvancing(false);
                }
                return;
            }
        }
        if (!fin.isRepasse && getStageKind(lead.pipeId, targetStage) === 'loss') { setLossTarget({ stage: targetStage }); return; }
        const allowed = lead.availableTransitions && lead.availableTransitions.length > 0
            ? lead.availableTransitions
                .filter((transition) => !(transition.autoExecute || transition.kind === 'automatic'))
                .map((transition) => transition.stageName)
            : getNextStages(lead.pipeId, lead.stage);
        if (allowed.length > 0 && !allowed.includes(targetStage)) return;
        const isOfficialReturn = lead.availableTransitions?.some(
            (transition) => transition.stageName === targetStage && transition.kind === 'return',
        );
        if (isOfficialReturn) {
            setIsAdvancing(true);
            try {
                await updateLead(lead.id, { stage: targetStage });
                refreshLeadIfFetchedById();
            } finally {
                setIsAdvancing(false);
            }
            return;
        }
        const shouldCreateClient = pipeDetailByPipeId[lead.pipeId]?.createClientOnFinalStage !== false;
        if (!fin.isFinanceira && getStageKind(lead.pipeId, targetStage) === 'win' && shouldCreateClient) {
            navigate(getCRMPipePath(lead.pipeId), { state: { openConversionLeadId: lead.id, conversionTargetStage: targetStage } });
            return;
        }
        // Nos pipes financeiros, avançar só altera a etapa; os campos são editados no detalhe do lead.
        if (fin.isFinanceira) {
            setIsAdvancing(true);
            try {
                await updateLead(lead.id, {
                    stage: targetStage,
                    ...(getStageKind(lead.pipeId, targetStage) === 'win' ? { status: LeadStatus.CLIENTE } : {}),
                });
                refreshLeadIfFetchedById();
            } catch {
                // toast de erro exibido pela store
            } finally {
                setIsAdvancing(false);
            }
            return;
        }
        const unitStageFields = buildStageTransitionFields(
            getStageFields(lead.pipeId, lead.stage),
            getStageFields(lead.pipeId, targetStage),
        ).fields;
        setStageChangeModal({ targetStage });
        const defaults: Record<string, unknown> = { kanbanObservation: '' };
        const byKey = new Map<string, CustomFieldEntry>();
        for (const e of getNormalizedCustomFields(lead)) byKey.set(e.key, e);
        unitStageFields.forEach((f) => {
            const entry = byKey.get(f.key);
            const existing = entry?.type === 'attachment' ? getAttachmentFormValue(entry) || undefined : entry?.value;
            if (existing !== undefined) defaults[f.key] = existing;
            else if (f.type === 'checkbox') defaults[f.key] = false;
        });
        resetStageChange(defaults);
    };

    const onConfirmStageChange = async (data: Record<string, unknown>) => {
        if (!lead || !stageChangeModal) return;
        const targetStage = stageChangeModal.targetStage;
        const normalized = getNormalizedCustomFields(lead);
        let newEntries;
        if (standardStageChange) {
            const sourceFields = standardStageChange.fields.filter((field) => standardStageChange.sourceKeys.has(field.key));
            const targetFields = standardStageChange.fields.filter((field) => !standardStageChange.sourceKeys.has(field.key));
            newEntries = mergeCustomFieldEntriesForFields(
                mergeCustomFieldEntriesForFields(normalized, sourceFields, data, lead.stage),
                targetFields,
                data,
                targetStage,
            );
        }
        setIsAdvancing(true);
        try {
            await updateLead(lead.id, {
                stage: targetStage,
                customFields: newEntries,
                kanbanObservation: String(data.kanbanObservation ?? ''),
            });
            refreshLeadIfFetchedById();
            setStageChangeModal(null);
        } finally {
            setIsAdvancing(false);
        }
    };

    const leadProduct = useMemo(() => (lead?.productId ? products.find((p) => p.id === lead.productId) : undefined), [lead?.productId, products]);
    const initialKeysSet = useMemo(() => new Set(leadProduct?.leadFormFields?.map((f) => f.key) ?? []), [leadProduct?.leadFormFields]);
    const normalizedCustomFields = useMemo(() => getNormalizedCustomFields(lead), [lead]);
    const customFieldsByKey = useMemo(() => { const map = new Map<string, CustomFieldEntry>(); for (const e of normalizedCustomFields) map.set(e.key, e); return map; }, [normalizedCustomFields]);
    const initialFieldsData = useMemo(() => (lead && leadProduct?.leadFormFields ? leadProduct.leadFormFields.map((f) => { const entry = customFieldsByKey.get(f.key); const value = entry?.type === 'attachment' ? entry.url : entry?.value; return { label: f.label, value, type: f.type }; }) : []), [lead, leadProduct?.leadFormFields, customFieldsByKey]);
    const stagesOrdered = useMemo(() => getPipelineStagesOrdered(lead?.pipeId ?? pipes[0]?.id ?? ''), [lead?.pipeId, pipes, getPipelineStagesOrdered, pipeDetailByPipeId]);
    const unitStageFields = useMemo(() => { const o: Record<string, FieldConfig[]> = {}; for (const stageName of stagesOrdered) o[stageName] = getStageFields(lead?.pipeId ?? '', stageName); return o; }, [lead?.pipeId, stagesOrdered, getStageFields]);
    const byStageData = useMemo(() => {
        const stageSet = new Set(stagesOrdered);
        const entriesByStage = new Map<string, CustomFieldEntry[]>();
        for (const entry of normalizedCustomFields) {
            if (initialKeysSet.has(entry.key)) continue;
            if (!stageSet.has(entry.stage)) continue;
            const list = entriesByStage.get(entry.stage) ?? []; list.push(entry); entriesByStage.set(entry.stage, list);
        }
        return stagesOrdered.map((stageName) => ({ stageName, fields: entriesByStage.get(stageName) ?? [] })).filter((g) => g.fields.length > 0);
    }, [normalizedCustomFields, stagesOrdered, initialKeysSet]);
    const stageConfigKeys = useMemo(() => { const set = new Set<string>(); (Object.values(unitStageFields) as FieldConfig[][]).forEach((configs) => configs.forEach((f) => set.add(f.key))); return set; }, [unitStageFields]);
    const otherCustomFields = useMemo(
        () =>
            normalizedCustomFields.filter(
                (e) =>
                    !initialKeysSet.has(e.key) &&
                    !stageConfigKeys.has(e.key) &&
                    e.key !== POST_SALE_CHECKLIST_CUSTOM_FIELD_KEY,
            ),
        [normalizedCustomFields, initialKeysSet, stageConfigKeys],
    );

    /** Chaves aposentadas (`isActive=false`) e que não estão ativas em nenhum outro lugar do pipe. */
    const retiredKeys = useMemo(() => {
        const retired = new Set<string>();
        if (!fin.isFinanceira || !lead) return retired;
        const detail = pipeDetailByPipeId[lead.pipeId];
        if (!detail) return retired;
        const active = new Set<string>();
        const consider = (field: { key: string; isActive?: boolean }) => {
            if (field.isActive === false) retired.add(field.key);
            else active.add(field.key);
        };
        detail.fields.forEach(consider);
        detail.steps.forEach((step) => step.fields.forEach(consider));
        active.forEach((key) => retired.delete(key));
        return retired;
    }, [fin.isFinanceira, lead, pipeDetailByPipeId]);
    const retiredEntries = useMemo(
        () => normalizedCustomFields.filter((entry) => retiredKeys.has(entry.key)),
        [normalizedCustomFields, retiredKeys],
    );
    const visibleByStageData = useMemo(
        () =>
            retiredKeys.size === 0
                ? byStageData
                : byStageData
                      .map((group) => ({ ...group, fields: group.fields.filter((field) => !retiredKeys.has(field.key)) }))
                      .filter((group) => group.fields.length > 0),
        [byStageData, retiredKeys],
    );
    const visibleOtherCustomFields = useMemo(
        () => otherCustomFields.filter((entry) => !retiredKeys.has(entry.key)),
        [otherCustomFields, retiredKeys],
    );
    const currentStageFields = useMemo(
        () => (lead && fin.isFinanceira ? getStageFields(lead.pipeId, lead.stage) : []),
        [lead, fin.isFinanceira, getStageFields, pipeDetailByPipeId],
    );

    useEffect(() => { if (lead?.id && lead.id !== prevLeadIdRef.current) { prevLeadIdRef.current = lead.id; setOpenStages(new Set(byStageData.map((b) => b.stageName))); } }, [lead?.id, byStageData]);

    const toggleStage = (stageName: string) => setOpenStages((prev) => { const next = new Set(prev); if (next.has(stageName)) next.delete(stageName); else next.add(stageName); return next; });

    useEffect(() => { if (lead?.pipeId) fetchPipeFlow(lead.pipeId); }, [lead?.pipeId, fetchPipeFlow]);

    useEffect(() => {
        if (!lead) return;
        const params = new URLSearchParams(location.search);
        if (params.get('action') !== 'contact') return;
        const timer = window.setTimeout(() => {
            const card = document.getElementById('lead-contact-attempt');
            card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            const notes = document.getElementById('lead-contact-notes') as HTMLTextAreaElement | null;
            notes?.focus();
        }, 120);
        return () => window.clearTimeout(timer);
    }, [lead, location.search]);

    const getStatusColor = (status: LeadStatus) => {
        switch (status) { case LeadStatus.LEAD: return 'bg-gray-100 text-gray-800 border-gray-200'; case LeadStatus.OPORTUNIDADE: return 'bg-yellow-100 text-yellow-800 border-yellow-200'; case LeadStatus.CLIENTE: return 'bg-green-100 text-green-800 border-green-200'; case LeadStatus.PERDIDO: return 'bg-red-100 text-red-800 border-red-200'; default: return 'bg-gray-100 text-gray-800 border-gray-200'; }
    };
    const formatCustomFieldValue = (value: unknown, type?: FieldConfigType): string => {
        if (value === undefined || value === null) return '—';
        if (type === 'currency') { const n = typeof value === 'number' ? value : Number(value); return Number.isFinite(n) ? formatCurrency(n) : String(value); }
        if (type === 'number') { const n = typeof value === 'number' ? value : Number(value); return Number.isFinite(n) ? String(n) : String(value); }
        if (type === 'checkbox') return value ? 'Sim' : 'Não';
        return String(value);
    };
    const getTypeLabel = (type: FieldConfigType): string => ({ text: 'Texto', number: 'Número', currency: 'Moeda', select: 'Seleção', checkbox: 'Checkbox', attachment: 'Anexo' }[type] ?? type);
    const renderCustomFieldValue = (entry: CustomFieldEntry): React.ReactNode => {
        if (entry.type === 'attachment' && entry.url) return <AttachmentFilesLinks entry={entry} />;
        return formatCustomFieldValue(entry.value, entry.type);
    };

    if (isLeadDetailLoading && !lead) {
        return <DetailPageSkeleton />;
    }

    if (!lead) {
        return (
            <div
                className="flex items-center justify-center min-h-[70vh] px-4"
                role="status"
                aria-live="polite"
                aria-label="Lead não encontrado"
            >
                <div className="text-center">
                    <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" aria-hidden />
                    <p className="text-gray-600">{leadDetailError ?? 'Lead não encontrado'}</p>
                    {leadDetailError && <button type="button" onClick={() => { void refreshLeadIfFetchedById(); }} className="mt-4 mr-4 text-salesforce-blue underline">Tentar novamente</button>}
                    <button
                        type="button"
                        onClick={() => navigate(AppPath.CRM)}
                        className="mt-4 text-salesforce-blue hover:underline"
                    >
                        Voltar para CRM
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-10 motion-safe:animate-fade-in">
            {leadDetailError && <div role="alert" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                {leadDetailError} <button type="button" onClick={() => { void refreshLeadIfFetchedById(); }} className="font-semibold underline">Tentar novamente</button>
            </div>}
            <LeadHeader
                onBack={() => {
                    const pipe = pipes.find((item) => item.id === lead.pipeId);
                    navigate(getCRMPipePath(pipe?.slug ?? lead.pipeId));
                }}
                onEdit={() => setIsEditLeadModalOpen(true)}
                nextStageOptions={nextStageOptions}
                lead={lead}
                pipeName={pipes.find((p) => p.id === lead.pipeId)?.name}
                stagesOrdered={stagesOrdered}
                pipeUnitType={pipes.find((p) => p.id === lead.pipeId)?.unitType}
                getStageKind={getStageKind}
                onAdvanceToStage={handleAdvanceToStage}
                isAdvancing={isAdvancing}
            />

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,340px)_1fr] gap-6 mt-6">
                <div className="xl:sticky xl:top-24 xl:self-start">
                    <LeadInfoCard
                    lead={lead}
                    pipes={pipes}
                    campaigns={campaigns}
                    partners={partners}
                    getStatusColor={getStatusColor}
                    financeiraKind={fin.isCredito ? 'credito' : fin.isRepasse ? 'repasse' : null}
                    />
                </div>

                <div className="space-y-5 min-w-0">
                    {!fin.isFinanceira && (
                        <CommercialFeedbackPanel key={lead.id} leadId={lead.id} revision={`${lead.updatedAt ?? ''}:${feedbackRevision}`}
                            onSaved={() => { refreshLeadIfFetchedById(); }}
                            onRegisterLoss={() => setLossTarget({})} />
                    )}
                    {fin.isFinanceira && (
                        <FinanceiraStagePanel
                            lead={lead}
                            fields={currentStageFields}
                            isRepasse={fin.isRepasse}
                            canEdit={(hasActionPermission('crm.edit') || hasActionPermission('crm.manage')) && canEditPipe(lead.pipeId)}
                            onSaved={() => { refreshLeadIfFetchedById(); }}
                        />
                    )}
                    {fin.isCredito && lead.stage === 'SIMULAÇÃO' && (
                        <FinanceiraDocumentSharePanel
                            lead={lead}
                            kind="SIMULACAO"
                            canEdit={(hasActionPermission('crm.edit') || hasActionPermission('crm.manage')) && canEditPipe(lead.pipeId)}
                        />
                    )}
                    {fin.isRepasse && lead.stage === 'ENGENHARIA' && (
                        <FinanceiraDocumentSharePanel
                            lead={lead}
                            kind="BOLETO"
                            canEdit={(hasActionPermission('crm.edit') || hasActionPermission('crm.manage')) && canEditPipe(lead.pipeId)}
                        />
                    )}
                    {!isDemo && <LeadFlowAnomalySection
                        lead={lead}
                        canEdit={hasActionPermission('crm.edit') || hasActionPermission('crm.manage')}
                        onSave={async (payload) => {
                            await updateLead(lead.id, toAnomalyUpdatePayload(payload));
                            refreshLeadIfFetchedById();
                        }}
                    />}
                    {!isDemo && <FinancialJourneyExternalSection leadId={lead.id} />}
                    <LeadTimelineSection
                        newComment={newComment}
                        onCommentChange={setNewComment}
                        onAddComment={handleAddComment}
                        contactType={contactType}
                        onContactTypeChange={setContactType}
                        contactChannel={contactChannel}
                        onContactChannelChange={setContactChannel}
                        contactResult={contactResult}
                        onContactResultChange={setContactResult}
                        contactNotes={contactNotes}
                        onContactNotesChange={setContactNotes}
                        contactEffectiveAt={contactEffectiveAt}
                        onContactEffectiveAtChange={setContactEffectiveAt}
                        contactError={contactError}
                        canRegisterContact={(hasActionPermission('crm.edit') || hasActionPermission('crm.manage')) && Boolean(lead.pipeId && canEditPipe(lead.pipeId))}
                        followUpDate={followUpDate}
                        onFollowUpDateChange={setFollowUpDate}
                        onRegisterContactAttempt={handleRegisterContactAttempt}
                        isRegisteringContactAttempt={isRegisteringContactAttempt}
                        comments={lead.comments ?? []}
                        timeline={lead.timeline ?? []}
                        showCommercialContactForm={!fin.isFinanceira}
                    />
                    <LeadCustomFieldsSection
                        initialFieldsData={initialFieldsData}
                        byStageData={visibleByStageData}
                        otherCustomFields={visibleOtherCustomFields}
                        openStages={openStages}
                        onToggleStage={toggleStage}
                        getTypeLabel={getTypeLabel}
                        formatCustomFieldValue={formatCustomFieldValue}
                        renderCustomFieldValue={renderCustomFieldValue}
                    />
                    {fin.isFinanceira && <FinanceiraLegacyDataSection entries={retiredEntries} />}
                </div>
            </div>
            {lossTarget && <LeadLossDialog key={lead.id} lead={lead} targetStage={lossTarget.stage} onClose={() => setLossTarget(null)}
                onSaved={() => { setFeedbackRevision(value => value + 1); refreshLeadIfFetchedById(); }} />}
            <EditLeadModal
                isOpen={isEditLeadModalOpen}
                onClose={() => setIsEditLeadModalOpen(false)}
                onSubmit={forms.editForm.handleSubmit(forms.editForm.handleSaveEditLead)}
                register={forms.editForm.register}
                control={forms.editForm.control}
                errors={forms.editForm.errors}
                products={products}
                campaigns={editCampaignOptions}
                partners={partners}
                users={usersList}
                pipeLevelFields={forms.editForm.pipeLevelFields}
                uploadingAttachmentKey={editUploadingAttachmentKey}
                setUploadingAttachmentKey={setEditUploadingAttachmentKey}
            />
            {!fin.isFinanceira && <LeadStageChangeModal isOpen={!!stageChangeModal} lead={lead} targetStage={stageChangeModal?.targetStage ?? null} fields={stageChangeFields} register={registerStageChange} control={controlStageChange} setValue={setValueStageChange} errors={errorsStageChange} uploadingAttachmentKey={uploadingAttachmentKey} setUploadingAttachmentKey={setUploadingAttachmentKey} onConfirm={handleSubmitStageChange(onConfirmStageChange)} onClose={() => setStageChangeModal(null)} hideObservation={false} />}
        </div>
    );
};
