import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Modal, ModalFooter, ModalHeader } from '../../../components/ui/Modal';
import { FormAutocomplete, FormDatePicker, FormInput } from '../../../components/ui/FormInputs';
import { LeadStatus, type CustomFieldEntry, type Imobiliaria, type Lead } from '../../../types';
import { creditoLeadSchema, type CreditoLeadFormData } from '../schemas/creditoLead.schema';
import { MunicipioAutocomplete } from './MunicipioAutocomplete';
import { maskCpf } from '../../../utils/cpf';
import { FIELD_KEYS } from '../financeira.constants';

export const CREDITO_SERVICE_LABEL = 'Financiamento Imobiliário';

interface CreditoLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    pipeId: string;
    /** Produto predefinido (`creditoDefaultProductId`); o operador não escolhe o serviço. */
    productId: string;
    /** Primeira etapa do funil (PASTA RECEBIDA). */
    initialStage: string;
    partners: Imobiliaria[];
    createLead: (payload: Partial<Lead>) => Promise<Lead>;
    onCreated: (lead: Lead) => void;
}

const DEFAULT_VALUES: CreditoLeadFormData = {
    name: '',
    phone: '',
    email: '',
    cpf1: '',
    nascimento1: '',
    possuiSegundo: 'NÃO',
    segundoNome: '',
    cpf2: '',
    nascimento2: '',
    localizacao: '',
    agencia: '',
    partnerId: '',
};

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h4 className="border-b border-gray-100 pb-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
            {children}
        </h4>
    );
}

function ReadOnlyField({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <span className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</span>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 min-h-[42px]">
                {value || <span className="text-gray-400">Não informado</span>}
            </div>
        </div>
    );
}

export function CreditoLeadModal({
    isOpen,
    onClose,
    pipeId,
    productId,
    initialStage,
    partners,
    createLead,
    onCreated,
}: CreditoLeadModalProps) {
    const [submitting, setSubmitting] = useState(false);
    const {
        register,
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<CreditoLeadFormData>({
        resolver: zodResolver(creditoLeadSchema),
        defaultValues: DEFAULT_VALUES,
    });

    const possuiSegundo = useWatch({ control, name: 'possuiSegundo' });
    const partnerId = useWatch({ control, name: 'partnerId' });

    useEffect(() => {
        if (!isOpen) reset(DEFAULT_VALUES);
    }, [isOpen, reset]);

    const activePartners = useMemo(() => partners.filter((partner) => partner.active !== false), [partners]);
    const partnerOptions = useMemo(
        () => activePartners.map((partner) => ({ label: partner.name, value: partner.id, sublabel: partner.email })),
        [activePartners],
    );
    const selectedPartner = useMemo(
        () => partners.find((partner) => partner.id === partnerId),
        [partners, partnerId],
    );

    const submit = handleSubmit(async (data) => {
        setSubmitting(true);
        try {
            const entry = (
                key: string,
                label: string,
                type: CustomFieldEntry['type'],
                value: CustomFieldEntry['value'],
            ): CustomFieldEntry => ({ key, label, type, stage: initialStage, value });
            const hasSecond = data.possuiSegundo === 'SIM';
            const customFields: CustomFieldEntry[] = [
                entry(FIELD_KEYS.primeiroProponente, 'Primeiro proponente', 'text', data.name.trim()),
                entry(FIELD_KEYS.celularCliente, 'Celular do cliente', 'phone', data.phone),
                entry(FIELD_KEYS.cpfProponente1, 'CPF do 1º proponente', 'cpf_cnpj', data.cpf1),
                entry(FIELD_KEYS.nascimento1, 'Data de nascimento (1º)', 'date', data.nascimento1),
                entry(FIELD_KEYS.possuiSegundo, 'Possui segundo proponente?', 'select', data.possuiSegundo),
                entry(FIELD_KEYS.localizacao, 'Localização do imóvel', 'text', data.localizacao),
            ];
            if (hasSecond) {
                customFields.push(
                    entry(FIELD_KEYS.segundoProponente, 'Segundo proponente', 'text', data.segundoNome?.trim() ?? ''),
                    entry(FIELD_KEYS.cpfProponente2, 'CPF do 2º proponente', 'cpf_cnpj', data.cpf2 ?? ''),
                    entry(FIELD_KEYS.nascimento2, 'Data de nascimento (2º)', 'date', data.nascimento2 ?? ''),
                );
            }
            if (data.email?.trim()) {
                customFields.push(entry(FIELD_KEYS.emailCliente, 'E-mail do cliente', 'email', data.email.trim()));
            }
            if (data.agencia?.trim()) {
                customFields.push(entry(FIELD_KEYS.agenciaCredito, 'Agência Caixa de vínculo', 'text', data.agencia.trim()));
            }
            if (selectedPartner) {
                // Tipos devem coincidir com a configuração do funil (phone/email); contato ausente
                // do parceiro não é enviado, em vez de ir como null.
                customFields.push(entry(FIELD_KEYS.nomeParceiro, 'Nome do parceiro', 'text', selectedPartner.name));
                if (selectedPartner.phone?.trim()) {
                    customFields.push(entry(FIELD_KEYS.celularCorretor, 'Telefone do corretor', 'phone', selectedPartner.phone.trim()));
                }
                if (selectedPartner.email?.trim()) {
                    customFields.push(entry(FIELD_KEYS.emailCorretor, 'E-mail do corretor', 'email', selectedPartner.email.trim()));
                }
            }
            const payload: Partial<Lead> = {
                name: data.name.trim(),
                phone: data.phone,
                email: data.email?.trim() || undefined,
                cpfCnpj: data.cpf1,
                pipeId,
                productId,
                status: LeadStatus.LEAD,
                stage: initialStage,
                value: 0,
                customFields,
            };
            if (selectedPartner) payload.partnerId = selectedPartner.id;
            const created = await createLead(payload);
            onCreated(created);
        } catch {
            // toast de erro já exibido pela store; o formulário mantém o conteúdo digitado.
        } finally {
            setSubmitting(false);
        }
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} contentClassName="max-w-3xl" closeOnBackdropClick={false}>
            <form onSubmit={submit} noValidate className="flex max-h-[min(85vh,850px)] flex-col">
                <ModalHeader title="Novo lead — Crédito" onClose={onClose} />
                <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                    <section className="space-y-4" aria-labelledby="credito-ident">
                        <SectionTitle>
                            <span id="credito-ident">Identificação e contato</span>
                        </SectionTitle>
                        <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-sm text-blue-900">
                            <span className="font-semibold">Serviço:</span> {CREDITO_SERVICE_LABEL}
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormInput
                                label="Nome do lead / primeiro proponente"
                                name="name"
                                register={register}
                                errors={errors}
                                required
                                placeholder="Nome completo"
                            />
                            <FormInput
                                label="Telefone do cliente"
                                name="phone"
                                type="text"
                                register={register}
                                errors={errors}
                                control={control}
                                required
                                phone
                                placeholder="(00) 90000-0000"
                            />
                            <FormInput
                                label="E-mail do cliente"
                                name="email"
                                type="email"
                                register={register}
                                errors={errors}
                                placeholder="email@exemplo.com"
                            />
                        </div>
                    </section>

                    <section className="space-y-4" aria-labelledby="credito-prop">
                        <SectionTitle>
                            <span id="credito-prop">Proponentes</span>
                        </SectionTitle>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="credito-cpf1" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    CPF do primeiro proponente <span className="text-red-500">*</span>
                                </label>
                                <Controller
                                    name="cpf1"
                                    control={control}
                                    render={({ field }) => (
                                        <input
                                            id="credito-cpf1"
                                            inputMode="numeric"
                                            value={field.value}
                                            onChange={(e) => field.onChange(maskCpf(e.target.value))}
                                            onBlur={field.onBlur}
                                            placeholder="000.000.000-00"
                                            aria-invalid={Boolean(errors.cpf1)}
                                            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 shadow-sm focus:border-salesforce-blue focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20 sm:text-sm"
                                        />
                                    )}
                                />
                                {errors.cpf1?.message && <p className="mt-1 text-xs text-red-600">{errors.cpf1.message}</p>}
                            </div>
                            <FormDatePicker
                                label="Data de nascimento (1º)"
                                name="nascimento1"
                                control={control}
                                errors={errors}
                                required
                            />
                        </div>

                        <fieldset>
                            <legend className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Possui segundo proponente? <span className="text-red-500">*</span>
                            </legend>
                            <div className="flex gap-2" role="radiogroup">
                                {(['SIM', 'NÃO'] as const).map((option) => {
                                    const selected = possuiSegundo === option;
                                    return (
                                        <button
                                            key={option}
                                            type="button"
                                            role="radio"
                                            aria-checked={selected}
                                            onClick={() => setValue('possuiSegundo', option, { shouldValidate: true })}
                                            className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${
                                                selected
                                                    ? 'border-salesforce-blue bg-salesforce-blue text-white'
                                                    : 'border-gray-300 bg-white text-gray-700 hover:border-salesforce-blue'
                                            }`}
                                        >
                                            {option}
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>

                        {possuiSegundo === 'SIM' && (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 animate-fade-in">
                                <FormInput
                                    label="Segundo proponente"
                                    name="segundoNome"
                                    register={register}
                                    errors={errors}
                                    required
                                    placeholder="Nome completo"
                                />
                                <div>
                                    <label htmlFor="credito-cpf2" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        CPF do segundo proponente <span className="text-red-500">*</span>
                                    </label>
                                    <Controller
                                        name="cpf2"
                                        control={control}
                                        render={({ field }) => (
                                            <input
                                                id="credito-cpf2"
                                                inputMode="numeric"
                                                value={field.value ?? ''}
                                                onChange={(e) => field.onChange(maskCpf(e.target.value))}
                                                onBlur={field.onBlur}
                                                placeholder="000.000.000-00"
                                                aria-invalid={Boolean(errors.cpf2)}
                                                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 shadow-sm focus:border-salesforce-blue focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20 sm:text-sm"
                                            />
                                        )}
                                    />
                                    {errors.cpf2?.message && <p className="mt-1 text-xs text-red-600">{errors.cpf2.message}</p>}
                                </div>
                                <FormDatePicker
                                    label="Data de nascimento (2º)"
                                    name="nascimento2"
                                    control={control}
                                    errors={errors}
                                    required
                                />
                            </div>
                        )}
                    </section>

                    <section className="space-y-4" aria-labelledby="credito-imovel">
                        <SectionTitle>
                            <span id="credito-imovel">Imóvel</span>
                        </SectionTitle>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Controller
                                name="localizacao"
                                control={control}
                                render={({ field }) => (
                                    <MunicipioAutocomplete
                                        label="Localização do imóvel (cidade/UF)"
                                        value={field.value}
                                        onChange={(value) => field.onChange(value)}
                                        error={errors.localizacao?.message}
                                        required
                                    />
                                )}
                            />
                            <FormInput
                                label="Agência Caixa de vínculo"
                                name="agencia"
                                register={register}
                                errors={errors}
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="0000"
                            />
                        </div>
                    </section>

                    <section className="space-y-4" aria-labelledby="credito-parceiro">
                        <SectionTitle>
                            <span id="credito-parceiro">Parceiro / Corretor</span>
                        </SectionTitle>
                        <FormAutocomplete
                            label="Parceiro/Corretor"
                            name="partnerId"
                            control={control}
                            options={partnerOptions}
                            errors={errors}
                            placeholder="Digite para buscar o parceiro..."
                        />
                        {selectedPartner && (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <ReadOnlyField label="Nome do parceiro" value={selectedPartner.name} />
                                <ReadOnlyField label="Telefone do corretor" value={selectedPartner.phone} />
                                <ReadOnlyField label="E-mail do corretor" value={selectedPartner.email} />
                            </div>
                        )}
                        {selectedPartner && !selectedPartner.phone && (
                            <p className="text-xs text-amber-700" role="status">
                                Este parceiro não tem telefone cadastrado: o envio da simulação por WhatsApp ficará bloqueado
                                até que o telefone seja informado.
                            </p>
                        )}
                    </section>
                </div>
                <ModalFooter>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-salesforce-blue px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-salesforce-hover disabled:opacity-60"
                    >
                        {submitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                        Criar lead
                    </button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
