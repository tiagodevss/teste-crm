import React, { useRef } from 'react';
import { Controller, Control, UseFormRegister, FieldErrors, UseFormSetValue, useWatch } from 'react-hook-form';
import { Paperclip, Loader2, Plus, Minus, AlertTriangle } from 'lucide-react';
import { FieldConfig } from '../types';
import { FormInput, FormSelect, FormDatePicker } from './ui/FormInputs';
import { AttachmentLink } from './AttachmentLink';
import { joinAttachmentValue, splitAttachmentValue } from '../utils/leadCustomFields';
import { MunicipioAutocomplete } from '../modules/Financeira/components/MunicipioAutocomplete';
import {
    getYesNoComplementKey,
    isYesAnswer,
    isYesNoSelectField,
    shouldUseYesNoComplement,
    yesNoComplementLabel,
} from '../lib/yes-no-fields';
import toast from 'react-hot-toast';
import { resolveLeadFormFieldHelpText } from '../lib/leadFormFieldHelp';

function fieldInputWidthClass(field: FieldConfig): string {
    const width = field.uiConfig?.inputWidth;
    if (width === 'sm') return 'max-w-xs';
    if (width === 'md') return 'max-w-md';
    return '';
}

async function uploadFile(file: File): Promise<{ url: string }> {
    const { uploadFile: doUpload } = await import('../lib/upload');
    return doUpload(file);
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

async function uploadFinanceira(
    file: File,
    context: { pipeId: string; leadId?: string; fieldKey?: string },
): Promise<{ url: string }> {
    const { uploadFinanceiraFile } = await import('../lib/upload');
    return uploadFinanceiraFile(file, context);
}

/** Contexto de upload dos funis financeiros: anexos vão para o armazenamento privado. */
export interface FinanceiraUploadContext {
    pipeId: string;
    leadId?: string;
}

export interface DynamicFieldRendererProps {
    /** Quando informado, anexos são enviados para o armazenamento privado financeiro. */
    financeiraUploadContext?: FinanceiraUploadContext;
    field: FieldConfig;
    register: UseFormRegister<Record<string, unknown>>;
    control: Control<Record<string, unknown>>;
    errors: FieldErrors;
    setValue?: UseFormSetValue<Record<string, unknown>>;
    /** Chave do campo cujo upload está em andamento. */
    uploadingAttachmentKey?: string | null;
    setUploadingAttachmentKey?: (key: string | null) => void;
}

export function DynamicFieldRenderer({
    field,
    register,
    control,
    errors,
    setValue,
    uploadingAttachmentKey,
    setUploadingAttachmentKey,
    financeiraUploadContext,
}: DynamicFieldRendererProps) {
    const attachmentNames = useRef(new Map<string, string>());
    const resolvedHelpText = resolveLeadFormFieldHelpText(field);
    const helpText = resolvedHelpText ? (
        <p className="mt-1 text-xs text-gray-500">{resolvedHelpText}</p>
    ) : null;
    const complementKey = getYesNoComplementKey(field.key);
    const watchedValue = useWatch({ control, name: field.key });
    const showYesNoComplement =
        shouldUseYesNoComplement(field) && isYesAnswer(watchedValue);

    switch (field.type) {
        case 'info': {
            const variant = field.uiConfig?.variant === 'warning' ? 'warning' : 'info';
            const tone =
                variant === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-950'
                    : 'border-blue-100 bg-blue-50 text-blue-950';
            return (
                <div
                    className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${tone}`}
                    role="status"
                >
                    <div className="flex gap-2">
                        {variant === 'warning' ? (
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
                        ) : null}
                        <p className="font-medium">{field.label}</p>
                    </div>
                    {helpText}
                </div>
            );
        }

        case 'string_list':
            return (
                <>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <Controller
                            name={field.key}
                            control={control}
                            defaultValue={['']}
                            rules={{
                                validate: (value) => {
                                    if (!field.required) return true;
                                    const items = Array.isArray(value)
                                        ? value.map((item) => String(item).trim()).filter(Boolean)
                                        : [];
                                    return items.length > 0 || 'Campo obrigatório';
                                },
                            }}
                            render={({ field: f }) => {
                                const lines: string[] = Array.isArray(f.value)
                                    ? f.value.map((item) => String(item))
                                    : typeof f.value === 'string' && f.value
                                      ? f.value.split('\n')
                                      : [''];
                                const updateLine = (index: number, next: string) => {
                                    const copy = [...lines];
                                    copy[index] = next;
                                    f.onChange(copy);
                                };
                                const addLine = () => f.onChange([...lines, '']);
                                const removeLine = (index: number) => {
                                    if (lines.length <= 1) {
                                        f.onChange(['']);
                                        return;
                                    }
                                    f.onChange(lines.filter((_, i) => i !== index));
                                };
                                return (
                                    <div className="space-y-2">
                                        {lines.map((line, index) => (
                                            <div key={`${field.key}-${index}`} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={line}
                                                    onChange={(e) => updateLine(index, e.target.value)}
                                                    placeholder={field.placeholder ?? `Item ${index + 1}`}
                                                    className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20 focus:border-salesforce-blue sm:text-sm bg-white text-gray-900 placeholder-gray-400"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeLine(index)}
                                                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-2.5 text-gray-600 hover:bg-gray-50"
                                                    aria-label={`Remover linha ${index + 1}`}
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                {index === lines.length - 1 ? (
                                                    <button
                                                        type="button"
                                                        onClick={addLine}
                                                        className="inline-flex items-center justify-center rounded-lg border border-transparent bg-salesforce-blue px-2.5 text-white hover:bg-salesforce-hover"
                                                        aria-label="Adicionar linha"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                ) : (
                                                    <span className="w-9" aria-hidden />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                );
                            }}
                        />
                        {errors[field.key]?.message && (
                            <p className="mt-1 text-xs text-red-600">{String(errors[field.key]?.message)}</p>
                        )}
                    </div>
                    {helpText}
                </>
            );

        case 'text':
        case 'url':
            if (field.type === 'text' && field.uiConfig?.widget === 'municipio') {
                return (
                    <div className={fieldInputWidthClass(field)}>
                        <Controller
                            name={field.key}
                            control={control}
                            render={({ field: f }) => (
                                <MunicipioAutocomplete
                                    label={field.label}
                                    value={typeof f.value === 'string' ? f.value : ''}
                                    onChange={(value) => f.onChange(value)}
                                    error={errors[field.key]?.message ? String(errors[field.key]?.message) : undefined}
                                    required={field.required}
                                />
                            )}
                        />
                        {helpText}
                    </div>
                );
            }
            return (
                <div className={fieldInputWidthClass(field)}>
                    <FormInput
                        label={field.label}
                        name={field.key}
                        type={field.type === 'url' ? 'url' : 'text'}
                        register={register}
                        errors={errors}
                        required={field.required}
                        placeholder={field.placeholder}
                    />
                    {helpText}
                </div>
            );

        case 'textarea': {
            const rows = (field.uiConfig?.rows as number | undefined) ?? 3;
            return (
                <>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                            {...register(field.key, {
                                required: field.required ? 'Campo obrigatório' : false,
                            })}
                            rows={rows}
                            required={field.required}
                            placeholder={field.placeholder}
                            className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20 focus:border-salesforce-blue sm:text-sm bg-white text-gray-900 placeholder-gray-400 resize-y"
                        />
                        {errors[field.key]?.message && (
                            <p className="mt-1 text-xs text-red-600">{String(errors[field.key]?.message)}</p>
                        )}
                    </div>
                    {helpText}
                </>
            );
        }

        case 'number':
            return (
                <>
                    <FormInput
                        label={field.label}
                        name={field.key}
                        type="number"
                        register={register}
                        errors={errors}
                        required={field.required}
                        placeholder={field.placeholder}
                    />
                    {helpText}
                </>
            );

        case 'currency':
            return (
                <>
                    <FormInput
                        label={field.label}
                        name={field.key}
                        type="text"
                        register={register}
                        errors={errors}
                        control={control}
                        required={field.required}
                        placeholder={field.placeholder ?? '0,00'}
                        currency
                    />
                    {helpText}
                </>
            );

        case 'email':
            return (
                <>
                    <FormInput
                        label={field.label}
                        name={field.key}
                        type="email"
                        register={register}
                        errors={errors}
                        required={field.required}
                        placeholder={field.placeholder ?? 'email@exemplo.com'}
                    />
                    {helpText}
                </>
            );

        case 'phone':
            return (
                <>
                    <FormInput
                        label={field.label}
                        name={field.key}
                        type="text"
                        register={register}
                        errors={errors}
                        control={control}
                        required={field.required}
                        placeholder={field.placeholder ?? '(00) 0000-0000 ou (00) 90000-0000'}
                        phone
                    />
                    {helpText}
                </>
            );

        case 'cpf_cnpj':
            return (
                <div className={fieldInputWidthClass(field)}>
                    <FormInput
                        label={field.label}
                        name={field.key}
                        type="text"
                        register={register}
                        errors={errors}
                        required={field.required}
                        placeholder={field.placeholder ?? '000.000.000-00 ou 00.000.000/0001-00'}
                    />
                    {helpText}
                </div>
            );

        case 'select': {
            const selectOptions = field.options ?? [];
            const yesNoField = isYesNoSelectField(field);
            const useYesNoComplement = shouldUseYesNoComplement(field);
            if (field.uiConfig?.widget === 'dropdown') {
                const selectId = `field-${field.key}`;
                return (
                    <>
                        <div className={fieldInputWidthClass(field)}>
                            <label htmlFor={selectId} className="block text-sm font-semibold text-gray-700 mb-1.5">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            <Controller
                                name={field.key}
                                control={control}
                                render={({ field: f }) => {
                                    const current = typeof f.value === 'string' ? f.value : '';
                                    const hasLegacyValue = current !== '' && !selectOptions.includes(current);
                                    return (
                                        <select
                                            id={selectId}
                                            value={current}
                                            onChange={(e) => f.onChange(e.target.value)}
                                            onBlur={f.onBlur}
                                            aria-invalid={Boolean(errors[field.key])}
                                            className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20 focus:border-salesforce-blue sm:text-sm bg-white text-gray-900"
                                        >
                                            <option value="">{field.placeholder ?? 'Selecione...'}</option>
                                            {hasLegacyValue && <option value={current}>{current}</option>}
                                            {selectOptions.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    );
                                }}
                            />
                            {errors[field.key]?.message && (
                                <p className="mt-1 text-xs text-red-600">{String(errors[field.key]?.message)}</p>
                            )}
                        </div>
                        {helpText}
                    </>
                );
            }
            return (
                <>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <Controller
                            name={field.key}
                            control={control}
                            rules={{ required: field.required ? 'Campo obrigatório' : false }}
                            render={({ field: f }) => (
                                <div className="flex flex-wrap gap-2">
                                    {selectOptions.map((opt) => {
                                        const isSelected = f.value === opt;
                                        return (
                                            <button
                                                key={opt}
                                                type="button"
                                                aria-pressed={yesNoField ? isSelected : undefined}
                                                onClick={() => {
                                                    const next = isSelected && !field.required ? '' : opt;
                                                    f.onChange(next);
                                                    if (useYesNoComplement && !isYesAnswer(next)) {
                                                        setValue?.(complementKey, '');
                                                    }
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                                    isSelected
                                                        ? 'bg-salesforce-blue text-white border-salesforce-blue'
                                                        : 'bg-white text-gray-700 border-gray-300 hover:border-salesforce-blue hover:text-salesforce-blue'
                                                }`}
                                            >
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        />
                        {errors[field.key]?.message && (
                            <p className="mt-1 text-xs text-red-600">{String(errors[field.key]?.message)}</p>
                        )}
                    </div>
                    {showYesNoComplement ? (
                        <div className="mt-3 animate-fade-in">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                {yesNoComplementLabel(field.label)}
                            </label>
                            <textarea
                                {...register(complementKey)}
                                rows={2}
                                placeholder={field.placeholder ?? 'Informe os detalhes complementares...'}
                                className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20 focus:border-salesforce-blue sm:text-sm bg-white text-gray-900 placeholder-gray-400 resize-y"
                            />
                        </div>
                    ) : null}
                    {helpText}
                </>
            );
        }

        case 'multi_select': {
            const options = field.options ?? [];
            if (field.uiConfig?.widget === 'checklist') {
                return (
                    <>
                        <fieldset>
                            <Controller
                                name={field.key}
                                control={control}
                                defaultValue={[]}
                                render={({ field: f }) => {
                                    const raw: unknown = f.value;
                                    const selected: string[] = Array.isArray(raw)
                                        ? (raw as string[])
                                        : typeof raw === 'string' && raw.trim()
                                          ? raw.split(',').map((item) => item.trim()).filter(Boolean)
                                          : [];
                                    const done = options.filter((opt) => selected.includes(opt)).length;
                                    const toggle = (opt: string) => {
                                        const next = selected.includes(opt)
                                            ? selected.filter((v) => v !== opt)
                                            : [...selected, opt];
                                        f.onChange(options.filter((o) => next.includes(o)));
                                    };
                                    return (
                                        <>
                                            <div className="flex items-center justify-between mb-2">
                                                <legend className="block text-sm font-semibold text-gray-700">
                                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                                </legend>
                                                <span
                                                    className={`text-xs font-bold ${done === options.length ? 'text-emerald-700' : 'text-gray-600'}`}
                                                    aria-live="polite"
                                                >
                                                    {done}/{options.length}
                                                </span>
                                            </div>
                                            {field.uiConfig?.showProgress ? (
                                                <div
                                                    className="h-1.5 w-full rounded-full bg-gray-200 mb-3 overflow-hidden"
                                                    role="progressbar"
                                                    aria-valuemin={0}
                                                    aria-valuemax={options.length}
                                                    aria-valuenow={done}
                                                    aria-label={`${field.label}: ${done} de ${options.length}`}
                                                >
                                                    <div
                                                        className={`h-full transition-all ${done === options.length ? 'bg-emerald-600' : 'bg-salesforce-blue'}`}
                                                        style={{ width: `${options.length ? (done / options.length) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            ) : null}
                                            <ul className="space-y-1.5">
                                                {options.map((opt, index) => {
                                                    const id = `field-${field.key}-${index}`;
                                                    const checked = selected.includes(opt);
                                                    return (
                                                        <li key={opt}>
                                                            <label
                                                                htmlFor={id}
                                                                className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 hover:border-salesforce-blue cursor-pointer"
                                                            >
                                                                <input
                                                                    id={id}
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    aria-checked={checked}
                                                                    onChange={() => toggle(opt)}
                                                                    className="mt-0.5 h-4 w-4 rounded text-salesforce-blue focus:ring-salesforce-blue"
                                                                />
                                                                <span className={checked ? 'text-gray-900 font-medium' : ''}>
                                                                    {index + 1}. {opt}
                                                                </span>
                                                            </label>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </>
                                    );
                                }}
                            />
                            {errors[field.key]?.message && (
                                <p className="mt-1 text-xs text-red-600">{String(errors[field.key]?.message)}</p>
                            )}
                        </fieldset>
                        {helpText}
                    </>
                );
            }
            return (
                <>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <Controller
                            name={field.key}
                            control={control}
                            rules={{
                                required: field.required ? 'Campo obrigatório' : false,
                            }}
                            defaultValue={[]}
                            render={({ field: f }) => {
                                const selected: string[] = Array.isArray(f.value) ? f.value : [];
                                const toggle = (opt: string) => {
                                    const next = selected.includes(opt)
                                        ? selected.filter((v) => v !== opt)
                                        : [...selected, opt];
                                    f.onChange(next);
                                };
                                return (
                                    <div className="flex flex-wrap gap-2">
                                        {options.map((opt) => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => toggle(opt)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                                    selected.includes(opt)
                                                        ? 'bg-salesforce-blue text-white border-salesforce-blue'
                                                        : 'bg-white text-gray-700 border-gray-300 hover:border-salesforce-blue'
                                                }`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                );
                            }}
                        />
                        {errors[field.key]?.message && (
                            <p className="mt-1 text-xs text-red-600">{String(errors[field.key]?.message)}</p>
                        )}
                    </div>
                    {helpText}
                </>
            );
        }

        case 'date':
            return (
                <>
                    <FormDatePicker
                        label={field.label}
                        name={field.key}
                        control={control}
                        errors={errors}
                        required={field.required}
                        placeholder={field.placeholder ?? field.format ?? 'DD/MM/YYYY'}
                        tooltip=""
                    />
                    {helpText}
                </>
            );

        case 'datetime':
            return (
                <>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <Controller
                            name={field.key}
                            control={control}
                            rules={{
                                required: field.required ? 'Campo obrigatório' : false,
                            }}
                            render={({ field: f }) => (
                                <input
                                    type="datetime-local"
                                    value={f.value ? String(f.value) : ''}
                                    onChange={(e) => f.onChange(e.target.value)}
                                    placeholder={field.placeholder}
                                    className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20 focus:border-salesforce-blue sm:text-sm bg-white text-gray-900"
                                />
                            )}
                        />
                        {errors[field.key]?.message && (
                            <p className="mt-1 text-xs text-red-600">{String(errors[field.key]?.message)}</p>
                        )}
                    </div>
                    {helpText}
                </>
            );

        case 'checkbox':
            return (
                <div>
                    <div className="flex items-center gap-3 pt-2">
                        <Controller
                            name={field.key}
                            control={control}
                            rules={{
                                required: field.required ? 'Campo obrigatório' : false,
                            }}
                            render={({ field: f }) => (
                                <input
                                    type="checkbox"
                                    id={`field-${field.key}`}
                                    checked={!!f.value}
                                    onChange={(e) => f.onChange(e.target.checked)}
                                    className="rounded text-salesforce-blue focus:ring-salesforce-blue h-4 w-4"
                                />
                            )}
                        />
                        <label htmlFor={`field-${field.key}`} className="text-sm font-semibold text-gray-700">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                    </div>
                    {helpText}
                </div>
            );

        case 'attachment': {
            return (
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <Controller
                        name={field.key}
                        control={control}
                        rules={{
                            required: field.required ? 'Campo obrigatório' : false,
                        }}
                        render={({ field: f }) => {
                            const isUploading = uploadingAttachmentKey === field.key;
                            const urls = splitAttachmentValue(f.value);
                            const hasFiles = urls.length > 0;
                            const handleFiles = async (input: HTMLInputElement) => {
                                const selected = Array.from(input.files ?? []);
                                if (selected.length === 0) return;
                                const valid = selected.filter((file) => {
                                    if (file.size > MAX_UPLOAD_BYTES) {
                                        toast.error(`"${file.name}" acima do limite de 10 MB.`);
                                        return false;
                                    }
                                    return true;
                                });
                                if (valid.length === 0) {
                                    input.value = '';
                                    return;
                                }
                                setUploadingAttachmentKey?.(field.key);
                                const next = [...urls];
                                try {
                                    for (const file of valid) {
                                        try {
                                            const result = financeiraUploadContext
                                                ? await uploadFinanceira(file, {
                                                      ...financeiraUploadContext,
                                                      fieldKey: field.key,
                                                  })
                                                : await uploadFile(file);
                                            next.push(result.url);
                                            attachmentNames.current.set(result.url, file.name);
                                        } catch {
                                            toast.error(`Erro ao enviar "${file.name}". Tente novamente.`);
                                        }
                                    }
                                    f.onChange(joinAttachmentValue(next));
                                } finally {
                                    setUploadingAttachmentKey?.(null);
                                    input.value = '';
                                }
                            };
                            return (
                                <div className="space-y-2">
                                    <label
                                        className={`inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 ${
                                            isUploading
                                                ? 'cursor-not-allowed opacity-60'
                                                : 'cursor-pointer hover:bg-gray-50 transition-colors'
                                        }`}
                                    >
                                        {isUploading ? (
                                            <Loader2 size={18} className="animate-spin text-gray-500" />
                                        ) : (
                                            <Paperclip size={18} className="text-gray-500" />
                                        )}
                                        <span>
                                            {isUploading
                                                ? 'Enviando...'
                                                : hasFiles
                                                  ? 'Adicionar arquivos'
                                                  : 'Escolher arquivos'}
                                        </span>
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            disabled={isUploading}
                                            accept={
                                                financeiraUploadContext
                                                    ? '.pdf,.jpg,.jpeg,.png'
                                                    : '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.xls,.csv'
                                            }
                                            onChange={(e) => void handleFiles(e.target)}
                                        />
                                    </label>
                                    {hasFiles && (
                                        <ul className="space-y-1">
                                            {urls.map((url, index) => {
                                                const isUrl = url.startsWith('http') || url.startsWith('/');
                                                const name = attachmentNames.current.get(url);
                                                return (
                                                    <li key={`${url}-${index}`} className="flex items-center gap-2">
                                                        {isUrl ? (
                                                            <AttachmentLink
                                                                url={url}
                                                                label={name ?? (urls.length > 1 ? `Arquivo ${index + 1}` : 'Ver arquivo')}
                                                                showIcon={false}
                                                                className="text-xs text-salesforce-blue hover:underline truncate max-w-[240px]"
                                                            />
                                                        ) : (
                                                            <span className="text-xs text-gray-500 truncate max-w-[240px]">{url}</span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            disabled={isUploading}
                                                            onClick={() => f.onChange(joinAttachmentValue(urls.filter((_, i) => i !== index)))}
                                                            className="text-xs text-red-600 hover:underline disabled:opacity-50"
                                                            aria-label={`Remover arquivo ${index + 1}`}
                                                        >
                                                            Remover
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            );
                        }}
                    />
                    {errors[field.key]?.message && (
                        <p className="mt-1 text-xs text-red-600">{String(errors[field.key]?.message)}</p>
                    )}
                    {helpText}
                </div>
            );
        }

        case 'label':
            return (
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {field.label}
                    </label>
                    <Controller
                        name={field.key}
                        control={control}
                        render={({ field: f }) => (
                            <div className="flex flex-wrap gap-1 min-h-[36px] border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                                {f.value ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-salesforce-blue/10 text-salesforce-blue">
                                        {String(f.value)}
                                    </span>
                                ) : (
                                    <span className="text-sm text-gray-400">{field.placeholder ?? 'Sem etiqueta'}</span>
                                )}
                            </div>
                        )}
                    />
                    {helpText}
                </div>
            );

        case 'user':
            return (
                <>
                    <FormInput
                        label={field.label}
                        name={field.key}
                        type="text"
                        register={register}
                        errors={errors}
                        required={field.required}
                        placeholder={field.placeholder ?? 'Nome do responsável'}
                    />
                    {helpText}
                </>
            );

        case 'formula':
            return (
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {field.label}
                    </label>
                    <Controller
                        name={field.key}
                        control={control}
                        render={({ field: f }) => (
                            <div className="block w-full border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 text-sm text-gray-700">
                                {f.value != null && f.value !== '' ? String(f.value) : (
                                    <span className="text-gray-400 italic">Calculado automaticamente</span>
                                )}
                            </div>
                        )}
                    />
                    {helpText}
                </div>
            );

        default:
            return (
                <>
                    <FormInput
                        label={field.label}
                        name={field.key}
                        type="text"
                        register={register}
                        errors={errors}
                        required={field.required}
                        placeholder={field.placeholder}
                    />
                    {helpText}
                </>
            );
    }
}
