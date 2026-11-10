import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { ChevronLeft } from 'lucide-react';
import { LeadStatus, PipeId, Lead, FieldConfig } from '../../types';
import {
    buildCustomFieldEntryFromConfig,
    getAttachmentFormValue,
    getNormalizedCustomFields,
    mergeCustomFieldEntriesForFields,
} from '../../utils/leadCustomFields';
import { DateFilterBar, type FilterPeriod, type DateFilterOptions } from '../../components/DateFilterBar';
import { getDateRangeForFilter, formatEvolucao } from '../../utils/formatters';
import {
    useCRMStore,
    useTenantStore,
    useSettingsStore,
    usePartnerStore,
    useUserStore,
    useProductStore,
} from './store';
import { useAuthorization } from '../../hooks/useAuthorization';
import { getLeadDetailPath, AppPath, getPipeSettingsPath, getCRMPipePath, getCRMPipeSlugFromPathname } from '../../routes';
import {
    createLeadSchema,
    conversionSchema,
    buildDynamicSchema,
    validateLeadStep1Rules,
    type ConversionFormData,
} from './schemas';
import type { StageData, LocationConversionState } from './schemas';
import {
    CRMPipeGrid,
    CRMKanbanView,
    NewLeadModal,
    StageChangeModal,
    ConversionModal,
} from './components';
import { useRestrictedAction } from '../../hooks/useRestrictedAction';
import { PermissionFeedback } from '../../components/authorization/PermissionFeedback';
import { useLeadLabelsStore } from '../LeadLabels/store/useLeadLabelsStore';
import { CRMFilterBar } from './components/CRMFilterBar';
import { withLeadFormFieldHelp } from '../../lib/leadFormFieldHelp';
import { buildFieldRuleContext } from '../../lib/field-rule-context';
import {
    getLeadFormStep1Rules,
    resolveLeadDisplayName,
} from '../../lib/leadFormProductRules';

import { createLatestRequestTracker } from '../../lib/latest-request';
import { getApiErrorMessage } from '../../lib/api-error';
import { api } from '../../lib/axios';
import { buildLeadFilterQuery } from '../../lib/lead-query';
import { isLeadTemperature, type LeadTemperature } from '../../lib/lead-priority';

import { LeadLossDialog } from '../../components/crm/LeadLossDialog';
import { buildStageTransitionFields } from '../../lib/stage-transition-fields';

const KANBAN_PAGE_SIZE = 20;

export const CRM: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { pipes, fetchPublicSettings, loaded: tenantPublicSettingsLoaded } = useTenantStore();
    const { leadsPagination, crmSummary, campaigns, fetchLeads, fetchLeadsForStage, fetchCRMSummary, fetchCampaigns, createLead, updateLead } = useCRMStore();
    const { getPipelineStagesOrdered, getNextStages, getStageKind, getStageFields, getPipeLevelFields, fetchSettings, fetchPipeFlow, fetchLeadCountByStage, isLoading: settingsLoading, settingsLoaded } = useSettingsStore();
    const pipeDetailByPipeId = useSettingsStore((s) => s.pipeDetailByPipeId);
    const { partners, fetchPartners } = usePartnerStore();
    const { user, usersList, fetchUsers } = useUserStore();
    const { hasActionPermission, canEditPipe } = useAuthorization();
    const canAssignRegisteredByStaff = hasActionPermission('crm.admin');
    const { products, fetchProducts } = useProductStore();
    const createLeadAction = useRestrictedAction('crm.createLead');
    const stageAction = useRestrictedAction('crm.stageChange');
    const fetchLabelsByPipe = useLeadLabelsStore((s) => s.fetchLabelsByPipe);

    useEffect(() => {
        if (pipes.length) return;
        fetchPublicSettings();
    }, [pipes.length, fetchPublicSettings]);

    const visiblePipes = useMemo(() => {
        const map = user?.permissions?.pipeAccess;
        if (!map) return pipes;
        return pipes.filter((p) => {
            const lvl = map[p.id];
            return lvl === 'read' || lvl === 'edit';
        });
    }, [pipes, user?.permissions?.pipeAccess]);

    const pipeSlugFromUrl = getCRMPipeSlugFromPathname(location.pathname);
    const selectedPipe = useMemo(
        () =>
            pipeSlugFromUrl
                ? visiblePipes.find((p) => p.id === pipeSlugFromUrl || p.slug === pipeSlugFromUrl) ?? null
                : null,
        [visiblePipes, pipeSlugFromUrl],
    );
    const selectedPipeId: PipeId | null = selectedPipe?.id ?? null;
    const isContabilidadePipe = selectedPipe?.unitType === 'CONTABILIDADE';
    const labelsByPipe = useLeadLabelsStore((s) => s.labelsByPipe);
    const pipeLabels = (selectedPipeId ? labelsByPipe[selectedPipeId] : undefined) ?? [];
    const pipeFlowForSelected = useSettingsStore((s) => (selectedPipeId ? s.pipeFlowByPipeId[selectedPipeId] : undefined));
    const pipeFlowLoaded = Boolean(selectedPipeId && pipeFlowForSelected);

    /** Redireciona se o pipe da URL não existir ou não for permitido para o perfil. */
    useEffect(() => {
        if (!tenantPublicSettingsLoaded || !pipeSlugFromUrl) return;
        if (selectedPipe) return;
        navigate(AppPath.CRM, { replace: true });
    }, [tenantPublicSettingsLoaded, pipeSlugFromUrl, selectedPipe, navigate]);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') ?? '');
    const [appliedSearchTerm, setAppliedSearchTerm] = useState(searchParams.get('q') ?? '');
    const [dateFilter, setDateFilter] = useState<FilterPeriod>('all');
    const [filterOptions, setFilterOptions] = useState<DateFilterOptions | undefined>();
    const [totalLeadsPeriodoA, setTotalLeadsPeriodoA] = useState<number | null>(null);
    const [leadsByStageData, setLeadsByStageData] = useState<Record<string, StageData>>({});
    const [loadingByStage, setLoadingByStage] = useState<Record<string, boolean>>({});
    const [errorsByStage, setErrorsByStage] = useState<Record<string, string>>({});
    const requestTracker = useRef(createLatestRequestTracker());
    const previousPipeId = useRef<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isFromPartner, setIsFromPartner] = useState(false);
    const [isBroughtByStaff, setIsBroughtByStaff] = useState(false);
    const [leadModalStep, setLeadModalStep] = useState<1 | 2>(1);
    const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
    const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);
    const [conversionTargetStage, setConversionTargetStage] = useState<string | null>(null);
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOverStage, setDragOverStage] = useState<string | null>(null);
    const [lossDialog, setLossDialog] = useState<{ lead: Lead; targetStage: string } | null>(null);
    const [stageChangeModal, setStageChangeModal] = useState<{ lead: Lead; targetStage: string } | null>(null);
    const [uploadingAttachmentKey, setUploadingAttachmentKey] = useState<string | null>(null);
    const [appliedLabelId, setAppliedLabelId] = useState<string | null>(
        searchParams.get('labelId') || null,
    );
    const [temperatureFilter, setTemperatureFilter] = useState<'' | LeadTemperature>(() => {
        const temperature = searchParams.get('temperature');
        return isLeadTemperature(temperature) ? temperature : '';
    });
    const [selectedOwnerUserId, setSelectedOwnerUserId] = useState<string | null>(
        searchParams.get('ownerUserId') || null,
    );
    const [originFilter, setOriginFilter] = useState<'' | 'manual' | 'import' | 'public' | 'campaign' | 'partner'>(
        (() => {
            const origin = searchParams.get('origin');
            if (
                origin === 'manual' ||
                origin === 'import' ||
                origin === 'public' ||
                origin === 'campaign' ||
                origin === 'partner'
            ) {
                return origin;
            }
            return '';
        })(),
    );
    const [sourceSubtypeFilter, setSourceSubtypeFilter] = useState(searchParams.get('sourceSubtype') ?? '');
    const [campaignIdFilter, setCampaignIdFilter] = useState(searchParams.get('campaignId') ?? '');
    const [partnerIdFilter, setPartnerIdFilter] = useState(searchParams.get('partnerId') ?? '');
    const [productIdFilter, setProductIdFilter] = useState(searchParams.get('productId') ?? '');
    const [existingClientFilter, setExistingClientFilter] = useState<'' | 'yes' | 'no'>(
        searchParams.get('existingClient') === 'yes' || searchParams.get('existingClient') === 'no'
            ? (searchParams.get('existingClient') as 'yes' | 'no')
            : '',
    );
    const [dateFieldFilter, setDateFieldFilter] = useState<'createdAt' | 'lastContactDate'>(
        searchParams.get('dateField') === 'lastContactDate' ? 'lastContactDate' : 'createdAt',
    );
    const [leadStatusFilter, setLeadStatusFilter] = useState(searchParams.get('status') ?? '');
    const [slaStatusFilter, setSlaStatusFilter] = useState(searchParams.get('slaStatus') ?? '');
    const [stageFocusFilter, setStageFocusFilter] = useState(searchParams.get('stage') ?? '');

    const twoRanges = filterOptions?.compareTwoRanges;
    const isTwoIntervals = Boolean(twoRanges?.intervalA?.start && twoRanges?.intervalA?.end && twoRanges?.intervalB?.start && twoRanges?.intervalB?.end);

    const dateRange = useMemo(() => {
        if (twoRanges?.intervalB?.start && twoRanges?.intervalB?.end) {
            return { dateFrom: twoRanges.intervalB.start, dateTo: twoRanges.intervalB.end };
        }
        if (filterOptions?.compareOneRange?.start && filterOptions?.compareOneRange?.end) {
            return { dateFrom: filterOptions.compareOneRange.start, dateTo: filterOptions.compareOneRange.end };
        }
        return getDateRangeForFilter(dateFilter);
    }, [dateFilter, filterOptions, twoRanges?.intervalB?.start, twoRanges?.intervalB?.end, filterOptions?.compareOneRange?.start, filterOptions?.compareOneRange?.end]);

    const advancedFilters = useMemo(
        () => ({
            ...(originFilter ? { origin: originFilter } : {}),
            ...(sourceSubtypeFilter ? { sourceSubtype: sourceSubtypeFilter } : {}),
            ...(campaignIdFilter ? { campaignId: campaignIdFilter } : {}),
            ...(partnerIdFilter ? { partnerId: partnerIdFilter } : {}),
            ...(productIdFilter ? { productId: productIdFilter } : {}),
            ...(existingClientFilter ? { existingClient: existingClientFilter } : {}),
            ...(dateFieldFilter ? { dateField: dateFieldFilter } : {}),
            ...(leadStatusFilter ? { status: leadStatusFilter } : {}),
            ...(slaStatusFilter ? { slaStatus: slaStatusFilter } : {}),
            ...(temperatureFilter ? { temperature: temperatureFilter } : {}),
        }),
        [
            originFilter,
            sourceSubtypeFilter,
            campaignIdFilter,
            partnerIdFilter,
            productIdFilter,
            existingClientFilter,
            dateFieldFilter,
            leadStatusFilter,
            slaStatusFilter,
            temperatureFilter,
        ],
    );

    useEffect(() => {
        const next = new URLSearchParams(searchParams);
        const setOrDelete = (key: string, value?: string) => {
            if (value && value.trim()) next.set(key, value);
            else next.delete(key);
        };
        setOrDelete('q', appliedSearchTerm || undefined);
        setOrDelete('labelId', appliedLabelId ?? undefined);
        setOrDelete('temperature', temperatureFilter || undefined);
        setOrDelete('ownerUserId', selectedOwnerUserId ?? undefined);
        setOrDelete('origin', originFilter || undefined);
        setOrDelete('sourceSubtype', sourceSubtypeFilter || undefined);
        setOrDelete('campaignId', campaignIdFilter || undefined);
        setOrDelete('partnerId', partnerIdFilter || undefined);
        setOrDelete('productId', productIdFilter || undefined);
        setOrDelete('existingClient', existingClientFilter || undefined);
        setOrDelete('dateField', dateFieldFilter === 'lastContactDate' ? 'lastContactDate' : undefined);
        setOrDelete('status', leadStatusFilter || undefined);
        setOrDelete('slaStatus', slaStatusFilter || undefined);
        setOrDelete('stage', stageFocusFilter || undefined);
        if (next.toString() !== searchParams.toString()) {
            setSearchParams(next, { replace: true, state: location.state });
        }
    }, [
        appliedLabelId,
        appliedSearchTerm,
        campaignIdFilter,
        existingClientFilter,
        dateFieldFilter,
        leadStatusFilter,
        slaStatusFilter,
        stageFocusFilter,
        originFilter,
        partnerIdFilter,
        productIdFilter,
        searchParams,
        selectedOwnerUserId,
        setSearchParams,
        location.state,
        sourceSubtypeFilter,
        temperatureFilter,
    ]);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);
    useEffect(() => {
        if (selectedPipeId) {
            fetchPipeFlow(selectedPipeId);
            fetchLeadCountByStage(selectedPipeId);
            fetchLabelsByPipe(selectedPipeId);
            fetchUsers({ page: 1, limit: 200 });
            fetchCampaigns({ page: 1, limit: 100 }).catch(() => {});
            fetchPartners().catch(() => {});
            fetchProducts({ page: 1, limit: 200 }).catch(() => {});
        }
    }, [
        selectedPipeId,
        fetchPipeFlow,
        fetchLeadCountByStage,
        fetchLabelsByPipe,
        fetchUsers,
        fetchCampaigns,
        fetchPartners,
        fetchProducts,
    ]);

    useEffect(() => {
        setLeadsByStageData({});
        setLoadingByStage({});
        setErrorsByStage({});
        // Keep deep-link filters on initial hydration; only clear when changing pipes.
        if (previousPipeId.current && selectedPipeId !== previousPipeId.current) {
            setSearchTerm('');
            setAppliedSearchTerm('');
            setAppliedLabelId(null);
        }
        if (selectedPipeId) previousPipeId.current = selectedPipeId;
    }, [selectedPipeId]);

    useEffect(() => {
        if (!selectedPipeId) return;
        const dateRangeToUse = isTwoIntervals && twoRanges ? { dateFrom: twoRanges.intervalB.start, dateTo: twoRanges.intervalB.end } : dateRange;
        fetchCRMSummary({
            pipeId: selectedPipeId,
            search: appliedSearchTerm || undefined,
            dateFrom: dateRangeToUse.dateFrom,
            dateTo: dateRangeToUse.dateTo,
            labelId: appliedLabelId ?? undefined,
            ownerUserId: selectedOwnerUserId ?? undefined,
            ...advancedFilters,
        });
    }, [selectedPipeId, appliedSearchTerm, appliedLabelId, selectedOwnerUserId, advancedFilters, dateRange, isTwoIntervals, twoRanges, fetchCRMSummary]);

    const requestScope = JSON.stringify({ selectedPipeId, appliedSearchTerm, appliedLabelId, selectedOwnerUserId, advancedFilters, dateRange, twoRanges });
    requestTracker.current.setScope(requestScope);
    useEffect(() => () => requestTracker.current.invalidate(), []);

    const loadStagePage = useCallback(async (stage: string, page: number, append: boolean) => {
        if (!selectedPipeId) return;
        const pipeIdForRequest = selectedPipeId;
        const isCurrent = requestTracker.current.begin(requestScope, stage);
        if (!isCurrent()) return;
        setLoadingByStage((prev) => ({ ...prev, [stage]: true }));
        setErrorsByStage((prev) => ({ ...prev, [stage]: '' }));
        try {
            const dateRangeToUse = isTwoIntervals && twoRanges ? { dateFrom: twoRanges.intervalB.start, dateTo: twoRanges.intervalB.end } : dateRange;
            const res = await fetchLeadsForStage({
                stage,
                page,
                limit: KANBAN_PAGE_SIZE,
                search: appliedSearchTerm || undefined,
                pipeId: pipeIdForRequest,
                labelId: appliedLabelId ?? undefined,
                ownerUserId: selectedOwnerUserId || undefined,
                ...advancedFilters,
                ...dateRangeToUse,
            });
            if (!isCurrent()) return;
            setLeadsByStageData((prev) => {
                if (!isCurrent()) return prev;
                const current = prev[stage];
                const newLeads = append && current
                    ? Array.from(new Map([...current.leads, ...res.data].map((lead) => [lead.id, lead])).values())
                    : res.data;
                const hasMore = res.page < res.totalPages;
                return { ...prev, [stage]: { leads: newLeads, page: res.page, total: res.total, hasMore } };
            });
        } catch (e) {
            if (isCurrent()) setErrorsByStage((prev) => ({ ...prev, [stage]: getApiErrorMessage(e, 'Não foi possível carregar esta etapa. Tente novamente.') }));
        } finally {
            if (isCurrent()) {
                setLoadingByStage((prev) => ({ ...prev, [stage]: false }));
            }
        }
    }, [
        selectedPipeId,
        appliedSearchTerm,
        appliedLabelId,
        selectedOwnerUserId,
        advancedFilters,
        dateRange,
        isTwoIntervals,
        twoRanges,
        fetchLeadsForStage,
        requestScope,
    ]);

    const pipelineStagesOrdered = useMemo(
        () => (selectedPipeId ? getPipelineStagesOrdered(selectedPipeId) : []),
        [selectedPipeId, getPipelineStagesOrdered, pipeFlowForSelected],
    );

    useEffect(() => {
        if (!stageFocusFilter || !selectedPipeId || pipelineStagesOrdered.length === 0) return;
        const timer = window.setTimeout(() => {
            const el = document.querySelector(`[data-kanban-stage="${CSS.escape(stageFocusFilter)}"]`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 400);
        return () => window.clearTimeout(timer);
    }, [stageFocusFilter, selectedPipeId, pipelineStagesOrdered, leadsByStageData]);

    useEffect(() => {
        function runLoadLeads() {
            if (selectedPipeId && pipeFlowLoaded && pipelineStagesOrdered.length > 0) {
                setLeadsByStageData({});
                setErrorsByStage({});
                pipelineStagesOrdered.forEach((stage) => loadStagePage(stage, 1, false));
            }
        }

        if (isTwoIntervals && twoRanges) {
            setTotalLeadsPeriodoA(null);
            const isCurrentComparison = requestTracker.current.begin(requestScope, '__comparison');
            (async () => {
                const baseParams = {
                    search: appliedSearchTerm || undefined,
                    pipeId: selectedPipeId ?? undefined,
                    labelId: appliedLabelId ?? undefined,
                    ownerUserId: selectedOwnerUserId || undefined,
                    ...advancedFilters,
                };
                try {
                    const query = buildLeadFilterQuery({ ...baseParams, dateFrom: twoRanges.intervalA.start, dateTo: twoRanges.intervalA.end });
                    const response = await api.get<{ total: number }>(`/leads/summary?${query}`);
                    if (!isCurrentComparison()) return;
                    setTotalLeadsPeriodoA(response.data.total);
                } catch (error) {
                    if (!isCurrentComparison()) return;
                    toast.error(getApiErrorMessage(error, 'Não foi possível comparar os períodos.'));
                }
                if (!isCurrentComparison()) return;
                if (selectedPipeId && pipeFlowLoaded && pipelineStagesOrdered.length > 0) {
                    setLeadsByStageData({});
                    for (const stage of pipelineStagesOrdered) await loadStagePage(stage, 1, false);
                }
            })();
            return;
        }
        setTotalLeadsPeriodoA(null);
        runLoadLeads();
    }, [
        fetchLeads,
        selectedPipeId,
        dateFilter,
        filterOptions,
        isTwoIntervals,
        twoRanges?.intervalA?.start,
        twoRanges?.intervalA?.end,
        twoRanges?.intervalB?.start,
        twoRanges?.intervalB?.end,
        dateRange.dateFrom ?? '',
        dateRange.dateTo ?? '',
        dateRange,
        appliedSearchTerm,
        appliedLabelId,
        selectedOwnerUserId,
        advancedFilters,
        pipeFlowLoaded,
        pipelineStagesOrdered.length,
        loadStagePage,
    ]);

    useEffect(() => {
        if (!isCreateModalOpen) return;
        setLeadModalStep(1);
        fetchPartners();
        fetchUsers();
        fetchProducts({ page: 1, limit: 100 });
        fetchCampaigns({
            page: 1,
            limit: 100,
            status: 'active',
            activeOnly: true,
        });
    }, [isCreateModalOpen, fetchPartners, fetchUsers, fetchProducts, fetchCampaigns]);
    useEffect(() => { if (isConversionModalOpen) fetchProducts({ page: 1, limit: 100 }); }, [isConversionModalOpen, fetchProducts]);

    const [leadSuccessMessage, setLeadSuccessMessage] = useState<string | null>(null);
    const [leadFormProductId, setLeadFormProductId] = useState('');
    const selectedLeadProduct = useMemo(
        () => products.find((p) => p.id === leadFormProductId),
        [products, leadFormProductId],
    );
    const leadStep1Rules = useMemo(
        () => getLeadFormStep1Rules(selectedLeadProduct?.name),
        [selectedLeadProduct?.name],
    );
    const createLeadBaseSchema = useMemo(
        () => createLeadSchema({ isFromPartner, isBroughtByStaff, requiresProduct: !isContabilidadePipe }),
        [isFromPartner, isBroughtByStaff, isContabilidadePipe],
    );
    const {
        register: registerLead,
        handleSubmit: handleSubmitLead,
        reset: resetLead,
        control: controlLead,
        setValue: setLeadValue,
        setError: setLeadError,
        trigger: triggerLead,
        getValues: getLeadValues,
        formState: { errors: errorsLead },
    } = useForm({
        resolver: zodResolver(createLeadBaseSchema),
        defaultValues: {
            name: '',
            partnerId: '',
            registeredByStaffId: '',
            productId: '',
            campaignId: '',
            phone: '',
            email: '',
            address: '',
            company: '',
        },
    });
    const leadProductId = useWatch({ control: controlLead, name: 'productId', defaultValue: '' });
    useEffect(() => {
        setLeadFormProductId(typeof leadProductId === 'string' ? leadProductId : '');
    }, [leadProductId]);
    const createLeadDynamicFields = useMemo(() => {
        const pipeId = isContabilidadePipe
            ? selectedPipeId
            : selectedLeadProduct?.pipeId ?? visiblePipes[0]?.id;
        if (!pipeId) return selectedLeadProduct?.leadFormFields ?? [];
        const initialStage = getPipelineStagesOrdered(pipeId)[0] ?? 'Entrada (Lead)';
        const mergedByKey = new Map<string, FieldConfig>();
        const addField = (field: FieldConfig) => {
            const current = mergedByKey.get(field.key);
            if (!current) {
                mergedByKey.set(field.key, field);
                return;
            }
            mergedByKey.set(field.key, {
                ...current,
                ...field,
                required: Boolean(current.required || field.required),
            });
        };
        if (!isContabilidadePipe) {
            for (const field of getPipeLevelFields(pipeId)) addField(field);
        }
        for (const field of getStageFields(pipeId, initialStage)) addField(field);
        for (const field of selectedLeadProduct?.leadFormFields ?? []) addField(field);
        return withLeadFormFieldHelp(Array.from(mergedByKey.values()));
    }, [
        selectedLeadProduct,
        selectedPipeId,
        isContabilidadePipe,
        visiblePipes,
        pipeDetailByPipeId,
        getPipelineStagesOrdered,
        getPipeLevelFields,
        getStageFields,
    ]);
    const hasLeadExtraFields = createLeadDynamicFields.length > 0;

    useEffect(() => {
        const pipeId = selectedLeadProduct?.pipeId;
        if (!pipeId) return;
        if (pipeDetailByPipeId[pipeId]) return;
        fetchPipeFlow(pipeId);
    }, [selectedLeadProduct?.pipeId, pipeDetailByPipeId, fetchPipeFlow]);

    const conversionDefaultValues = { cpfCnpj: '', address: '', kanbanObservation: '' };
    const { register: registerConv, handleSubmit: handleSubmitConv, reset: resetConv, control: controlConv, formState: { errors: errorsConv } } = useForm<ConversionFormData>({
        resolver: zodResolver(conversionSchema),
        defaultValues: conversionDefaultValues,
    });

    const standardStageChange = useMemo(() => {
        if (!stageChangeModal) return null;
        const { lead, targetStage } = stageChangeModal;
        return buildStageTransitionFields(
            getStageFields(lead.pipeId, lead.stage),
            getStageFields(lead.pipeId, targetStage),
        );
    }, [stageChangeModal, getStageFields]);
    const stageChangeFields = useMemo(
        () => standardStageChange?.fields ?? [],
        [standardStageChange],
    );
    const stageChangeSchema = useMemo(
        () => buildDynamicSchema(stageChangeFields, undefined, { requireKanbanObservation: true }),
        [stageChangeFields],
    );
    const { register: registerStageChange, handleSubmit: handleSubmitStageChange, control: controlStageChange, reset: resetStageChange, formState: { errors: errorsStageChange } } = useForm({
        resolver: zodResolver(stageChangeSchema),
    });


    const kanbanStagesOrdered = useMemo(() => {
        if (!selectedPipeId || pipelineStagesOrdered.length === 0) return pipelineStagesOrdered;
        const defaultStages: string[] = [];
        const winStages: string[] = [];
        const lossStages: string[] = [];
        pipelineStagesOrdered.forEach((stage) => {
            const kind = getStageKind(selectedPipeId, stage);
            if (kind === 'win') winStages.push(stage);
            else if (kind === 'loss') lossStages.push(stage);
            else defaultStages.push(stage);
        });
        return [...defaultStages, ...winStages, ...lossStages];
    }, [selectedPipeId, pipelineStagesOrdered, getStageKind]);

    const getStageLeads = (stage: string) => leadsByStageData[stage]?.leads ?? [];
    const getLeadFromStages = (id: string) => {
        for (const s of Object.values(leadsByStageData) as StageData[]) {
            const found = s.leads.find((l) => l.id === id);
            if (found) return found;
        }
        return undefined;
    };

    const getAllowedNextStagesForLead = useCallback((lead: Lead) => {
        const ordinary = lead.availableTransitions && lead.availableTransitions.length > 0
            ? lead.availableTransitions.filter(transition => !(transition.autoExecute || transition.kind === 'automatic')).map(transition => transition.stageName)
            : getNextStages(lead.pipeId, lead.stage);
        const currentKind = getStageKind(lead.pipeId, lead.stage);
        const directLoss = !['Cliente', 'Perdido'].includes(lead.status) && currentKind !== 'win' && currentKind !== 'loss'
            ? getPipelineStagesOrdered(lead.pipeId).filter(stage => getStageKind(lead.pipeId, stage) === 'loss') : [];
        return Array.from(new Set([...ordinary, ...directLoss]));
    }, [getNextStages, getStageKind, getPipelineStagesOrdered]);

    const handleSearchLeads = () => {
        setAppliedSearchTerm(searchTerm);
    };
    const handleRefreshLeads = () => {
        if (!selectedPipeId || !pipeFlowLoaded || pipelineStagesOrdered.length === 0) return;
        setLeadsByStageData({});
        pipelineStagesOrdered.forEach((stage) => loadStagePage(stage, 1, false));
        const dateRangeToUse = isTwoIntervals && twoRanges ? { dateFrom: twoRanges.intervalB.start, dateTo: twoRanges.intervalB.end } : dateRange;
        fetchCRMSummary({
            pipeId: selectedPipeId,
            search: appliedSearchTerm || undefined,
            dateFrom: dateRangeToUse.dateFrom,
            dateTo: dateRangeToUse.dateTo,
            labelId: appliedLabelId ?? undefined,
            ownerUserId: selectedOwnerUserId ?? undefined,
            ...advancedFilters,
        });
    };

    /**
     * Recarrega as colunas envolvidas depois de uma transição. O lead retornado
     * pelo PUT é propositalmente resumido e não traz as transições disponíveis;
     * reutilizá-lo no card deixava o próximo drag usando as regras da etapa
     * anterior até que a página fosse atualizada.
     */
    const refreshStagesAfterMove = async (...stages: string[]) => {
        await Promise.all(
            [...new Set(stages.filter(Boolean))].map((stage) => loadStagePage(stage, 1, false)),
        );
    };
    const handleOpenConversion = (lead: Lead, targetStage?: string) => {
        const shouldCreateClient = pipeDetailByPipeId[lead.pipeId]?.createClientOnFinalStage !== false;
        if (!shouldCreateClient) {
            return;
        }
        const finalStage = targetStage ?? getPipelineStagesOrdered(lead.pipeId).pop() ?? '';
        setLeadToConvert(lead);
        setConversionTargetStage(finalStage);
        resetConv({ cpfCnpj: lead.cpfCnpj || '', address: lead.address || '', kanbanObservation: '' });
        setIsConversionModalOpen(true);
    };
    const handleCloseConversionModal = () => { setIsConversionModalOpen(false); setLeadToConvert(null); setConversionTargetStage(null); };
    const handleCloseCreateModal = () => {
        setIsCreateModalOpen(false);
        setIsFromPartner(false);
        setIsBroughtByStaff(false);
        setLeadModalStep(1);
        setLeadSuccessMessage(null);
        setLeadFormProductId('');
        resetLead({
            name: '',
            partnerId: '',
            registeredByStaffId: '',
            productId: '',
            campaignId: '',
            phone: '',
            email: '',
            address: '',
            company: '',
        });
    };
    const handleCloseStageChangeModal = () => setStageChangeModal(null);

    useEffect(() => {
        const state = location.state as LocationConversionState | undefined;
        if (!state?.openConversionLeadId) return;
        const lead = getLeadFromStages(state.openConversionLeadId);
        if (!lead) return;
        const finalStage = state.conversionTargetStage ?? getPipelineStagesOrdered(lead.pipeId).pop() ?? '';
        setLeadToConvert(lead);
        setConversionTargetStage(finalStage);
        resetConv({ cpfCnpj: lead.cpfCnpj || '', address: lead.address || '', kanbanObservation: '' });
        setIsConversionModalOpen(true);
        navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: {} });
    }, [location.state, location.pathname, location.search, leadsByStageData, navigate, getPipelineStagesOrdered, resetConv]);

    useEffect(() => {
        const state = location.state as { openCreateLead?: boolean } | undefined;
        if (!state?.openCreateLead || !createLeadAction.allowed) return;
        setIsCreateModalOpen(true);
        navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: {} });
    }, [location.state, location.pathname, location.search, navigate, createLeadAction.allowed]);

    const applyStep1RuleErrors = (data: Record<string, unknown>) => {
        const issues = validateLeadStep1Rules(data, leadStep1Rules);
        for (const issue of issues) {
            setLeadError(issue.path, { type: 'manual', message: issue.message });
        }
        return issues.length === 0;
    };

    const handleContinueToLeadStep2 = async () => {
        const fieldsToValidate = (isContabilidadePipe ? [] : ['productId']) as string[];
        const extra = [
            ...(isFromPartner ? (['partnerId'] as const) : []),
            ...(isBroughtByStaff ? (['registeredByStaffId'] as const) : []),
        ];
        const valid = await triggerLead([...fieldsToValidate, ...extra]);
        const values = getLeadValues() as Record<string, unknown>;
        const step1Ok = applyStep1RuleErrors(values);
        if (valid && step1Ok) setLeadModalStep(2);
    };
    const onCreateLead = async (data: Record<string, unknown>) => {
        const { name, partnerId, registeredByStaffId, productId, campaignId } = data;
        // Os dois primeiros campos do pipe Contabilidade são representados pelo
        // cadastro-base do lead. Espelhá-los nos campos dinâmicos preserva a
        // validação da etapa Entrada sem pedir as mesmas informações duas vezes.
        const dataWithAccountingAliases = isContabilidadePipe
            ? { ...data, nomeRazaoSocial: name, telefoneWhatsapp: data.phone }
            : data;
        const product = products.find((p) => p.id === productId);
        const step1Rules = getLeadFormStep1Rules(product?.name);
        const step1Issues = validateLeadStep1Rules(data, step1Rules);
        if (step1Issues.length > 0) {
            for (const issue of step1Issues) {
                setLeadError(issue.path, { type: 'manual', message: issue.message });
            }
            setLeadModalStep(1);
            toast.error(step1Issues[0]?.message ?? 'Preencha os dados iniciais.');
            return;
        }

        const pipeId: PipeId = (isContabilidadePipe ? selectedPipeId : product?.pipeId) ?? visiblePipes[0]?.id ?? '';
        const initialStage = getPipelineStagesOrdered(pipeId)[0] ?? 'Entrada (Lead)';
        if (createLeadDynamicFields.length > 0) {
            const ruleCtx = buildFieldRuleContext(createLeadDynamicFields, dataWithAccountingAliases, {
                currentStage: initialStage,
            });
            const dynamicValidation = buildDynamicSchema(
                createLeadDynamicFields,
                ruleCtx,
            ).safeParse(dataWithAccountingAliases);
            if (!dynamicValidation.success) {
                for (const issue of dynamicValidation.error.issues) {
                    const fieldKey = String(issue.path[0] ?? '');
                    if (!fieldKey) continue;
                    setLeadError(fieldKey as never, {
                        type: 'manual',
                        message: issue.message,
                    });
                }
                toast.error(
                    dynamicValidation.error.issues[0]?.message ??
                        'Preencha os campos obrigatórios do produto.',
                );
                return;
            }
        }

        const customFields = createLeadDynamicFields
            .filter((field) => field.type !== 'info')
            .map((field) =>
                buildCustomFieldEntryFromConfig(field, dataWithAccountingAliases[field.key], initialStage),
            );
        const byKey = new Map<string, { value?: unknown }>();
        for (const entry of customFields as Array<{ key: string; value?: unknown }>) {
            byKey.set(entry.key, entry);
        }
        const honorariosRaw = byKey.get('honorarios')?.value;
        const honorarios =
            typeof honorariosRaw === 'number' ? honorariosRaw : undefined;
        const cpfCnpjRaw = byKey.get('cpfCnpj')?.value;
        const telefoneRaw = byKey.get('telefoneWhatsapp')?.value;
        const companyRaw =
            typeof data.company === 'string' && data.company.trim()
                ? data.company
                : typeof byKey.get('razaoSocialSugerida')?.value === 'string'
                  ? String(byKey.get('razaoSocialSugerida')?.value)
                  : undefined;
        const emailRaw =
            typeof data.email === 'string' && data.email.trim()
                ? data.email
                : undefined;
        const addressRaw =
            typeof data.address === 'string' && data.address.trim()
                ? data.address
                : undefined;
        const phoneRaw =
            typeof data.phone === 'string' && data.phone.trim()
                ? data.phone
                : undefined;
        const resolvedPhone =
            (typeof telefoneRaw === 'string' ? telefoneRaw : undefined) ?? phoneRaw;
        const resolvedName = resolveLeadDisplayName({
            name: typeof name === 'string' ? name : undefined,
            phone: resolvedPhone,
            email: emailRaw,
            productName: product?.name,
        });

        const leadPayload: Partial<Lead> = {
            name: resolvedName,
            company: companyRaw,
            pipeId,
            status: LeadStatus.LEAD,
            stage: initialStage,
            value: honorarios ?? 0,
            cpfCnpj: typeof cpfCnpjRaw === 'string' ? cpfCnpjRaw : undefined,
            phone: resolvedPhone,
            email: emailRaw,
            address: addressRaw,
            productId: (productId as string) || undefined,
            productName: product?.name,
            campaignId: (campaignId as string) || undefined,
            customFields,
        };
        if (isFromPartner && partnerId) leadPayload.partnerId = partnerId as string;
        if (canAssignRegisteredByStaff && isBroughtByStaff && registeredByStaffId) {
            leadPayload.registeredByStaffId = registeredByStaffId as string;
        }
        try {
            await createLead(leadPayload);
            if (selectedPipeId) {
                const firstStage = getPipelineStagesOrdered(pipeId)[0];
                if (firstStage) loadStagePage(firstStage, 1, false);
            }
            if (step1Rules.successMessage) {
                setLeadSuccessMessage(step1Rules.successMessage);
                return;
            }
            handleCloseCreateModal();
        } catch {
            // toast já exibido em createLead
        }
    };

    const onConfirmConversion = async (data: ConversionFormData) => {
        if (!leadToConvert) return;
        const finalStage = conversionTargetStage ?? getPipelineStagesOrdered(leadToConvert.pipeId).pop() ?? '';
        const sourceStage = leadToConvert.stage;
        const updatedLead = await updateLead(leadToConvert.id, { status: LeadStatus.CLIENTE, stage: finalStage, cpfCnpj: data.cpfCnpj, address: data.address, kanbanObservation: data.kanbanObservation });
        if (temperatureFilter) {
            toast.success('Lead convertido em cliente com sucesso.');
            handleCloseConversionModal();
            handleRefreshLeads();
            return;
        }
        await refreshStagesAfterMove(sourceStage, updatedLead.stage ?? finalStage);
        toast.success('Lead convertido em cliente com sucesso.');
        handleCloseConversionModal();
    };

    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        if (!stageAction.allowed) return;
        setDraggedLeadId(leadId);
        setIsDragging(true);
        setDragOverStage(null);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (e: React.DragEvent, targetStage: string) => {
        if (!stageAction.allowed) return;
        setDragOverStage(targetStage);
        if (draggedLeadId) {
            const lead = getLeadFromStages(draggedLeadId);
            if (lead) {
                const allowedNext = getAllowedNextStagesForLead(lead);
                if (allowedNext.length > 0 && !allowedNext.includes(targetStage)) { e.dataTransfer.dropEffect = 'none'; return; }
            }
        }
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };
    const handleDragEnd = () => { setIsDragging(false); setDraggedLeadId(null); setDragOverStage(null); };

    /** Official return transitions keep the existing generic behavior. */
    const moveWithoutForm = async (lead: Lead, targetStage: string) => {
        const sourceStage = lead.stage;
        const updatedLead = await updateLead(lead.id, buildStageMoveUpdate(lead, targetStage));
        if (temperatureFilter) {
            toast.success(`Lead movido para "${targetStage}".`);
            handleRefreshLeads();
            return;
        }
        await refreshStagesAfterMove(sourceStage, updatedLead.stage ?? targetStage);
        toast.success(`Lead movido para "${targetStage}".`);
    };

    const handleDrop = async (e: React.DragEvent, targetStage: string) => {
        e.preventDefault();
        setDragOverStage(null);
        if (!stageAction.allowed) return;
        if (!draggedLeadId) return;
        const lead = getLeadFromStages(draggedLeadId);
        setDraggedLeadId(null);
        setIsDragging(false);
        if (!lead) return;
        if (getStageKind(lead.pipeId, targetStage) === 'loss') { setLossDialog({ lead, targetStage }); return; }
        const allowedNext = getAllowedNextStagesForLead(lead);
        if (allowedNext.length > 0 && !allowedNext.includes(targetStage)) return;
        const isOfficialReturn = lead.availableTransitions?.some(
            (transition) => transition.stageName === targetStage && transition.kind === 'return',
        );
        if (isOfficialReturn) {
            await moveWithoutForm(lead, targetStage);
            return;
        }
        const shouldCreateClient = pipeDetailByPipeId[lead.pipeId]?.createClientOnFinalStage !== false;
        if (getStageKind(lead.pipeId, targetStage) === 'win' && shouldCreateClient) { handleOpenConversion(lead, targetStage); return; }
        const unitStageFields = buildStageTransitionFields(
            getStageFields(lead.pipeId, lead.stage),
            getStageFields(lead.pipeId, targetStage),
        ).fields;
        setStageChangeModal({ lead, targetStage });
        const defaults: Record<string, unknown> = { kanbanObservation: '' };
        const byKey = new Map<string, { type?: string; url?: string; value?: unknown }>();
        for (const entry of getNormalizedCustomFields(lead)) byKey.set(entry.key, entry);
        unitStageFields.forEach((f) => {
            const entry = byKey.get(f.key);
            const existing = entry?.type === 'attachment' ? getAttachmentFormValue(entry) || undefined : entry?.value;
            if (existing !== undefined) defaults[f.key] = existing;
            else if (f.type === 'checkbox') defaults[f.key] = false;
        });
        resetStageChange(defaults);
    };
    const canMutateSelectedPipe = !selectedPipeId || canEditPipe(selectedPipeId);
    const newLeadConfig = {
        show: createLeadAction.allowed && canMutateSelectedPipe,
        disabled: !createLeadAction.allowed || !canMutateSelectedPipe,
        title: !createLeadAction.allowed
            ? createLeadAction.hint
            : !canMutateSelectedPipe
              ? 'Sem permissão para criar leads neste funil.'
              : undefined,
    };
    const dragEnabled = Boolean(selectedPipeId) && stageAction.allowed && canEditPipe(selectedPipeId);

    /** Status follows the configured destination stage. */
    const buildStageMoveUpdate = (lead: Lead, targetStage: string) => ({
        stage: targetStage,
        ...(getStageKind(lead.pipeId, targetStage) === 'win' ? { status: LeadStatus.CLIENTE } : {}),
    });

    const onConfirmStageChange = async (data: Record<string, unknown>) => {
        if (!stageChangeModal) return;
        const { lead, targetStage } = stageChangeModal;
        const sourceStage = lead.stage;
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
        const updatedLead = await updateLead(lead.id, {
            stage: targetStage,
            customFields: newEntries,
            kanbanObservation: String(data.kanbanObservation ?? ''),
        });
        if (temperatureFilter) {
            setStageChangeModal(null);
            toast.success(`Lead movido para "${targetStage}".`);
            handleRefreshLeads();
            return;
        }
        await refreshStagesAfterMove(sourceStage, updatedLead.stage ?? targetStage);
        setStageChangeModal(null);
        toast.success(`Lead movido para "${targetStage}".`);
    };

    const handleFilterChange = (period: FilterPeriod, options?: DateFilterOptions) => { setDateFilter(period); setFilterOptions(options); };
    const evolucaoLeads = totalLeadsPeriodoA !== null && crmSummary ? formatEvolucao(totalLeadsPeriodoA, crmSummary.total) : null;

    return (
        <div className="space-y-6">
            {selectedPipeId && <DateFilterBar period={dateFilter} onFilterChange={handleFilterChange} />}
            {selectedPipeId && (
                <>
                    {isTwoIntervals && totalLeadsPeriodoA !== null && (
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm font-medium text-gray-500">Comparativo de leads</p>
                            <p className="text-base font-bold text-gray-800">P1: {totalLeadsPeriodoA} · P2: {crmSummary?.total ?? '—'} · Evolução {evolucaoLeads}</p>
                        </div>
                    )}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                        <div className="flex items-center gap-4 min-w-0">
                            <button
                                type="button"
                                onClick={() => navigate(AppPath.CRM)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900 shrink-0"
                                title="Voltar para seleção de pipe"
                                aria-label="Voltar para seleção de pipe"
                            >
                                <ChevronLeft size={22} />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-xl font-bold text-gray-900 leading-tight truncate">
                                    {selectedPipe?.name || 'Pipeline'}
                                </h1>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                                    <span>
                                        <span className="text-gray-500">Leads:</span>{' '}
                                        <strong className="font-semibold tabular-nums text-gray-900">
                                            {crmSummary?.total ?? '—'}
                                        </strong>
                                    </span>
                                    <span>
                                        <span className="text-gray-500">Oportunidades:</span>{' '}
                                        <strong className="font-semibold tabular-nums text-gray-900">
                                            {crmSummary?.opportunities ?? '—'}
                                        </strong>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
            {!selectedPipeId ? (
                <CRMPipeGrid
                    pipes={visiblePipes}
                    onSelectPipe={(id) => {
                        const pipe = visiblePipes.find((p) => p.id === id);
                        navigate(getCRMPipePath(pipe?.slug ?? id));
                    }}
                    onNavigateToCreatePipe={() => navigate(AppPath.CRIAR_PIPE)}
                    onNavigateToPipeSettings={(pipeId) => {
                        if (!canEditPipe(pipeId)) return;
                        navigate(getPipeSettingsPath(pipeId));
                    }}
                    isLoading={useTenantStore.getState().isLoading}
                />
            ) : (
                <>
                    {!createLeadAction.allowed && (
                        <div className="px-4">
                            <PermissionFeedback message={createLeadAction.hint} />
                        </div>
                    )}
                    {!stageAction.allowed && (
                        <div className="px-4">
                            <PermissionFeedback message={stageAction.hint} />
                        </div>
                    )}
                    <CRMKanbanView
                        stages={kanbanStagesOrdered}
                        leadsByStageData={leadsByStageData}
                        loadingByStage={loadingByStage}
                        errorsByStage={errorsByStage}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        onSearch={handleSearchLeads}
                        onRefresh={handleRefreshLeads}
                        onNewLead={() => createLeadAction.allowed && setIsCreateModalOpen(true)}
                        newLeadConfig={newLeadConfig}
                        dragEnabled={dragEnabled}
                        filterSlot={(
                            <CRMFilterBar
                                pipeLabels={pipeLabels}
                                appliedLabelId={appliedLabelId}
                                onAppliedLabelIdChange={setAppliedLabelId}
                                temperatureFilter={temperatureFilter}
                                onTemperatureFilterChange={setTemperatureFilter}
                                usersList={usersList}
                                selectedOwnerUserId={selectedOwnerUserId}
                                onSelectedOwnerUserIdChange={setSelectedOwnerUserId}
                                dateFieldFilter={dateFieldFilter}
                                onDateFieldFilterChange={setDateFieldFilter}
                                originFilter={originFilter}
                                onOriginFilterChange={setOriginFilter}
                                sourceSubtypeFilter={sourceSubtypeFilter}
                                onSourceSubtypeFilterChange={setSourceSubtypeFilter}
                                campaignIdFilter={campaignIdFilter}
                                onCampaignIdFilterChange={setCampaignIdFilter}
                                campaigns={campaigns}
                                partnerIdFilter={partnerIdFilter}
                                onPartnerIdFilterChange={setPartnerIdFilter}
                                partners={partners}
                                productIdFilter={productIdFilter}
                                onProductIdFilterChange={setProductIdFilter}
                                products={products}
                                existingClientFilter={existingClientFilter}
                                onExistingClientFilterChange={setExistingClientFilter}
                            />
                        )}
                        selectedPipeId={selectedPipeId}
                        pipes={visiblePipes}
                        getStageLeads={getStageLeads}
                        getLeadFromStages={getLeadFromStages}
                        getStageKind={getStageKind}
                        getNextStages={(pipeId, stage) => {
                            const dragged = draggedLeadId ? getLeadFromStages(draggedLeadId) : undefined;
                            return dragged ? getAllowedNextStagesForLead(dragged) : getNextStages(pipeId, stage);
                        }}
                        loadStagePage={loadStagePage}
                        draggedLeadId={draggedLeadId}
                        isDragging={isDragging}
                        dragOverStage={dragOverStage}
                        handleDragStart={handleDragStart}
                        handleDragEnd={handleDragEnd}
                        handleDragOver={handleDragOver}
                        handleDrop={handleDrop}
                        navigate={navigate}
                        getLeadDetailPath={getLeadDetailPath}
                        settingsLoaded={settingsLoaded}
                        settingsLoading={settingsLoading}
                        pipeFlowLoaded={pipeFlowLoaded}
                    />
                </>
            )}
            <NewLeadModal
                isOpen={isCreateModalOpen}
                onClose={handleCloseCreateModal}
                onSubmit={handleSubmitLead(onCreateLead)}
                register={registerLead}
                control={controlLead}
                errors={errorsLead}
                setValue={setLeadValue}
                isFromPartner={isFromPartner}
                setIsFromPartner={setIsFromPartner}
                isBroughtByStaff={isBroughtByStaff}
                setIsBroughtByStaff={setIsBroughtByStaff}
                partners={partners}
                usersList={usersList}
                user={user}
                products={products.filter(product => product.pipeId === selectedPipeId)}
                campaigns={campaigns}
                createLeadFields={createLeadDynamicFields}
                step={leadModalStep}
                hasAdditionalFields={hasLeadExtraFields}
                onContinueToStep2={handleContinueToLeadStep2}
                onBackToStep1={() => setLeadModalStep(1)}
                canAssignStaff={canAssignRegisteredByStaff}
                step1Rules={leadStep1Rules}
                singleStep={isContabilidadePipe}
                successMessage={leadSuccessMessage}
                onDismissSuccessMessage={handleCloseCreateModal}
            />
            {lossDialog && <LeadLossDialog key={lossDialog.lead.id} lead={lossDialog.lead} targetStage={lossDialog.targetStage}
                onClose={() => setLossDialog(null)} onSaved={handleRefreshLeads} />}
            <StageChangeModal
                isOpen={!!stageChangeModal}
                lead={stageChangeModal?.lead ?? null}
                targetStage={stageChangeModal?.targetStage ?? null}
                fields={stageChangeFields}
                register={registerStageChange}
                control={controlStageChange}
                errors={errorsStageChange}
                uploadingAttachmentKey={uploadingAttachmentKey}
                setUploadingAttachmentKey={setUploadingAttachmentKey}
                onConfirm={handleSubmitStageChange(onConfirmStageChange)}
                onClose={handleCloseStageChangeModal}
                hideObservation={false}
            />
            <ConversionModal
                isOpen={isConversionModalOpen && !!leadToConvert}
                lead={leadToConvert}
                register={registerConv}
                control={controlConv}
                errors={errorsConv}
                onSubmit={handleSubmitConv(onConfirmConversion)}
                onClose={handleCloseConversionModal}
            />
        </div>
    );
};
