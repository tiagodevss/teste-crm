import React, { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import { CheckCircle2, ClipboardList, Loader2, Save } from 'lucide-react';
import type { FieldConfig, Lead } from '../../../types';
import { DynamicFieldRenderer } from '../../../components/DynamicFieldRenderer';
import { LeadDetailSection } from '../../Lead/components/LeadDetailSection';
import { buildDynamicSchema } from '../../CRM/schemas/dynamic.schema';
import { filterVisibleFields, getEditableFieldKeys } from '../../../lib/field-rules';
import { buildFieldRuleContext } from '../../../lib/field-rule-context';
import { getAttachmentFormValue, getNormalizedCustomFields, mergeCustomFieldEntriesForFields } from '../../../utils/leadCustomFields';
import { advanceSiopi } from '../../../lib/financeira-api';
import { getApiErrorMessage } from '../../../lib/api-error';
import { useUserStore } from '../../Login/store/useUserStore';
import { useCRMStore } from '../../CRM/store';
import { FIELD_KEYS, REPASSE_STEPS } from '../financeira.constants';

interface FinanceiraStagePanelProps {
    lead: Lead;
    /** Campos operacionais ativos da etapa atual. */
    fields: FieldConfig[];
    isRepasse: boolean;
    canEdit: boolean;
    onSaved: () => void;
}

function buildDefaults(lead: Lead, fields: FieldConfig[]): Record<string, unknown> {
    const byKey = new Map(getNormalizedCustomFields(lead).map((entry) => [entry.key, entry]));
    const defaults: Record<string, unknown> = {};
    for (const field of fields) {
        const entry = byKey.get(field.key);
        if (field.type === 'attachment') defaults[field.key] = getAttachmentFormValue(entry);
        else if (field.type === 'multi_select') {
            const raw = entry?.value;
            defaults[field.key] = Array.isArray(raw)
                ? raw
                : typeof raw === 'string' && raw.trim()
                  ? raw.split(',').map((item) => item.trim()).filter(Boolean)
                  : [];
        } else if (field.type === 'checkbox') defaults[field.key] = Boolean(entry?.value);
        else defaults[field.key] = entry?.value ?? '';
    }
    return defaults;
}

/**
 * "Campos da fase" dos funis financeiros: editor dos dados da etapa ATUAL (salvar sem sair da etapa).
 * As obrigatoriedades de saída (`S`) são verificadas pelo backend ao mover o card; aqui o operador
 * pode salvar parcialmente, inclusive o checklist da SIOPI.
 */
export function FinanceiraStagePanel({ lead, fields, isRepasse, canEdit, onSaved }: FinanceiraStagePanelProps) {
    const updateLead = useCRMStore((state) => state.updateLead);
    const userProfileCode = useUserStore((state) => state.user?.profile?.code ?? state.user?.role);
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [advancing, setAdvancing] = useState(false);
    const [advanceError, setAdvanceError] = useState<string | null>(null);

    const { register, control, handleSubmit, reset, setError, clearErrors, setValue, formState } = useForm<Record<string, unknown>>({
        defaultValues: buildDefaults(lead, fields),
    });
    const { errors, isDirty } = formState;

    useEffect(() => {
        reset(buildDefaults(lead, fields));
        setAdvanceError(null);
        // Recarrega quando o card é atualizado no servidor (ex.: após salvar ou mudar de etapa).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lead.id, lead.stage, lead.updatedAt, fields]);

    const watched = useWatch({ control }) as Record<string, unknown>;
    const ruleCtx = useMemo(() => {
        const fromLead: Record<string, unknown> = {
            name: lead.name,
            cpfCnpj: lead.cpfCnpj ?? null,
            phone: lead.phone ?? null,
            email: lead.email ?? null,
            partnerId: lead.partnerId ?? null,
        };
        for (const entry of getNormalizedCustomFields(lead)) {
            fromLead[entry.key] = entry.type === 'attachment' ? entry.url ?? null : entry.value ?? null;
        }
        return buildFieldRuleContext(fields, { ...fromLead, ...(watched ?? {}) }, {
            currentStage: lead.stage,
            userProfileCode,
        });
    }, [lead, watched, fields, userProfileCode]);

    const visibleFields = useMemo(() => filterVisibleFields(fields, ruleCtx), [fields, ruleCtx]);
    const editableKeys = useMemo(() => getEditableFieldKeys(fields, ruleCtx), [fields, ruleCtx]);

    const checklistField = fields.find((field) => field.key === FIELD_KEYS.tarefasSiopi);
    const checklistOptions = checklistField?.options ?? [];
    const checklistValue = watched?.[FIELD_KEYS.tarefasSiopi];
    const checklistDone = Array.isArray(checklistValue)
        ? checklistOptions.filter((option) => (checklistValue as string[]).includes(option)).length
        : 0;
    const isSiopi = isRepasse && lead.stage === REPASSE_STEPS.SIOPI && Boolean(checklistField);
    const checklistComplete = checklistOptions.length > 0 && checklistDone === checklistOptions.length;

    if (fields.length === 0) return null;

    const save = handleSubmit(async (values) => {
        clearErrors();
        // Exigências de saída (timing `exit`) ficam para o backend; aqui só validamos formato.
        const schema = buildDynamicSchema(visibleFields, ruleCtx);
        const parsed = schema.safeParse(values);
        if (!parsed.success) {
            for (const issue of parsed.error.issues) {
                const key = String(issue.path[0] ?? '');
                if (key) setError(key, { type: 'manual', message: issue.message });
            }
            toast.error(parsed.error.issues[0]?.message ?? 'Revise os campos da etapa.');
            return;
        }
        setSaving(true);
        try {
            const entries = mergeCustomFieldEntriesForFields(
                getNormalizedCustomFields(lead),
                visibleFields,
                values,
                lead.stage,
            );
            await updateLead(lead.id, { customFields: entries });
            toast.success('Dados da etapa salvos.');
            onSaved();
        } catch {
            // a store já exibiu o erro do servidor; o formulário mantém os dados digitados
        } finally {
            setSaving(false);
        }
    });

    const concludeSiopi = async () => {
        setAdvancing(true);
        setAdvanceError(null);
        try {
            if (isDirty) await save();
            const result = await advanceSiopi(lead.id, undefined);
            toast.success(`SIOPI concluída. Card movido para "${result.toStage}".`);
            onSaved();
        } catch (error) {
            setAdvanceError(getApiErrorMessage(error, 'Não foi possível concluir a SIOPI.'));
        } finally {
            setAdvancing(false);
        }
    };

    return (
        <LeadDetailSection
            id="financeira-stage-fields"
            title={`Campos da fase — ${lead.stage}`}
            description="Edite os dados desta etapa. As exigências para sair da etapa são conferidas ao movimentar o card."
            icon={<ClipboardList size={18} />}
        >
            <form onSubmit={save} className="space-y-4" noValidate>
                {visibleFields.map((field) => (
                    <div
                        key={field.key}
                        className={!canEdit || !editableKeys.has(field.key) ? 'pointer-events-none opacity-60' : undefined}
                    >
                        <DynamicFieldRenderer
                            field={field}
                            register={register}
                            control={control}
                            errors={errors}
                            setValue={setValue}
                            uploadingAttachmentKey={uploadingKey}
                            setUploadingAttachmentKey={setUploadingKey}
                            financeiraUploadContext={{ pipeId: lead.pipeId, leadId: lead.id }}
                        />
                    </div>
                ))}
                {canEdit && (
                    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-4">
                        {isSiopi && (
                            <>
                                {!checklistComplete && (
                                    <span className="text-xs text-gray-600" role="status">
                                        Marque os {checklistOptions.length} itens ({checklistDone}/{checklistOptions.length}) para concluir a SIOPI.
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => void concludeSiopi()}
                                    disabled={!checklistComplete || advancing || saving}
                                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {advancing ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
                                    Concluir SIOPI e avançar
                                </button>
                            </>
                        )}
                        <button
                            type="submit"
                            disabled={saving || advancing || Boolean(uploadingKey) || !isDirty}
                            className="inline-flex items-center gap-2 rounded-lg bg-salesforce-blue px-4 py-2 text-sm font-bold text-white hover:bg-salesforce-hover disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
                            Salvar dados da etapa
                        </button>
                    </div>
                )}
                {advanceError && (
                    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                        {advanceError}
                    </p>
                )}
            </form>
        </LeadDetailSection>
    );
}
