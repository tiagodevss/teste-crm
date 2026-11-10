import React, { useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import { Lead, FieldConfig } from '../../../types';
import { Modal, ModalHeader, ModalFooter } from '../../../components/ui/Modal';
import { DynamicFieldRenderer } from '../../../components/DynamicFieldRenderer';
import { useUserStore } from '../../Login/store/useUserStore';
import type { UseFormRegister, Control, FieldErrors } from 'react-hook-form';
import { filterVisibleFields, getEditableFieldKeys } from '../../../lib/field-rules';
import { buildFieldRuleContext } from '../../../lib/field-rule-context';

export interface StageChangeModalProps {
    isOpen: boolean;
    lead: Lead | null;
    targetStage: string | null;
    fields: FieldConfig[];
    register: UseFormRegister<Record<string, unknown>>;
    control: Control<Record<string, unknown>>;
    errors: FieldErrors;
    uploadingAttachmentKey: string | null;
    setUploadingAttachmentKey: (key: string | null) => void;
    onConfirm: (e?: React.BaseSyntheticEvent) => Promise<void>;
    onClose: () => void;

    hideObservation?: boolean;

}

export function StageChangeModal({
    isOpen,
    lead,
    targetStage,
    fields,
    register,
    control,
    errors,
    uploadingAttachmentKey,
    setUploadingAttachmentKey,
    onConfirm,
    onClose,
    hideObservation = false,
}: StageChangeModalProps) {
    const watchedValues = useWatch({ control }) as Record<string, unknown>;
    const userProfileCode = useUserStore((state) => state.user?.profile?.code ?? state.user?.role);

    const ruleCtx = useMemo(() => {
        const nativeFromLead: Record<string, unknown> = lead
            ? {
                  name: lead.name,
                  company: lead.company ?? null,
                  value: lead.value ?? null,
                  cpfCnpj: lead.cpfCnpj ?? null,
                  phone: lead.phone ?? null,
                  email: lead.email ?? null,
                  address: lead.address ?? null,
                  productName: lead.productName ?? null,
                  productId: lead.productId ?? null,
                  campaignId: lead.campaignId ?? null,
                  partnerId: lead.partnerId ?? null,
                  ownerUserId: lead.ownerUserId ?? null,
                  nomeRazaoSocial: lead.name,
                  telefoneWhatsapp: lead.phone ?? null,
                  valorSolicitado: lead.value ?? null,
              }
            : {};
        const fromLead: Record<string, unknown> = {};
        for (const entry of lead?.customFields ?? []) {
            fromLead[entry.key] = entry.type === 'attachment' ? entry.url ?? null : entry.value ?? null;
        }
        return buildFieldRuleContext(fields, {
            ...nativeFromLead,
            ...fromLead,
            ...(watchedValues ?? {}),
        }, {
            currentStage: targetStage ?? '',
            userProfileCode,
        });
    }, [lead, watchedValues, targetStage, userProfileCode, fields]);

    const visibleFields = useMemo(() => filterVisibleFields(fields, ruleCtx), [fields, ruleCtx]);
    const editableKeys = useMemo(() => getEditableFieldKeys(fields, ruleCtx), [fields, ruleCtx]);

    if (!lead || !targetStage) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} contentClassName="max-w-lg">
            <form onSubmit={onConfirm}>
                <ModalHeader
                    title={`Informações para etapa: ${targetStage}`}
                    onClose={onClose}
                />
                <div className="px-6 pb-4 sm:p-6 sm:pb-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <p className="text-sm text-gray-600">
                        Preencha os campos abaixo para mover <strong>{lead.name}</strong> para a etapa &quot;{targetStage}&quot;.
                    </p>
                    {!hideObservation && (
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Observação da movimentação <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            {...register('kanbanObservation')}
                            rows={4}
                            placeholder="Descreva o motivo desta movimentação..."
                            className={`block w-full border rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 transition-all sm:text-sm bg-white text-gray-900 placeholder-gray-400 resize-y min-h-[96px] ${
                                errors.kanbanObservation
                                    ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                                    : 'border-gray-300 focus:ring-salesforce-blue/20 focus:border-salesforce-blue'
                            }`}
                        />
                        {errors.kanbanObservation && (
                            <p className="mt-1 text-xs text-red-600">
                                {String(errors.kanbanObservation.message)}
                            </p>
                        )}
                    </div>
                    )}
                    <div className="space-y-4">
                        {visibleFields.map((field) => (
                            <div key={field.key} className={!editableKeys.has(field.key) ? 'pointer-events-none opacity-60' : undefined}>
                                <DynamicFieldRenderer
                                                                    field={field}
                                    register={register}
                                    control={control}
                                    errors={errors}
                                    uploadingAttachmentKey={uploadingAttachmentKey}
                                    setUploadingAttachmentKey={setUploadingAttachmentKey}
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <ModalFooter>
                    <button
                        type="submit"
                        className="w-full sm:w-auto inline-flex justify-center rounded-lg border border-transparent shadow-sm px-5 py-2.5 bg-salesforce-blue text-base font-bold text-white hover:bg-salesforce-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-salesforce-blue sm:text-sm transition-colors"
                    >
                        Confirmar e mover
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-5 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm transition-colors"
                    >
                        Cancelar
                    </button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
