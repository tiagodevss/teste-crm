import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Lead, FieldConfig, CustomFieldEntry } from '../../../types';
import {
    getAttachmentFormValue,
    getNormalizedCustomFields,
    mergeCustomFieldEntriesForFields,
} from '../../../utils/leadCustomFields';
import { useCRMStore } from '../store';
import { editLeadSchema, buildDynamicSchema } from '../schemas';
import type { EditLeadFormData } from '../schemas';
import { EDIT_LEAD_DEFAULT_VALUES } from '../constants';

export interface UseLeadDetailFormsParams {
    lead: Lead | null;
    products: { id: string; name: string; price: number }[];
    /** Campos fixos do pipe (nível pipe) para edição no modal. */
    pipeLevelFields: FieldConfig[];
    refreshLeadIfFetchedById: () => void;
    isEditLeadModalOpen: boolean;
    onEditLeadModalClose: () => void;
}

export function useLeadDetailForms({
    lead,
    products,
    pipeLevelFields,
    refreshLeadIfFetchedById,
    isEditLeadModalOpen,
    onEditLeadModalClose,
}: UseLeadDetailFormsParams) {
    const { updateLead } = useCRMStore();

    const editLeadSchemaCombined = useMemo(() => {
        if (!pipeLevelFields.length) return editLeadSchema;
        return z.intersection(editLeadSchema, buildDynamicSchema(pipeLevelFields));
    }, [pipeLevelFields]);

    const editForm = useForm<EditLeadFormData & Record<string, unknown>>({
        resolver: zodResolver(editLeadSchemaCombined),
        defaultValues: EDIT_LEAD_DEFAULT_VALUES,
    });

    useEffect(() => {
        if (isEditLeadModalOpen && lead) {
            const base: EditLeadFormData & Record<string, unknown> = {
                name: lead.name ?? '',
                company: lead.company ?? '',
                phone: lead.phone ?? '',
                email: lead.email ?? '',
                address: lead.address ?? '',
                productId: lead.productId ?? '',
                campaignId: lead.campaignId ?? '',
                partnerId: lead.partnerId ?? '',
                ownerUserId: lead.ownerUserId ?? '',
            };
            const byKey = new Map<string, CustomFieldEntry>();
            for (const e of getNormalizedCustomFields(lead)) byKey.set(e.key, e);
            for (const f of pipeLevelFields) {
                const entry = byKey.get(f.key);
                const existing = entry?.type === 'attachment' ? getAttachmentFormValue(entry) || undefined : entry?.value;
                if (existing !== undefined) base[f.key] = existing;
                else if (f.type === 'checkbox') base[f.key] = false;
                else base[f.key] = '';
            }
            editForm.reset(base);
        }
    }, [isEditLeadModalOpen, lead, pipeLevelFields, editForm.reset]);

    const handleSaveEditLead = async (data: EditLeadFormData & Record<string, unknown>) => {
        if (!lead) return;
        const product = products.find((p) => p.id === data.productId);
        const normalized = getNormalizedCustomFields(lead);
        const nextCustomFields = mergeCustomFieldEntriesForFields(
            normalized as CustomFieldEntry[],
            pipeLevelFields,
            data,
            lead.stage,
        );
        await updateLead(lead.id, {
            name: data.name,
            company: data.company || undefined,
            phone: data.phone || undefined,
            email: data.email || undefined,
            address: data.address || undefined,
            productId: data.productId || undefined,
            productName: product?.name,
            campaignId: data.campaignId || undefined,
            partnerId: data.partnerId || undefined,
            ownerUserId: data.ownerUserId || undefined,
            customFields: nextCustomFields,
        });
        refreshLeadIfFetchedById();
        onEditLeadModalClose();
    };

    return {
        editForm: {
            register: editForm.register,
            control: editForm.control,
            errors: editForm.formState.errors,
            handleSubmit: editForm.handleSubmit,
            handleSaveEditLead,
            pipeLevelFields,
        },
    };
}
