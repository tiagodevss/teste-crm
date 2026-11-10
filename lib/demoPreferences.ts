/** Demo preferences are isolated from production and reset as a single unit. */
export const DEMO_PREFERENCES_KEY = 'teste-crm:preferences:v1';
type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
function readEnvelope(storage: PreferenceStorage): Record<string, string> {
  try {
    const value: unknown = JSON.parse(storage.getItem(DEMO_PREFERENCES_KEY) || '{}');
    if (!value || Array.isArray(value) || typeof value !== 'object') return {};
    return Object.fromEntries(Object.entries(value).filter(([, v]) => typeof v === 'string'));
  } catch { return {}; }
}
export function readDatePreference(storage: PreferenceStorage, key: string, demo: boolean): string | null {
  try { return demo ? readEnvelope(storage)[key] ?? null : storage.getItem(key); }
  catch { return null; }
}
export function writeDatePreference(storage: PreferenceStorage, key: string, value: string, demo: boolean): void {
  try {
    if (demo) storage.setItem(DEMO_PREFERENCES_KEY, JSON.stringify({ ...readEnvelope(storage), [key]: value }));
    else storage.setItem(key, value);
  } catch { /* Business data writes report their own storage errors atomically. */ }
}
