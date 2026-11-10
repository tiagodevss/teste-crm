import type { CustomFieldEntry, FieldConfig, Lead } from '../types';
import { getPrivateUploadId } from '../lib/private-upload-id';
import { getYesNoComplementKey, isYesAnswer, shouldUseYesNoComplement, yesNoComplementLabel } from '../lib/yes-no-fields';
export function getNormalizedCustomFields(lead: Lead | null | undefined): CustomFieldEntry[] {
  const raw = lead?.customFields;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { const parsed = JSON.parse(raw) as unknown; return Array.isArray(parsed) ? (parsed as CustomFieldEntry[]) : []; }
    catch { return []; }
  }
  return [];
}
const ATTACHMENT_SEPARATOR = '\n';
export function splitAttachmentValue(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  return raw.split(ATTACHMENT_SEPARATOR).map((item) => item.trim()).filter(Boolean);
}
export function joinAttachmentValue(urls: string[]): string { return urls.join(ATTACHMENT_SEPARATOR); }
export function getAttachmentFormValue(entry: { url?: string; files?: Array<{ url: string }> } | null | undefined): string {
  const urls = entry?.files?.length ? entry.files.map((file) => file.url) : entry?.url ? [entry.url] : [];
  return joinAttachmentValue(urls);
}
export function getCustomFieldValue(lead: Lead | null | undefined, key: string): unknown {
  const entries = getNormalizedCustomFields(lead);
  const entry = entries.find((e) => e.key === key);
  if (entry?.type === 'attachment') return entry.url;
  return entry?.value;
}
function toNumberOrNull(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}
export function usesArrayValue(field: Pick<FieldConfig, 'type' | 'uiConfig' | 'requireAllOptions'>): boolean {
  return field.type === 'multi_select' && (field.uiConfig?.widget === 'checklist' || field.requireAllOptions === true);
}
function normalizeRawValueByType(type: FieldConfig['type'], raw: unknown, arrayValues = false): { value?: string | number | boolean | string[] | null; url?: string; uploadId?: string; files?: Array<{ url: string; uploadId?: string }> } {
  if (type === 'attachment') {
    const urls = splitAttachmentValue(raw);
    const url = urls[0] ?? (typeof raw === 'string' ? raw : undefined);
    const uploadId = getPrivateUploadId(url) ?? undefined;
    const base = uploadId ? { url, uploadId } : { url };
    if (urls.length > 1) return { ...base, files: urls.map((item) => { const id = getPrivateUploadId(item) ?? undefined; return id ? { url: item, uploadId: id } : { url: item }; }) };
    return base;
  }
  if (type === 'checkbox') return { value: Boolean(raw) };
  if (type === 'number' || type === 'currency') return { value: toNumberOrNull(raw) };
  if (type === 'multi_select' || type === 'string_list') {
    if (Array.isArray(raw)) {
      const items = raw.map((item) => String(item).trim()).filter(Boolean);
      return { value: arrayValues ? Array.from(new Set(items)) : items.join(type === 'string_list' ? '\n' : ', ') };
    }
    if (typeof raw === 'string') {
      const items = raw.split(type === 'string_list' ? /\n|;/ : ',').map((item) => item.trim()).filter(Boolean);
      return { value: arrayValues ? Array.from(new Set(items)) : items.join(type === 'string_list' ? '\n' : ', ') };
    }
    return { value: arrayValues ? [] : null };
  }
  if (type === 'info' || raw === undefined || raw === null) return { value: null };
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') return { value: raw };
  return { value: String(raw) };
}
export function buildCustomFieldEntryFromConfig(field: FieldConfig, raw: unknown, stage: string): CustomFieldEntry {
  const normalized = normalizeRawValueByType(field.type, raw, usesArrayValue(field));
  return { key: field.key, label: field.label, type: field.type, stage, ...normalized };
}
export function mergeCustomFieldEntriesForFields(currentEntries: CustomFieldEntry[], fields: FieldConfig[], values: Record<string, unknown>, stage: string): CustomFieldEntry[] {
  const fieldKeys = new Set(fields.map((field) => field.key));
  for (const field of fields) if (shouldUseYesNoComplement(field)) fieldKeys.add(getYesNoComplementKey(field.key));
  const merged = currentEntries.filter((entry) => !fieldKeys.has(entry.key));
  for (const field of fields) {
    merged.push(buildCustomFieldEntryFromConfig(field, values[field.key], stage));
    if (shouldUseYesNoComplement(field) && isYesAnswer(values[field.key])) {
      const complement = values[getYesNoComplementKey(field.key)];
      if (complement != null && String(complement).trim() !== '') merged.push({ key: getYesNoComplementKey(field.key), label: yesNoComplementLabel(field.label), type: 'textarea', stage, value: String(complement) });
    }
  }
  return merged;
}
