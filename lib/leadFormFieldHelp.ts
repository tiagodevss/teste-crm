import type { FieldConfig } from '../types';

const SCHEDULING_FIELD_HELP: Record<string, string> = {
  melhorHorarioLigacao:
    'Informe período ou dia preferido para contato (ex.: manhã, 08h–12h, quarta-feira).',
};

export function resolveLeadFormFieldHelpText(field: FieldConfig): string | undefined {
  return field.helpText ?? SCHEDULING_FIELD_HELP[field.key];
}

export function withLeadFormFieldHelp(fields: FieldConfig[]): FieldConfig[] {
  return fields.map((field) => ({
    ...field,
    helpText: resolveLeadFormFieldHelpText(field),
  }));
}
