import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal, ModalHeader, ModalFooter } from '../../../components/ui/Modal';
import { NewLeadFormContent } from '../../../components/NewLeadFormContent';
import type { UseFormRegister, Control, FieldErrors, UseFormSetValue } from 'react-hook-form';
import type { UserProfile, Product, Campaign, FieldConfig } from '../../../types';
import type { LeadFormStep1Rules } from '../../../lib/leadFormProductRules';

export interface NewLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
    register: UseFormRegister<Record<string, unknown>>;
    control: Control<Record<string, unknown>>;
    errors: FieldErrors;
    setValue: UseFormSetValue<Record<string, unknown>>;
    isFromPartner: boolean;
    setIsFromPartner: (v: boolean) => void;
    isBroughtByStaff: boolean;
    setIsBroughtByStaff: (v: boolean) => void;
    partners: { id: string; name: string }[];
    usersList: UserProfile[];
    user: UserProfile | null;
    products: Product[];
    campaigns: Campaign[];
    createLeadFields: FieldConfig[];
    step: 1 | 2;
    canAssignStaff: boolean;
    hasAdditionalFields: boolean;
    onContinueToStep2: () => void | Promise<void>;
    onBackToStep1: () => void;
    step1Rules?: LeadFormStep1Rules;
    /** Cadastro da Contabilidade é feito integralmente em uma única tela. */
    singleStep?: boolean;
    successMessage?: string | null;
    onDismissSuccessMessage?: () => void;
}

export function NewLeadModal({
    isOpen,
    onClose,
    onSubmit,
    register,
    control,
    errors,
    setValue,
    isFromPartner,
    setIsFromPartner,
    isBroughtByStaff,
    setIsBroughtByStaff,
    partners,
    usersList,
    user,
    products,
    campaigns,
    createLeadFields,
    step,
    canAssignStaff,
    hasAdditionalFields,
    onContinueToStep2,
    onBackToStep1,
    step1Rules,
    singleStep = false,
    successMessage,
    onDismissSuccessMessage,
}: NewLeadModalProps) {
    const handleFormSubmit = async (e?: React.BaseSyntheticEvent) => {
        if (!singleStep && step === 1 && hasAdditionalFields) {
            e?.preventDefault?.();
            await onContinueToStep2();
            return;
        }

        await onSubmit(e);
    };

    if (successMessage) {
        return (
            <Modal
                isOpen={isOpen}
                onClose={onDismissSuccessMessage ?? onClose}
                contentClassName="max-w-lg"
                closeOnBackdropClick={false}
            >
                <ModalHeader title="Lead salvo" onClose={onDismissSuccessMessage ?? onClose} />
                <div className="px-6 py-5 space-y-3">
                    <p className="text-sm text-gray-800 leading-relaxed" role="status">
                        {successMessage}
                    </p>
                </div>
                <ModalFooter>
                    <button
                        type="button"
                        onClick={onDismissSuccessMessage ?? onClose}
                        className="w-full sm:w-auto inline-flex justify-center rounded-lg border border-transparent shadow-sm px-5 py-2.5 bg-salesforce-blue text-base font-bold text-white hover:bg-salesforce-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-salesforce-blue sm:text-sm transition-colors"
                    >
                        OK
                    </button>
                </ModalFooter>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} contentClassName="max-w-2xl">
            <form onSubmit={handleFormSubmit}>
                <ModalHeader title="Novo Lead" onClose={onClose} />

                {hasAdditionalFields && !singleStep && (
                    <div className="border-b border-gray-100 bg-white px-6 py-3.5">
                        <ol className="flex items-center" aria-label="Etapas do cadastro do lead">
                            <li className="flex items-center gap-2" aria-current={step === 1 ? 'step' : undefined}>
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-salesforce-blue text-xs font-bold text-white">
                                    1
                                </span>
                                <span className={`hidden text-xs font-semibold sm:block ${step === 1 ? 'text-salesforce-blue' : 'text-gray-500'}`}>
                                    Identificação
                                </span>
                            </li>
                            <li className="mx-3 h-0.5 flex-1 rounded-full bg-gray-200" aria-hidden="true">
                                <span className={`block h-full rounded-full transition-colors ${step === 2 ? 'bg-salesforce-blue' : 'bg-transparent'}`} />
                            </li>
                            <li className="flex items-center gap-2" aria-current={step === 2 ? 'step' : undefined}>
                                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${step === 2 ? 'bg-salesforce-blue text-white' : 'bg-gray-200 text-gray-600'}`}>
                                    2
                                </span>
                                <span className={`hidden text-xs font-semibold sm:block ${step === 2 ? 'text-salesforce-blue' : 'text-gray-500'}`}>
                                    Qualificação inicial
                                </span>
                            </li>
                        </ol>
                    </div>
                )}

                <NewLeadFormContent
                    register={register}
                    control={control}
                    errors={errors}
                    setValue={setValue}
                    isFromPartner={isFromPartner}
                    setIsFromPartner={setIsFromPartner}
                    isBroughtByStaff={isBroughtByStaff}
                    setIsBroughtByStaff={setIsBroughtByStaff}
                    partners={partners}
                    usersList={usersList}
                    user={user}
                    products={products}
                    campaigns={campaigns}
                    createLeadFields={createLeadFields}
                    step={step}
                    canAssignStaff={canAssignStaff}
                    step1Rules={step1Rules}
                    quickEntry
                    accountingEntry={singleStep}
                />

                <ModalFooter>
                    {step === 1 || singleStep ? (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full sm:w-auto inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-5 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 sm:text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                            {hasAdditionalFields && !singleStep ? (
                                <button
                                    type="submit"
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-transparent shadow-sm px-5 py-2.5 bg-salesforce-blue text-base font-bold text-white hover:bg-salesforce-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-salesforce-blue sm:text-sm transition-colors"
                                >
                                    Continuar <ChevronRight size={18} aria-hidden="true" />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="w-full sm:w-auto inline-flex justify-center rounded-lg border border-transparent shadow-sm px-5 py-2.5 bg-salesforce-blue text-base font-bold text-white hover:bg-salesforce-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-salesforce-blue sm:text-sm transition-colors"
                                >
                                    Criar lead
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={onBackToStep1}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-1 rounded-lg border border-gray-300 shadow-sm px-5 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 sm:text-sm transition-colors"
                            >
                                <ChevronLeft size={18} aria-hidden="true" /> Voltar
                            </button>
                            <button
                                type="submit"
                                className="w-full sm:w-auto inline-flex justify-center rounded-lg border border-transparent shadow-sm px-5 py-2.5 bg-salesforce-blue text-base font-bold text-white hover:bg-salesforce-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-salesforce-blue sm:text-sm transition-colors"
                            >
                                Criar lead
                            </button>
                        </>
                    )}
                </ModalFooter>
            </form>
        </Modal>
    );
}
