import { isDemo } from '../../../config/demo';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Lead } from '../../../types';
import { useClientsStore } from '../../Clients/store';
import { editClientSchema } from '../schemas';
import type { EditClientFormData } from '../schemas';
import { EDIT_CLIENT_DEFAULT_VALUES } from '../constants';

export interface UseClientDetailFormsParams {
    clientDetail: { id: string; name?: string; company?: string; phone?: string; email?: string; address?: string; city?: string; ramo?: string; cpfCnpj?: string; responsibleUserId?: string; productId?: string; productName?: string } | null;
    fetchClientById: (id: string) => Promise<Lead | null>;
    isEditModalOpen: boolean;
    onEditModalClose: () => void;
}

export function useClientDetailForms({
    clientDetail,
    fetchClientById,
    isEditModalOpen,
    onEditModalClose,
}: UseClientDetailFormsParams) {
    const { updateClient } = useClientsStore();

    const editForm = useForm<EditClientFormData>({
        resolver: zodResolver(editClientSchema),
        defaultValues: EDIT_CLIENT_DEFAULT_VALUES,
    });

    useEffect(() => {
        if (isEditModalOpen && clientDetail) {
            editForm.reset({
                name: clientDetail.name ?? '',
                company: clientDetail.company ?? '',
                phone: clientDetail.phone ?? '',
                email: clientDetail.email ?? '',
                address: clientDetail.address ?? '',
                city: clientDetail.city ?? '',
                ramo: clientDetail.ramo ?? '',
                cpfCnpj: clientDetail.cpfCnpj ?? '',
                responsibleUserId: clientDetail.responsibleUserId ?? '',
            });
        }
    }, [isEditModalOpen, clientDetail, editForm.reset]);

    const handleSaveEdit = async (data: EditClientFormData) => {
        if (!clientDetail) return;
        try {
            const updated = await updateClient(clientDetail.id, {
                name: data.name,
                company: data.company?.trim() || (isDemo ? '' : undefined),
                phone: data.phone?.trim() || (isDemo ? '' : undefined),
                email: data.email?.trim() || (isDemo ? '' : undefined),
                address: data.address?.trim() || (isDemo ? '' : undefined),
                city: data.city?.trim() || (isDemo ? '' : undefined),
                ramo: data.ramo?.trim() || (isDemo ? '' : undefined),
                cpfCnpj: data.cpfCnpj?.trim() || (isDemo ? '' : undefined),
                responsibleUserId: data.responsibleUserId || undefined,
            });
            if (!updated) {
                toast.error('Não foi possível salvar as alterações. Tente novamente.');
                return;
            }
            await fetchClientById(clientDetail.id);
            onEditModalClose();
            toast.success('Cliente atualizado.');
        } catch {
            toast.error('Não foi possível salvar as alterações. Tente novamente.');
        }
    };

    return {
        editForm: {
            register: editForm.register,
            control: editForm.control,
            errors: editForm.formState.errors,
            formState: editForm.formState,
            handleSubmit: editForm.handleSubmit,
            handleSaveEdit,
        },
    };
}
