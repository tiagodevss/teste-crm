import type { FieldConfig, PipeFieldDto } from '../types';

type ApiField = Pick<
  PipeFieldDto,
  | 'key'
  | 'label'
  | 'type'
  | 'required'
  | 'placeholder'
  | 'options'
  | 'helpText'
  | 'section'
  | 'validation'
  | 'metadata'
  | 'displayRules'
  | 'editRules'
  | 'requiredRules'
  | 'permissionRules'
  | 'isActive'
>;

function safeParse<T>(raw: string | null | undefined): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Converte a definição persistida (strings JSON) em FieldConfig de runtime. */
export function parseApiFieldConfig(f: ApiField): FieldConfig {
  const metadata = safeParse<Record<string, unknown>>(f.metadata) ?? {};
  const defaultValue = metadata.defaultValue;
  const timing = metadata.validationTiming;
  return {
    key: f.key,
    label: f.label,
    type: f.type as FieldConfig['type'],
    required: f.required,
    placeholder: f.placeholder ?? undefined,
    options: safeParse<string[]>(f.options),
    helpText: f.helpText ?? undefined,
    section: f.section ?? undefined,
    validation: safeParse<FieldConfig['validation']>(f.validation),
    defaultValue:
      typeof defaultValue === 'string' ||
      typeof defaultValue === 'number' ||
      typeof defaultValue === 'boolean'
        ? defaultValue
        : undefined,
    multiple: typeof metadata.multiple === 'boolean' ? metadata.multiple : undefined,
    format: typeof metadata.format === 'string' ? metadata.format : undefined,
    sourceConfig: isRecord(metadata.sourceConfig) ? metadata.sourceConfig : undefined,
    uiConfig: isRecord(metadata.uiConfig) ? metadata.uiConfig : undefined,
    displayRules: safeParse<FieldConfig['displayRules']>(f.displayRules),
    editRules: safeParse<FieldConfig['editRules']>(f.editRules),
    requiredRules: safeParse<FieldConfig['requiredRules']>(f.requiredRules),
    permissionRules: safeParse<FieldConfig['permissionRules']>(f.permissionRules),
    validationTiming: timing === 'exit' || timing === 'entry' ? timing : undefined,
    requireAllOptions: metadata.requireAllOptions === true ? true : undefined,
    requiredOnExit: metadata.requiredOnExit === true ? true : undefined,
  };
}

/** Campos operacionais: ignora definições aposentadas (`isActive=false`). */
export function parseActiveApiFields(fields: ApiField[] | undefined): FieldConfig[] {
  return (fields ?? []).filter((f) => f.isActive !== false).map(parseApiFieldConfig);
}

/** Definições aposentadas — usadas apenas para exibir "Dados anteriores" (somente leitura). */
export function parseInactiveApiFields(fields: ApiField[] | undefined): FieldConfig[] {
  return (fields ?? []).filter((f) => f.isActive === false).map(parseApiFieldConfig);
}
