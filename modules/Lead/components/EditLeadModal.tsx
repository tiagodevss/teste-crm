import React from 'react';
import { Modal, ModalHeader, ModalFooter } from '../../../components/ui/Modal';
import { FormInput, FormAutocomplete } from '../../../components/ui/FormInputs';
import type { UseFormRegister, Control, FieldErrors } from 'react-hook-form';
import type { EditLeadFormData } from '../schemas';
import type { FieldConfig } from '../../../types';
import { DynamicFieldRenderer } from '../../../components/DynamicFieldRenderer';

export interface EditLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
    register: UseFormRegister<EditLeadFormData & Record<string, unknown>>;
    control: Control<EditLeadFormData & Record<string, unknown>>;
    errors: FieldErrors<EditLeadFormData & Record<string, unknown>>;
    products: { id: string; name: string }[];
    campaigns: { id: string; name: string }[];
    partners: { id: string; name: string }[];
    users?: { id: string; name: string }[];
    pipeLevelFields: FieldConfig[];
    uploadingAttachmentKey: string | null;
    setUploadingAttachmentKey: (key: string | null) => void;
}

export function EditLeadModal({
    isOpen,
    onClose,
    onSubmit,
    register,
    control,
    errors,
    products,
    campaigns,
    partners,
    users,
    pipeLevelFields,
    uploadingAttachmentKey,
    setUploadingAttachmentKey,
}: EditLeadModalProps) {
    const wide = pipeLevelFields.length > 0;
    return (
        <Modal isOpen={isOpen} onClose={onClose} contentClassName={wide ? 'max-w-2xl' : 'max-w-lg'}>
            <form onSubmit={onSubmit}>
                <ModalHeader title="Editar lead" onClose={onClose} />
                <div className="px-6 pb-4 sm:p-6 sm:pb-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <FormInput label="Nome / Razão Social" name="name" register={register} errors={errors} required placeholder="Ex: Empresa Ltda ou Nome Completo" />
                    <FormInput label="Empresa" name="company" register={register} errors={errors} placeholder="Razão social" />
                    <FormInput label="Telefone" name="phone" register={register} errors={errors} control={control} phone placeholder="(00) 0000-0000 ou (00) 90000-0000" />
                    <FormInput label="E-mail" name="email" type="email" register={register} errors={errors} placeholder="email@exemplo.com" />
                    <FormInput label="Endereço" name="address" register={register} errors={errors} placeholder="Endereço completo" />
                    <FormAutocomplete
                        label="Produto"
                        name="productId"
                        control={control}
                        errors={errors}
                        required
                        options={products.map((p) => ({ label: p.name, value: p.id }))}
                        placeholder="Selecione o produto..."
                    />
                    <FormAutocomplete
                        label="Campanha (opcional)"
                        name="campaignId"
                        control={control}
                        errors={errors}
                        options={campaigns.map((c) => ({ label: c.name, value: c.id }))}
                        placeholder="Selecione uma campanha ativa..."
                    />
                    <FormAutocomplete
                        label="Parceiro (opcional)"
                        name="partnerId"
                        control={control}
                        errors={errors}
                        options={partners.map((p) => ({ label: p.name, value: p.id }))}
                        placeholder="Selecione um parceiro..."
                    />
                    {users && users.length > 0 && (
                        <FormAutocomplete
                            label="Responsável"
                            name="ownerUserId"
                            control={control}
                            errors={errors}
                            options={users.map((u) => ({ label: u.name, value: u.id }))}
                            placeholder="Selecione o responsável..."
                        />
                    )}
                    {pipeLevelFields.length > 0 && (
                        <div className="pt-2 border-t border-gray-200 space-y-4" role="group" aria-label="Campos do pipeline">
                            <p className="text-sm font-semibold text-gray-800">Campos do pipeline</p>
                            {pipeLevelFields.map((field) => (
                                <div key={field.key}>
                                    <DynamicFieldRenderer
                                        field={field}
                                        register={register as unknown as UseFormRegister<Record<string, unknown>>}
                                        control={control as unknown as Control<Record<string, unknown>>}
                                        errors={errors as FieldErrors<Record<string, unknown>>}
                                        uploadingAttachmentKey={uploadingAttachmentKey}
                                        setUploadingAttachmentKey={setUploadingAttachmentKey}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <ModalFooter>
                    <button type="submit" className="px-5 py-2.5 bg-salesforce-blue text-white rounded-lg font-semibold hover:bg-salesforce-hover">
                        Salvar
                    </button>
                    <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50">
                        Cancelar
                    </button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
