import React from 'react';
import { X, User, Building, Phone, Mail, AlertCircle } from 'lucide-react';
import { Lead } from '../../../types';
import { FormInput } from '../../../components/ui/FormInputs';
import { Modal, ModalFooter } from '../../../components/ui/Modal';
import { formatPhone } from '../../../utils/formatters';
import type { UseFormRegister, Control, FieldErrors } from 'react-hook-form';
import type { ConversionFormData } from '../schemas';

export interface ConversionModalProps {
    isOpen: boolean;
    lead: Lead | null;
    register: UseFormRegister<ConversionFormData>;
    control: Control<ConversionFormData>;
    errors: FieldErrors<ConversionFormData>;
    onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
    onClose: () => void;
    /** Funis financeiros: observação de movimentação não é solicitada. */
    hideObservation?: boolean;
}

export function ConversionModal({
    isOpen,
    lead,
    register,
    errors,
    onSubmit,
    onClose,
    hideObservation = false,
}: ConversionModalProps) {
    if (!lead || !isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} contentClassName="max-w-4xl w-full min-w-[36rem] max-h-[90vh] overflow-hidden flex flex-col">
            <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50">
                    <div className="px-6 py-4 flex justify-between items-start gap-4">
                        <div className="min-w-0">
                            <h3 id="modal-title" className="font-bold text-gray-800 text-lg">
                                Converter em cliente
                            </h3>
                            <p className="text-sm text-gray-500 mt-0.5 truncate">
                                Transformando {lead.name} em cliente ativo.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                            aria-label="Fechar"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <div className="space-y-5">
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                            <div className="flex gap-3">
                                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden />
                                <p className="text-sm text-amber-800">
                                    {hideObservation
                                        ? 'Para efetivar a conversão, confirme os dados fiscais.'
                                        : 'Para efetivar a conversão, preencha os dados fiscais e a observação da movimentação.'}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 h-fit">
                                <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                    <User size={18} className="text-salesforce-blue" />
                                    Resumo do lead
                                </h4>
                                <dl className="grid grid-cols-1 gap-3 text-sm">
                                    <div className="flex items-start gap-2 text-gray-600">
                                        <User size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                                        <span>
                                            <strong className="text-gray-700">Nome:</strong> {lead.name}
                                        </span>
                                    </div>
                                    {lead.company && (
                                        <div className="flex items-start gap-2 text-gray-600">
                                            <Building size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                                            <span>
                                                <strong className="text-gray-700">Empresa:</strong> {lead.company}
                                            </span>
                                        </div>
                                    )}
                                    {lead.phone && (
                                        <div className="flex items-start gap-2 text-gray-600">
                                            <Phone size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                                            <span>
                                                <strong className="text-gray-700">Telefone:</strong> {formatPhone(lead.phone)}
                                            </span>
                                        </div>
                                    )}
                                    {lead.email && (
                                        <div className="flex items-start gap-2 text-gray-600">
                                            <Mail size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                                            <span>
                                                <strong className="text-gray-700">E-mail:</strong> {lead.email}
                                            </span>
                                        </div>
                                    )}
                                </dl>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                                <h4 className="text-sm font-bold text-gray-700 mb-1">Dados para faturamento</h4>
                                <FormInput
                                    label="CPF ou CNPJ"
                                    name="cpfCnpj"
                                    register={register}
                                    errors={errors}
                                    required
                                    placeholder="000.000.000-00"
                                    autoFocus
                                />
                                <FormInput
                                    label="Endereço completo"
                                    name="address"
                                    register={register}
                                    errors={errors}
                                    placeholder="Rua, número, bairro, cidade, CEP..."
                                />
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
                            </div>
                        </div>
                    </div>
                </div>
                <ModalFooter>
                    <button
                        type="submit"
                        className="inline-flex justify-center rounded-lg border border-transparent shadow-sm px-5 py-2.5 bg-salesforce-blue text-base font-semibold text-white hover:bg-salesforce-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-salesforce-blue/30 transition-colors"
                    >
                        Confirmar conversão
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-5 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm transition-colors"
                    >
                        Cancelar
                    </button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
