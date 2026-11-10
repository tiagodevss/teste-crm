import type { FieldConfig } from '../types';

export interface FinanceiraTransitionFields {
  /** Campos exibidos no modal: pendências de saída da etapa atual + campos de entrada da etapa de destino. */
  fields: FieldConfig[];
  /** Chaves que pertencem à etapa de origem (gravadas com o `stage` de origem). */
  sourceKeys: Set<string>;
}

/**
 * Nos funis financeiros as obrigatoriedades `S` (saída) pertencem à etapa de ORIGEM: o operador as
 * completa ao sair dela. Já os campos da etapa de destino só são pedidos quando são de entrada
 * (`validationTiming != 'exit'`), como "Será registrado pela WMS?" ao concluir o Repasse.
 * O backend continua sendo a fonte de verdade da validação.
 */
export function buildFinanceiraTransitionFields(
  sourceFields: FieldConfig[],
  targetFields: FieldConfig[],
): FinanceiraTransitionFields {
  const sourceKeys = new Set<string>();
  const merged = new Map<string, FieldConfig>();

  for (const field of sourceFields) {
    if (field.type === 'info') continue;
    sourceKeys.add(field.key);
    // Na saída da etapa os campos `exit` passam a ser exigidos de verdade.
    merged.set(field.key, {
      ...field,
      required: Boolean(field.required || field.requiredOnExit),
      validationTiming: 'entry',
    });
  }
  for (const field of targetFields) {
    if (field.type === 'info' || merged.has(field.key)) continue;
    if (field.validationTiming === 'exit') continue;
    merged.set(field.key, field);
  }
  return { fields: Array.from(merged.values()), sourceKeys };
}
