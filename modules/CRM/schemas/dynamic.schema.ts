import { z } from 'zod';
import type { FieldConfig, FieldRuleCondition } from '../../../types';
import { filterVisibleFields, type RuleEvaluationContext } from '../../../lib/field-rules';
import { isPlausibleBrazilPhone } from '../../../utils/phoneValidation';

/**
 * Constrói um schema Zod dinâmico a partir de campos de configuração.
 * Se `ctx` for fornecido, campos ocultos pelas regras condicionais são excluídos do schema
 * (e portanto não são validados como required).
 */
export function buildDynamicSchema(
  fields: FieldConfig[],
  ctx?: RuleEvaluationContext,
  options?: {
    requireKanbanObservation?: boolean;
    /**
     * Campos com `validationTiming = 'exit'` só são exigidos ao sair da etapa (o backend é a fonte de
     * verdade). Por padrão não bloqueiam o preenchimento/salvamento parcial; passe `true` para exigi-los.
     */
    enforceExitFields?: boolean;
  },
): z.ZodObject<Record<string, z.ZodTypeAny>> {
    const activeFields = ctx ? filterVisibleFields(fields, ctx) : fields;
    const shape: Record<string, z.ZodTypeAny> = {};
    const requiredMessage = (label: string) => `${label} é obrigatório`;
    const isEmpty = (value: unknown, type: FieldConfig['type']): boolean => {
        if (value === null || value === undefined || value === '') return true;
        if (type === 'multi_select' || type === 'string_list') {
            if (Array.isArray(value)) {
                return value.map((item) => String(item).trim()).filter(Boolean).length === 0;
            }
            if (typeof value === 'string') return value.trim().length === 0;
        }
        return false;
    };

    const isOtherOptionRequired = (field: FieldConfig): boolean => {
        if (field.required || !ctx || !field.displayRules?.length) return Boolean(field.required);

        return field.displayRules.some((group) =>
            group.conditions.every((condition) => {
                if (!('field' in condition)) return false;
                const typedCondition = condition as FieldRuleCondition;
                if (typedCondition.op !== 'eq' && typedCondition.op !== 'in') return false;
                const expectedValues = Array.isArray(typedCondition.value)
                    ? typedCondition.value.map(String)
                    : [String(typedCondition.value)];
                if (!expectedValues.includes('Outros')) return false;
                return fields.some(
                    (candidate) => candidate.key === typedCondition.field && candidate.required,
                );
            }),
        );
    };

    for (const f of activeFields) {
        if (f.type === 'info') continue;
        const base = getZodTypeForFieldConfig(f);
        const requiredBase = base.refine(
            (value) => !isEmpty(value, f.type),
            { message: requiredMessage(f.label) },
        );
        const deferredToExit = f.validationTiming === 'exit' && !options?.enforceExitFields;
        const effectiveRequired = !deferredToExit && isOtherOptionRequired(f);
        if (f.type === 'multi_select' || f.type === 'string_list' || f.type === 'formula') {
            shape[f.key] = effectiveRequired ? requiredBase : base.optional();
        } else {
            shape[f.key] = effectiveRequired ? requiredBase : base.optional().or(z.literal(''));
        }
    }
    if (options?.requireKanbanObservation) {
        shape.kanbanObservation = z
            .string()
            .trim()
            .min(1, 'Observação é obrigatória para mover no Kanban');
    }
    return z.object(shape);
}

function applyValidation(base: z.ZodTypeAny, f: FieldConfig): z.ZodTypeAny {
    const v = f.validation;
    if (!v) return base;

    if (f.type === 'text') {
        let s = base as z.ZodString;
        if (v.minLength != null) s = s.min(v.minLength, { message: `Mínimo ${v.minLength} caracteres` }) as z.ZodString;
        if (v.maxLength != null) s = s.max(v.maxLength, { message: `Máximo ${v.maxLength} caracteres` }) as z.ZodString;
        if (v.pattern) {
            try {
                s = s.regex(new RegExp(v.pattern), { message: 'Formato inválido' }) as z.ZodString;
            } catch {
                // regex inválido, ignora
            }
        }
        return s;
    }

    if (f.type === 'number' || f.type === 'currency') {
        return base.refine(
            (val) => {
                const n = typeof val === 'number' ? val : parseFloat(String(val));
                if (Number.isNaN(n)) return true; // deixa required/optional tratar
                if (v.min != null && n < v.min) return false;
                if (v.max != null && n > v.max) return false;
                return true;
            },
            { message: v.min != null && v.max != null ? `Entre ${v.min} e ${v.max}` : v.min != null ? `Mínimo ${v.min}` : v.max != null ? `Máximo ${v.max}` : 'Valor inválido' }
        );
    }

    return base;
}

function getZodTypeForFieldConfig(f: FieldConfig): z.ZodTypeAny {
    let base: z.ZodTypeAny;
    switch (f.type) {
        case 'text':
            base = z.string();
            break;
        case 'number':
            base = z.union([z.number(), z.string()]).transform((v) =>
                typeof v === 'string' ? (v.trim() === '' ? undefined : parseFloat(v)) : v
            ) as z.ZodTypeAny;
            break;
        case 'currency':
            base = z.union([z.number(), z.string()]).transform((v) => {
                if (typeof v !== 'string') return v;
                const normalized = (v || '').replace(/[^\d.-]/g, '');
                if (!normalized.trim()) return undefined;
                const parsed = parseFloat(normalized);
                return Number.isFinite(parsed) ? parsed : undefined;
            }) as z.ZodTypeAny;
            break;
        case 'checkbox':
            base = z.boolean();
            break;
        case 'select':
            base = z.string();
            break;
        case 'attachment':
            base = z.union([z.string(), z.instanceof(File)]);
            break;
        case 'textarea':
        case 'cpf_cnpj':
        case 'user':
        case 'label':
        case 'date':
        case 'datetime':
            base = z.string();
            break;
        case 'phone':
            base = z.string().refine(
                (value) => !value?.trim() || isPlausibleBrazilPhone(value),
                { message: 'Telefone inválido. Informe um número real com DDD.' },
            );
            break;
        case 'email':
            base = f.required ? z.string().email({ message: 'E-mail inválido' }) : z.string();
            break;
        case 'url':
            base = f.required ? z.string().url({ message: 'URL inválida' }) : z.string();
            break;
        case 'multi_select':
        case 'string_list':
            base = z.union([z.array(z.string()), z.string()]).transform((v) => {
                if (Array.isArray(v)) return v.map((item) => String(item).trim()).filter(Boolean);
                return String(v)
                    .split(/\n|;/)
                    .map((item) => item.trim())
                    .filter(Boolean);
            }) as z.ZodTypeAny;
            break;
        case 'info':
            return z.unknown().optional();
        case 'formula':
            return z.unknown();
        default:
            return z.unknown();
    }
    return applyValidation(base, f);
}
