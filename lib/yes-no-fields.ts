import type { FieldConfig } from '../types';

const YES_VALUES = new Set(['sim', 'yes', 's', 'true']);
const NO_VALUES = new Set(['não', 'nao', 'no', 'n', 'false']);
const YES_NO_COMPLEMENT_DISABLED_KEYS = new Set([
  'possuiDepartamentoComercial',
  // Na entrada do pipe Contabilidade, a resposta já é suficiente para a triagem.
  'possuiCertificadoDigital',
  'possuiCnpj',
]);

export function getYesNoComplementKey(fieldKey: string): string {
  return `${fieldKey}__complement`;
}

export function isYesNoSelectField(field: FieldConfig): boolean {
  if (field.type !== 'select') return false;
  const options = (field.options ?? []).map((o) => o.trim().toLowerCase());
  if (options.length !== 2) return false;
  const hasYes = options.some((o) => YES_VALUES.has(o));
  const hasNo = options.some((o) => NO_VALUES.has(o));
  return hasYes && hasNo;
}

export function shouldUseYesNoComplement(field: FieldConfig): boolean {
  if (!isYesNoSelectField(field)) return false;
  if (field.uiConfig?.disableYesNoComplement === true) return false;
  if (YES_NO_COMPLEMENT_DISABLED_KEYS.has(field.key)) return false;
  return true;
}

export function isYesAnswer(value: unknown): boolean {
  if (value === true) return true;
  if (value === false || value == null) return false;
  return YES_VALUES.has(String(value).trim().toLowerCase());
}

export function yesNoComplementLabel(fieldLabel: string): string {
  return `${fieldLabel} — informações complementares`;
}
