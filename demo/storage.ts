import { DEMO_PREFERENCES_KEY } from '../lib/demoPreferences.ts';
import type { DemoDatabase, DemoStorage, DemoResponse } from './types.ts';
import { STORAGE_KEY, SCHEMA_VERSION, SEED_VERSION, DemoError, STATUS, ACCOUNTING_ID } from './types.ts';
import { createSeed, PIPES, USERS } from './seed.ts';
import { execute } from './model.ts';

export function validateDatabase(value: unknown): asserts value is DemoDatabase {
  const db = value as DemoDatabase;
  const validDate = (s: unknown) => typeof s === 'string' && Number.isFinite(Date.parse(s));
  const uniqueIds = (rows: { id: string }[]) => rows.every(row => row && typeof row.id === 'string' && row.id.startsWith('demo-')) && new Set(rows.map(row => row.id)).size === rows.length;
  const fail = () => { throw new DemoError(409, 'O cen\u00e1rio salvo est\u00e1 incompat\u00edvel ou danificado. Restaure a demonstra\u00e7\u00e3o para continuar.'); };
  if (!db || db.schemaVersion !== SCHEMA_VERSION || db.seedVersion !== SEED_VERSION || !validDate(db.referenceDate) || !Number.isSafeInteger(db.revision) || db.revision < 0 || !Number.isSafeInteger(db.sequence) || db.sequence < 0) fail();
  for (const key of ['leads','appointments','labels','notifications'] as const) if (!Array.isArray(db[key]) || db[key].length > 10000 || !uniqueIds(db[key])) fail();
  for (const lead of db.leads) {
    const pipe = PIPES.find(p => p.id === lead.pipeId);
    if (!pipe || !pipe.steps.some(s => s.name === lead.stage) || !Object.values(STATUS).includes(lead.status) || typeof lead.name !== 'string' || !Number.isFinite(lead.value) || lead.value < 0 || !validDate(lead.createdAt) || !USERS.some(u => u.id === lead.ownerUserId)) fail();
    if (!Array.isArray(lead.comments) || !Array.isArray(lead.timeline) || !Array.isArray(lead.stageHistory) || !Array.isArray(lead.customFields) || !Array.isArray(lead.labels)) fail();
    if (lead.labels.some(l => !db.labels.some(x => x.id === l.id && x.pipeId === lead.pipeId))) fail();
  }
  for (const a of db.appointments) if ((a.leadId != null && !db.leads.some(l => l.id === a.leadId)) || (a.type === 'follow_up' && !a.leadId) || !USERS.some(u => u.id === a.ownerUserId) || !validDate(a.scheduledAt) || !['scheduled','completed','canceled','no_show'].includes(a.status)) fail();
  for (const label of db.labels) if (!PIPES.some(p => p.id === label.pipeId) || typeof label.name !== 'string' || !/^#[\da-fA-F]{6}$/.test(label.color)) fail();
}

/** Upgrade the old demo once, preserving accounting records and their activities. */
export function migrateAccountingScenario(value: DemoDatabase, now: Date): DemoDatabase {
  if (value?.schemaVersion !== SCHEMA_VERSION || value.seedVersion !== '2026-11-10.1') return value;
  if (!Array.isArray(value.leads) || !Array.isArray(value.appointments) || !Array.isArray(value.labels)) {
    throw new DemoError(409, 'Cenário anterior inválido. Restaure a demonstração.');
  }
  const seed = createSeed(now);
  const retained = value.leads.filter(lead => lead.pipeId === ACCOUNTING_ID);
  const ids = new Set(retained.map(lead => lead.id));
  const upgraded = {
    ...value, seedVersion: SEED_VERSION, referenceDate: seed.referenceDate, revision: value.revision + 1,
    leads: [...retained, ...seed.leads.filter(lead => lead.pipeId !== ACCOUNTING_ID)],
    labels: [...value.labels.filter(label => label.pipeId === ACCOUNTING_ID), ...seed.labels.filter(label => label.pipeId !== ACCOUNTING_ID)],
    appointments: value.appointments.filter(item => !item.leadId || ids.has(item.leadId)),
    notifications: seed.notifications,
  };
  validateDatabase(upgraded);
  return upgraded;
}

/** Mutations are atomic: validation or storage failures never leave a half-updated in-memory state. */
export function createRepository(storage: DemoStorage, now: () => Date = () => new Date()) {
  let raw: string | null;
  try { raw = storage.getItem(STORAGE_KEY); } catch { throw new DemoError(507, 'O navegador bloqueou o armazenamento local. Permita o armazenamento deste site para usar a demo.'); }
  let db: DemoDatabase;
  if (raw) {
    try { db = migrateAccountingScenario(JSON.parse(raw), now()); validateDatabase(db); } catch (error) { throw error instanceof DemoError ? error : new DemoError(409, 'Os dados locais est\u00e3o ileg\u00edveis. Restaure a demonstra\u00e7\u00e3o para continuar.'); }
    if (JSON.stringify(db) !== raw) {
      try { storage.setItem(STORAGE_KEY, JSON.stringify(db)); storage.removeItem(DEMO_PREFERENCES_KEY); }
      catch { throw new DemoError(507, 'Não foi possível atualizar o cenário local. Libere espaço e tente novamente.'); }
    }
  } else {
    db = createSeed(now()); validateDatabase(db);
    try { storage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch { throw new DemoError(507, 'N\u00e3o foi poss\u00edvel salvar a demo. Libere armazenamento local e tente novamente.'); }
  }
  return {
    snapshot: (): DemoDatabase => structuredClone(db),
    request(method: string, path: string, query = new URLSearchParams(), body: Record<string, any> = {}): DemoResponse {
      if (method === 'GET') return execute(db, method, path, query, body, now());
      // Another tab may read, but cannot overwrite unseen changes. Reload before continuing.
      const saved = storage.getItem(STORAGE_KEY);
      if (!saved || JSON.parse(saved).revision !== db.revision) throw new DemoError(409, 'O cen\u00e1rio mudou em outra aba. Atualize esta p\u00e1gina antes de salvar.');
      const candidate = structuredClone(db);
      const result = execute(candidate, method, path, query, body, now());
      if (result.changed) {
        candidate.revision = db.revision + 1;
        validateDatabase(candidate);
        try { storage.setItem(STORAGE_KEY, JSON.stringify(candidate)); } catch { throw new DemoError(507, 'A altera\u00e7\u00e3o n\u00e3o foi salva: armazenamento local indispon\u00edvel. Libere espa\u00e7o e tente novamente.'); }
        db = candidate;
      }
      return result;
    },
  };
}

/** Never calls storage.clear(): production sessions and unrelated keys are preserved. */
export function clearDemo(storage: DemoStorage): void {
  storage.removeItem(DEMO_PREFERENCES_KEY);
  storage.removeItem(STORAGE_KEY);
}
