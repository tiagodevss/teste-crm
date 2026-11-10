import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { Lead } from '../../../types';
import {
    useCRMStore,
    useTenantStore,
    useSettingsStore,
    useProductStore,
    usePartnerStore,
} from '../store';
import { AppPath, getIdFromPathname } from '../../../routes';

export function useLeadDetail() {
    const { pathname } = useLocation();
    const leadId = pathname.startsWith(`${AppPath.LEAD}/`) ? getIdFromPathname(pathname) : null;

    const {
        leads,
        campaigns,
        fetchLeadById,
        fetchCampaigns,
    } = useCRMStore();
    const { pipes } = useTenantStore();
    const { fetchSettings, getStageFields, getPipeLevelFields, getPipelineStagesOrdered, getNextStages, getNextStageOptions, getStageKind, fetchPipeFlow } = useSettingsStore();
    const { products, fetchProducts } = useProductStore();
    const { partners, fetchPartners } = usePartnerStore();

    const [leadFetchedById, setLeadFetchedById] = useState<Lead | null>(null);
    const [isFetchingLeadById, setIsFetchingLeadById] = useState(true);
    const [leadDetailError, setLeadDetailError] = useState<string | null>(null);
    const requestSequence = useRef(0);
    const currentLeadId = useRef(leadId);
    currentLeadId.current = leadId;
    /** Detalhe buscado por ID tem precedência sobre a lista (timeline, comentários completos). */
    const lead = useMemo(() => {
        if (!leadId) return null;
        if (leadFetchedById?.id === leadId) return leadFetchedById;
        return leads.find((l) => l.id === leadId) ?? null;
    }, [leads, leadId, leadFetchedById]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const refreshLeadIfFetchedById = useCallback(async () => {
        if (!leadId) return;
        const sequence = ++requestSequence.current;
        setIsFetchingLeadById(true);
        setLeadDetailError(null);
        try {
            const fetched = await fetchLeadById(leadId);
            if (requestSequence.current !== sequence || currentLeadId.current !== leadId) return;
            if (fetched) setLeadFetchedById(fetched);
            else setLeadDetailError('Não foi possível carregar o cadastro completo. Verifique seu acesso e tente novamente.');
        } catch {
            if (requestSequence.current === sequence && currentLeadId.current === leadId) {
                setLeadDetailError('Não foi possível atualizar o cadastro. Tente novamente.');
            }
        } finally {
            if (requestSequence.current === sequence && currentLeadId.current === leadId) setIsFetchingLeadById(false);
        }
    }, [leadId, fetchLeadById]);

    // List responses are summaries. Always load the complete, current history.
    useEffect(() => {
        setLeadFetchedById(null);
        if (leadId) void refreshLeadIfFetchedById();
        else setIsFetchingLeadById(false);
        return () => { requestSequence.current += 1; };
    }, [leadId, refreshLeadIfFetchedById]);

    const isLeadDetailLoading = Boolean(leadId && !lead && isFetchingLeadById);

    useEffect(() => {
        fetchProducts({ page: 1, limit: 100 });
    }, [fetchProducts]);

    useEffect(() => {
        fetchCampaigns({ page: 1, limit: 200 });
        fetchPartners();
    }, [fetchCampaigns, fetchPartners]);

    return {
        lead,
        isLeadDetailLoading,
        leadDetailError,
        leadId,
        products,
        campaigns,
        partners,
        pipes,
        leadFetchedById,
        setLeadFetchedById,
        refreshLeadIfFetchedById,
        fetchProducts,
        getStageFields,
        getPipeLevelFields,
        getPipelineStagesOrdered,
        getNextStages,
        getNextStageOptions,
        getStageKind,
        fetchPipeFlow,
        fetchLeadById,
    };
}
