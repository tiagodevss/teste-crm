import type { FieldConfig } from '../types';

export interface StageTransitionFields {
  /** Campos que precisam ser preenchidos nesta movimentação. */
  fields: FieldConfig[];
  /** Campos da etapa de origem, que devem manter a etapa de gravação original. */
  sourceKeys: Set<string>;
}

/**
 * Combina as exigências de saída da etapa atual com as exigências de entrada
 * da próxima etapa. O backend usa exatamente essa separação ao validar uma
 * transição; sem ela o modal podia bloquear por um campo que não oferecia ao
 * operador para preenchimento.
 */
export function buildStageTransitionFields(
  sourceFields: FieldConfig[],
  targetFields: FieldConfig[],
): StageTransitionFields {
  const sourceKeys = new Set<string>();
  const merged = new Map<string, FieldConfig>();

  for (const field of sourceFields) {
    if (field.type === 'info') continue;
    if (field.validationTiming !== 'exit' && !field.requiredOnExit) continue;
    sourceKeys.add(field.key);
    // O campo é obrigatório agora (na transição), e não numa edição comum.
    merged.set(field.key, {
      ...field,
      required: Boolean(field.required || field.requiredOnExit),
      validationTiming: 'entry',
    });
  }

  for (const field of targetFields) {
    if (field.type === 'info' || merged.has(field.key)) continue;
    // Exigências de saída do destino pertencem a uma movimentação futura.
    if (field.validationTiming === 'exit') continue;
    merged.set(field.key, field);
  }

  return { fields: Array.from(merged.values()), sourceKeys };
}
