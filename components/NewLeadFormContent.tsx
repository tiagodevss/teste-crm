import React, { useMemo, useEffect, useRef } from 'react';
import { UseFormRegister, Control, FieldErrors, UseFormSetValue, useWatch } from 'react-hook-form';
import { Handshake } from 'lucide-react';
import type { FieldConfig, Imobiliaria, UserProfile, Product, Campaign } from '../types';
import { FormInput, FormSelect, FormAutocomplete } from './ui/FormInputs';
import { DynamicFieldRenderer } from './DynamicFieldRenderer';
import { filterVisibleFields } from '../lib/field-rules';
import { buildFieldRuleContext } from '../lib/field-rule-context';
import { withLeadFormFieldHelp } from '../lib/leadFormFieldHelp';
import type { LeadFormStep1Rules } from '../lib/leadFormProductRules';
import { getLeadFormStep1Rules } from '../lib/leadFormProductRules';

export type NewLeadModalStep = 1 | 2;

export interface NewLeadFormContentProps {
    register: UseFormRegister<any>;
    control: Control<any>;
    errors: FieldErrors;
    setValue: UseFormSetValue<any>;
    isFromPartner: boolean;
    setIsFromPartner: (v: boolean) => void;
    isBroughtByStaff: boolean;
    setIsBroughtByStaff: (v: boolean) => void;
    partners: Imobiliaria[];
    usersList: UserProfile[];
    user: UserProfile | null;
    products: Product[];
    campaigns: Campaign[];
    createLeadFields: FieldConfig[];
    /** 1 = dados iniciais; 2 = campos específicos do produto. */
    step: NewLeadModalStep;
    canAssignStaff: boolean;
    step1Rules?: LeadFormStep1Rules;
    /** Usa a entrada mínima de nome, telefone e serviço sem alterar outros consumidores. */
    quickEntry?: boolean;
    /** Entrada Contabilidade: formulário único, sem escolha prévia de produto. */
    accountingEntry?: boolean;
}

const staffOptions = (usersList: UserProfile[]) =>
    usersList
        .filter(u => u.profile?.isStaff !== false)
        .map(u => ({ label: u.name, value: u.id, sublabel: u.email }));

export const NewLeadFormContent: React.FC<NewLeadFormContentProps> = ({
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
    step1Rules: step1RulesProp,
    quickEntry = false,
    accountingEntry = false,
}) => {
    const productId = useWatch({ control, name: 'productId', defaultValue: '' });
    const selectedProduct = products.find(p => p.id === productId);
    const step1Rules = step1RulesProp ?? getLeadFormStep1Rules(selectedProduct?.name);
    const previousFieldKeysRef = useRef<string[]>([]);

    const allFormValues = useWatch({ control });

    const visibleFields = useMemo(() => {
        const enrichedFields = withLeadFormFieldHelp(createLeadFields);
        if (enrichedFields.length === 0) return enrichedFields;
        const ctx = buildFieldRuleContext(
            enrichedFields,
            (allFormValues ?? {}) as Record<string, unknown>,
        );
        return filterVisibleFields(enrichedFields, ctx);
    }, [createLeadFields, allFormValues]);

    useEffect(() => {
        const nextKeys = new Set(createLeadFields.map(field => field.key));
        for (const key of previousFieldKeysRef.current) {
            if (!nextKeys.has(key)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setValue(key as any, undefined);
            }
        }
        previousFieldKeysRef.current = Array.from(nextKeys);
    }, [createLeadFields, setValue]);

    useEffect(() => {
        const hiddenKeys = createLeadFields
            .filter(f => !visibleFields.some(v => v.key === f.key))
            .map(f => f.key);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hiddenKeys.forEach(key => setValue(key as any, undefined));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleFields]);

    const quickStep1 = (
        <div className="space-y-5">
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-sm font-semibold text-blue-900">Comece pelo essencial</p>
                <p className="mt-1 text-xs leading-relaxed text-blue-700">
                    Informe o contato e o serviço desejado. Na próxima etapa, você preencherá apenas as informações necessárias para iniciar o atendimento.
                </p>
            </div>

            <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dados essenciais</h3>
                <FormInput
                    label="Nome"
                    name="name"
                    register={register}
                    errors={errors}
                    required
                    placeholder="Nome do lead"
                />
                <FormInput
                    label="Telefone"
                    name="phone"
                    register={register}
                    errors={errors}
                    control={control}
                    phone
                    required
                    placeholder="(00) 0000-0000 ou (00) 90000-0000"
                />
                <FormAutocomplete
                    label="Serviço de interesse"
                    name="productId"
                    control={control}
                    errors={errors}
                    required
                    options={products.map(p => ({ label: p.name, value: p.id }))}
                    placeholder="Selecione o serviço..."
                />
            </section>
        </div>
    );

    const accountingStep = (
        <div className="space-y-5">
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-sm font-semibold text-blue-900">Informações iniciais</p>
                <p className="mt-1 text-xs leading-relaxed text-blue-700">
                    Informe o contato e as informações necessárias para iniciar o atendimento contábil.
                </p>
            </div>
            <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contato</h3>
                <FormInput label="Nome" name="name" register={register} errors={errors} required placeholder="Nome do lead" />
                <FormInput label="Telefone" name="phone" register={register} errors={errors} control={control} phone required placeholder="(00) 0000-0000 ou (00) 90000-0000" />
            </section>
            <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Qualificação inicial</h3>
                {visibleFields
                    .filter((field) => !['nomeRazaoSocial', 'telefoneWhatsapp'].includes(field.key))
                    .map((field) => (
                        <div key={field.key}>
                            <DynamicFieldRenderer
                                field={field}
                                register={register}
                                control={control}
                                errors={errors}
                                setValue={setValue}
                            />
                        </div>
                    ))}
            </section>
        </div>
    );

    const standardStep1 = (
        <>
            <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Produto & Campanha</h3>
                <FormAutocomplete
                    label="Produto"
                    name="productId"
                    control={control}
                    errors={errors}
                    required
                    options={products.map(p => ({ label: p.name, value: p.id }))}
                    placeholder="Selecione o produto..."
                />
                <FormAutocomplete
                    label="Campanha (opcional)"
                    name="campaignId"
                    control={control}
                    errors={errors}
                    options={campaigns.map(c => ({ label: c.name, value: c.id }))}
                    placeholder="Selecione a campanha ativa..."
                />
                <p className="text-xs text-gray-500 -mt-2">
                    Apenas campanhas ativas podem receber novos leads.
                </p>
            </section>

            <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Identificação</h3>
                <div className={`grid grid-cols-1 gap-4 ${step1Rules.showCompanyField ? 'sm:grid-cols-2' : ''}`}>
                    <FormInput
                        label={step1Rules.nameLabel}
                        name="name"
                        register={register}
                        errors={errors}
                        required={step1Rules.nameRequired}
                        placeholder={step1Rules.namePlaceholder}
                    />
                    {step1Rules.showCompanyField ? (
                        <FormInput
                            label={step1Rules.companyLabel ?? 'Empresa'}
                            name="company"
                            register={register}
                            errors={errors}
                            placeholder="Nome da empresa (opcional)"
                        />
                    ) : null}
                </div>
            </section>

            <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contato</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormInput
                        label="Telefone"
                        name="phone"
                        register={register}
                        errors={errors}
                        control={control}
                        phone
                        required={step1Rules.phoneRequired}
                        placeholder="(00) 0000-0000 ou (00) 90000-0000"
                    />
                    <FormInput
                        label="E-mail"
                        name="email"
                        type="email"
                        register={register}
                        errors={errors}
                        required={step1Rules.emailRequired}
                        placeholder="email@exemplo.com"
                    />
                </div>
                <FormInput
                    label={step1Rules.addressLabel}
                    name="address"
                    register={register}
                    errors={errors}
                    required={step1Rules.addressRequired}
                    placeholder={step1Rules.addressPlaceholder}
                />
            </section>

            <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Origem do Lead</h3>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Veio de parceiro?</label>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => { setIsFromPartner(true); setValue('partnerId', ''); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border-2 text-sm font-semibold transition-all ${isFromPartner ? 'border-salesforce-blue bg-blue-50 text-salesforce-blue' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        >
                            <Handshake size={16} /> Sim
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsFromPartner(false); setValue('partnerId', ''); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border-2 text-sm font-semibold transition-all ${!isFromPartner ? 'border-salesforce-blue bg-blue-50 text-salesforce-blue' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        >
                            Não
                        </button>
                    </div>
                    {isFromPartner && (
                        <div className="mt-3 animate-fade-in">
                            <FormSelect
                                label="Selecione o parceiro"
                                name="partnerId"
                                control={control}
                                errors={errors}
                                required
                                options={partners.filter(p => p.active !== false).map(p => ({ label: p.name, value: p.id }))}
                                placeholder="Escolha o parceiro..."
                            />
                        </div>
                    )}
                </div>
                {canAssignStaff && (
                    <div className="animate-fade-in">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Foi algum funcionário que trouxe?</label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => { setIsBroughtByStaff(true); setValue('registeredByStaffId', ''); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border-2 text-sm font-semibold transition-all ${isBroughtByStaff ? 'border-salesforce-blue bg-blue-50 text-salesforce-blue' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                            >
                                Sim
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsBroughtByStaff(false); setValue('registeredByStaffId', ''); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border-2 text-sm font-semibold transition-all ${!isBroughtByStaff ? 'border-salesforce-blue bg-blue-50 text-salesforce-blue' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                            >
                                Não
                            </button>
                        </div>
                        {isBroughtByStaff && (
                            <div className="mt-3 animate-fade-in">
                                <FormAutocomplete
                                    label="Funcionário que trouxe"
                                    name="registeredByStaffId"
                                    control={control}
                                    errors={errors}
                                    required={true}
                                    options={staffOptions(usersList)}
                                    placeholder="Digite para buscar funcionário..."
                                />
                            </div>
                        )}
                    </div>
                )}
            </section>
        </>
    );

    const step2 = createLeadFields.length > 0 ? (
        <div className="animate-fade-in space-y-5">
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-salesforce-blue/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-salesforce-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                    </svg>
                </div>
                <div>
                    <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide">Serviço selecionado</p>
                    <p className="text-sm font-bold text-gray-800">{selectedProduct?.name}</p>
                </div>
            </div>

            <div className="space-y-5">
                {(() => {
                    const groups = new Map<string, typeof visibleFields>();
                    for (const field of visibleFields) {
                        const section = field.section?.trim() || 'Dados de qualificação';
                        const list = groups.get(section) ?? [];
                        list.push(field);
                        groups.set(section, list);
                    }
                    return Array.from(groups.entries()).map(([section, fields]) => (
                        <section key={section} className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                {section}
                            </h3>
                            {fields.map((field) => (
                                <div key={field.key}>
                                    <DynamicFieldRenderer
                                        field={field}
                                        register={register}
                                        control={control}
                                        errors={errors}
                                        setValue={setValue}
                                    />
                                </div>
                            ))}
                        </section>
                    ));
                })()}
            </div>
        </div>
    ) : null;

    return (
        <div className="px-6 pb-4 sm:p-6 sm:pb-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {step === 1 ? (accountingEntry ? accountingStep : quickEntry ? quickStep1 : standardStep1) : step2}
        </div>
    );
};
