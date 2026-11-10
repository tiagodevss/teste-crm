import React, { useEffect } from 'react';
import { Modal, ModalHeader, ModalFooter } from '../../../components/ui/Modal';
import { FormInput, FormSelect } from '../../../components/ui/FormInputs';
import { useUserStore } from '../../Login/store/useUserStore';
import type { UseFormRegister, Control, FieldErrors } from 'react-hook-form';
import type { EditClientFormData } from '../schemas';

export interface EditClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
    register: UseFormRegister<EditClientFormData>;
    control: Control<EditClientFormData>;
    errors: FieldErrors<EditClientFormData>;
    isSubmitting?: boolean;
}

export function EditClientModal({ isOpen, onClose, onSubmit, register, control, errors, isSubmitting = false }: EditClientModalProps) {
    const { usersList, fetchUsers } = useUserStore();

    useEffect(() => {
        if (isOpen) void fetchUsers({ page: 1, limit: 200 });
    }, [isOpen, fetchUsers]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} contentClassName="max-w-lg">
            <form onSubmit={onSubmit}>
                <ModalHeader title="Editar cliente" onClose={onClose} />
                <div className="px-6 pb-4 sm:p-6 sm:pb-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <FormInput label="Nome" name="name" register={register} errors={errors} required placeholder="Nome ou razão social" />
                    <div className="grid grid-cols-2 gap-3">
                        <FormInput label="Cidade" name="city" register={register} errors={errors} />
                        <FormInput label="Ramo" name="ramo" register={register} errors={errors} />
                    </div>
                    <FormInput label="Empresa" name="company" register={register} errors={errors} placeholder="Razão social" />
                    <FormInput label="CPF/CNPJ" name="cpfCnpj" register={register} errors={errors} placeholder="000.000.000-00" />
                    <FormSelect
                        label="Responsável"
                        name="responsibleUserId"
                        control={control}
                        errors={errors}
                        placeholder="Sem responsável"
                        options={usersList.map((u) => ({ label: u.name, value: u.id }))}
                    />
                    <FormInput label="Telefone" name="phone" register={register} errors={errors} control={control} phone placeholder="(00) 0000-0000 ou (00) 90000-0000" />
                    <FormInput label="E-mail" name="email" type="email" register={register} errors={errors} placeholder="email@exemplo.com" />
                    <FormInput label="Endereço" name="address" register={register} errors={errors} placeholder="Endereço completo" />
                </div>
                <ModalFooter>
                    <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-salesforce-blue text-white rounded-lg font-semibold hover:bg-salesforce-hover disabled:opacity-50">
                        {isSubmitting ? 'Salvando...' : 'Salvar'}
                    </button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
