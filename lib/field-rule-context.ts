import type { FieldConfig } from '../types';
import { getYesNoComplementKey, shouldUseYesNoComplement } from './yes-no-fields';
import type { RuleEvaluationContext } from './field-rules';

function normalizeFieldValue(
  value: unknown,
): string | number | boolean | Array<string | number | boolean> | null | undefined {
  if (value === undefined || value === null || value === '') return value === '' ? '' : null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
          return item;
        }
        return String(item);
      })
      .filter((item) => String(item).trim().length > 0);
  }
  return String(value);
}

/**
 * Monta contexto para displayRules/editRules incluindo complementos de campos Sim/Não.
 */
export function buildFieldRuleContext(
  fields: FieldConfig[],
  formValues: Record<string, unknown>,
  options?: { currentStage?: string; userProfileCode?: string },
): RuleEvaluationContext {
  const fieldValues: Record<
    string,
    string | number | boolean | Array<string | number | boolean> | null | undefined
  > = {};

  for (const field of fields) {
    fieldValues[field.key] = normalizeFieldValue(formValues[field.key]);
    if (shouldUseYesNoComplement(field)) {
      const complementKey = getYesNoComplementKey(field.key);
      fieldValues[complementKey] = normalizeFieldValue(formValues[complementKey]);
    }
  }

  for (const [key, value] of Object.entries(formValues ?? {})) {
    if (!(key in fieldValues)) {
      fieldValues[key] = normalizeFieldValue(value);
    }
  }

  return {
    fieldValues,
    currentStage: options?.currentStage ?? '',
    userProfileCode: options?.userProfileCode,
  };
}
