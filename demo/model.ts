/** Browser-only business simulator. No real integration, random data or fallback API. */
import { getLeadTemperature } from '../lib/lead-temperature.ts';
import type { Lead, LeadAppointment, LeadTimelineEventType } from '../types';
import type { CommercialFeedback } from '../lib/commercial-feedback';
import type { DemoDatabase, DemoLead, DemoResponse, DemoPipe } from './types.ts';
import { DemoError, ACCOUNTING_ID, FINANCIAL_ID, ADMIN_ID, DAY_MS, STATUS } from './types.ts';
import { PIPES, PRODUCTS, USERS, PARTNERS, saoPauloDate } from './seed.ts';

export const DEMO_LOGIN = 'demo@example.invalid';
export const DEMO_PASSWORD = 'demonstracao-local';
export const ACCESS_TOKEN = 'wms-demo-local-access';
export const REFRESH_TOKEN = 'wms-demo-local-refresh';
const tokens = () => ({ accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN, expiresIn: 8 * 3600 });
const isOpen = (l: DemoLead) => l.status !== STATUS.won && l.status !== STATUS.lost;
const sum = (rows: DemoLead[], get: (lead: DemoLead) => number) => rows.reduce((n, lead) => n + get(lead), 0);
const rate = (a: number, b: number) => b ? Math.round(a / b * 1000) / 10 : 0;
const money = (value: number) => Math.round(value * 100) / 100;
const change = (current: number, previous: number) => previous ? rate(current - previous, previous) : 0;
function required(condition: unknown, message: string, status = 400): asserts condition { if (!condition) throw new DemoError(status, message); }
function text(value: unknown, name: string, max = 4000): string {
  required(typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max, `${name}: preencha um texto de 1 a ${max} caracteres.`);
  return value.trim();
}
function date(value: unknown, name: string): string {
  required(typeof value === 'string' && Number.isFinite(Date.parse(value)), `${name}: data inv\u00e1lida.`);
  return new Date(value).toISOString();
}
const nextId = (db: DemoDatabase, prefix: string) => `demo-${prefix}-${++db.sequence}`;
export const getLead = (db: DemoDatabase, id: string): DemoLead => {
  const lead = db.leads.find(l => l.id === id); required(lead, 'Registro demonstrativo n\u00e3o encontrado.', 404); return lead;
};
const getPipe = (id?: string) => { const pipe = PIPES.find(p => p.id === id || p.slug === id); required(pipe, 'Pipe demonstrativo n\u00e3o encontrado.', 404); return pipe; };
const initialFields = (pipe: DemoPipe) => [...pipe.fields, ...pipe.steps[0].fields];
function event(db: DemoDatabase, lead: DemoLead, type: LeadTimelineEventType, description: string, now: string, metadata?: Record<string, unknown>) {
  (lead.timeline ??= []).push({ id: nextId(db, 'event'), type, description, date: now, userId: ADMIN_ID, userName: USERS[0].name, source: 'user', metadata });
  lead.updatedAt = now;
}
function calendar(value?: string): string { return value ? saoPauloDate(new Date(value)) : ''; }
function inDates(value: string | undefined, from: string | null, to: string | null) {
  if (!from && !to) return true;
  if (!value) return false;
  const d = calendar(value);
  return (!from || d >= from.slice(0, 10)) && (!to || d <= to.slice(0, 10));
}
export function sla(lead: DemoLead, now: Date): 'on_time' | 'warning' | 'overdue' {
  if (!isOpen(lead)) return 'on_time';
  const age = (now.getTime() - Date.parse(lead.enteredStageAt || lead.createdAt || now.toISOString())) / DAY_MS;
  return age > 5 ? 'overdue' : age >= 4 ? 'warning' : 'on_time';
}
export function decorateAppointment(db: DemoDatabase, appointment: LeadAppointment): LeadAppointment {
  const lead = db.leads.find(l => l.id === appointment.leadId);
  return { ...appointment, lead: lead && { id: lead.id, name: lead.name, company: lead.company }, ownerUser: USERS.find(u => u.id === appointment.ownerUserId), createdByUser: USERS[0] };
}
export function decorateLead(db: DemoDatabase, lead: DemoLead, now = new Date()): DemoLead {
  const appointments = db.appointments.filter(a => a.leadId === lead.id).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const next = appointments.find(a => a.status === 'scheduled');
  return { ...lead, owner: USERS.find(u => u.id === lead.ownerUserId), responsibleUserId: lead.ownerUserId, slaStatus: sla(lead, now), temperature: getLeadTemperature({ ...lead, temperature: undefined, slaStatus: sla(lead, now) }, now.getTime()), appointments: appointments.map(a => decorateAppointment(db, a)), nextAppointmentAt: next?.scheduledAt, nextAppointmentType: next?.type, nextAppointmentStatus: next?.status };
}
export function filterLeads(db: DemoDatabase, query: URLSearchParams, now = new Date()): DemoLead[] {
  return db.leads.filter(l => {
    const search = query.get('search')?.trim().toLocaleLowerCase('pt-BR');
    if (search && ![l.name, l.company, l.cpfCnpj, l.email, l.phone].some(v => v?.toLocaleLowerCase('pt-BR').includes(search))) return false;
    for (const key of ['pipeId', 'status', 'stage', 'origin', 'sourceSubtype', 'campaignId', 'partnerId', 'productId', 'ownerUserId'] as const) {
      const value = query.get(key); if (value && String(l[key] ?? '') !== value) return false;
    }
    if (query.get('responsibleUserId') && l.ownerUserId !== query.get('responsibleUserId')) return false;
    if (query.get('labelId') && !l.labels?.some(label => label.id === query.get('labelId'))) return false;
    if (query.get('hasImportDate') === 'true' && !l.importDate) return false;
    if (query.get('clientWms') === 'yes' && l.status !== STATUS.won) return false;
    if (query.get('clientWms') === 'no' && l.status === STATUS.won) return false;
    if (query.get('slaStatus') && sla(l, now) !== query.get('slaStatus')) return false;
    if (query.get('temperature') && query.get('temperature') !== getLeadTemperature({ ...l, temperature: undefined, slaStatus: sla(l, now) }, now.getTime())) return false;
    const field = query.get('dateField') === 'lastContactDate' ? 'lastContactDate' : query.get('dateField') === 'importDate' ? 'importDate' : 'createdAt';
    if (!inDates(l[field], query.get('dateFrom'), query.get('dateTo'))) return false;
    if (!inDates(l.createdAt, query.get('createdAtFrom'), query.get('createdAtTo'))) return false;
    for (const key of ['company', 'cpfCnpj', 'email', 'phone', 'city'] as const) {
      const value = query.get(key)?.toLowerCase(); if (value && !String(l[key] ?? '').toLowerCase().includes(value)) return false;
    }
    const inactive = Number(query.get('minDaysWithoutAction') || 0);
    if (inactive > 0 && (now.getTime() - Date.parse(l.lastContactDate || l.createdAt!)) / DAY_MS < inactive) return false;
    return true;
  });
}
export function paginate<T extends object>(rows: T[], query: URLSearchParams) {
  const number = (key: string, fallback: number, max: number) => {
    const n = Number(query.get(key) || fallback); return Number.isFinite(n) ? Math.max(1, Math.min(max, Math.floor(n))) : fallback;
  };
  const limit = number('limit', 20, 500); const requested = number('page', 1, 100000);
  const sortBy = query.get('sortBy') || 'createdAt'; const direction = query.get('sortOrder')?.toLowerCase() === 'asc' ? 1 : -1;
  const sorted = [...rows].sort((a, b) => {
    const av = (a as Record<string, unknown>)[sortBy]; const bv = (b as Record<string, unknown>)[sortBy];
    return String(av ?? '').localeCompare(String(bv ?? ''), 'pt-BR', { numeric: true }) * direction;
  });
  const total = sorted.length; const totalPages = Math.max(1, Math.ceil(total / limit)); const page = Math.min(requested, totalPages);
  return { data: sorted.slice((page - 1) * limit, page * limit), page, limit, total, totalPages };
}
function feedback(lead: DemoLead): CommercialFeedback {
  return { responseDeadline: lead.responseDeadline || null, loss: lead.loss || null, lossStages: getPipe(lead.pipeId).steps.filter(s => s.stageKind === 'loss').map(s => ({ id: s.id, name: s.name })), canEditDeadline: true, canRegisterLoss: isOpen(lead) };
}
function validateOwner(id: unknown): string { required(typeof id === 'string' && USERS.some(u => u.id === id), 'Respons\u00e1vel inv\u00e1lido.'); return id; }
function updateLead(db: DemoDatabase, lead: DemoLead, body: Record<string, any>, now: string) {
  const pipe = getPipe(lead.pipeId);
  for (const key of ['name', 'company', 'email', 'phone', 'cpfCnpj', 'address', 'city', 'ramo', 'kanbanObservation'] as const) {
    if (key in body) {
      required(typeof body[key] === 'string' && body[key].length <= (key === 'kanbanObservation' ? 4000 : 250), `Campo ${key} inv\u00e1lido.`);
      if (key === 'name') text(body[key], 'Nome', 250);
      (lead as any)[key] = body[key].trim();
    }
  }
  if ('value' in body) { required(Number.isFinite(Number(body.value)) && Number(body.value) >= 0, 'Valor inv\u00e1lido.'); lead.value = Number(body.value); }
  if ('ownerUserId' in body || 'responsibleUserId' in body) {
    if ('ownerUserId' in body && 'responsibleUserId' in body) required(body.ownerUserId === body.responsibleUserId, 'Os respons\u00e1veis informados devem ser iguais.');
    lead.ownerUserId = validateOwner(body.ownerUserId ?? body.responsibleUserId);
    lead.responsibleUserId = lead.ownerUserId;
  }
  if ('productId' in body) { const product = PRODUCTS.find(p => p.id === body.productId && p.pipeId === pipe.id); required(product, 'Produto inv\u00e1lido para este pipe.'); lead.productId = product.id; lead.productName = product.name; }
  if ('partnerId' in body) { required(!body.partnerId || PARTNERS.some(p => p.id === body.partnerId), 'Parceiro inv\u00e1lido.'); lead.partnerId = body.partnerId || undefined; }
  if (Array.isArray(body.customFields)) {
    required(body.customFields.length <= 30 && body.customFields.every((f: any) => f && typeof f.key === 'string' && (f.value == null || ['string','number','boolean'].includes(typeof f.value))), 'Campos personalizados inv\u00e1lidos.');
    lead.customFields = body.customFields.filter((f: any) => f.value != null && initialFields(pipe).some(p => p.key === f.key)).map((f: any) => { const field = initialFields(pipe).find(p => p.key === f.key)!; return { key: f.key, label: field.label, type: field.type as any, stage: pipe.steps[0].name, value: f.value }; });
  }
  if (body.stage && body.stage !== lead.stage) {
    const current = pipe.steps.find(s => s.name === lead.stage)!;
    const target = pipe.steps.find(s => s.name === body.stage);
    required(target, 'Etapa inv\u00e1lida.');
    required(pipe.actions.some(a => a.fromStepId === current.id && a.toStepId === target.id), 'Transi\u00e7\u00e3o n\u00e3o permitida neste cen\u00e1rio.');
    if (target.stageKind === 'win') required(lead.cpfCnpj && lead.kanbanObservation?.trim(), 'Preencha o documento fict\u00edcio e a observa\u00e7\u00e3o da convers\u00e3o.');
    if (target.stageKind === 'loss') required(lead.loss, 'Use Registrar perda e informe o motivo.');
    const oldStage = lead.stage;
    lead.stage = target.name; lead.enteredStageAt = now;
    lead.status = (target.stageKind === 'win' ? STATUS.won : target.stageKind === 'loss' ? STATUS.lost : target.sortOrder === 0 ? STATUS.lead : STATUS.opportunity) as Lead['status'];
    lead.closedAt = isOpen(lead) ? undefined : now;
    const last = lead.stageHistory?.find(h => !h.exitedAt); if (last) last.exitedAt = now;
    (lead.stageHistory ??= []).push({ id: nextId(db, 'stage'), stageName: lead.stage, enteredAt: now, slaStatus: 'on_time' });
    event(db, lead, target.stageKind === 'win' ? 'conversion' : 'stage_change', `Etapa alterada de ${oldStage} para ${lead.stage}.`, now, { fromStage: oldStage, toStage: lead.stage });
  }
  if (body.contactAttempt) {
    const c = body.contactAttempt;
    const contactDate = date(c.contactDate, 'Data do atendimento');
    required(Date.parse(contactDate) <= Date.parse(now) + 60000, 'O atendimento n\u00e3o pode estar no futuro.');
    const notes = typeof c.notes === 'string' ? c.notes.trim() : '';
    required(notes.length <= 4000, 'Detalhamento limitado a 4.000 caracteres.');
    const result = text(c.result, 'Resultado', 100); const channel = text(c.channel, 'Canal', 50);
    lead.lastContactDate = contactDate;
    event(db, lead, 'contact_attempt', `${result} (${channel}). ${notes}`.trim(), contactDate, { ...c, notes, contactDate });
    if (c.followUpDate) {
      const scheduledAt = date(c.followUpDate, 'Retorno');
      required(Date.parse(scheduledAt) > Date.parse(now) && scheduledAt > contactDate, 'O retorno deve ser futuro e posterior ao atendimento.');
      createAppointment(db, { leadId: lead.id, ownerUserId: lead.ownerUserId || ADMIN_ID, type: 'follow_up', channel: channel === 'telefone' ? 'phone' : channel, scheduledAt, notes }, now);
    }
  }
  lead.demoRevenue = lead.status === STATUS.won ? money(lead.pipeId === ACCOUNTING_ID ? lead.value : lead.value * .02) : 0;
  lead.updatedAt = now;
  return decorateLead(db, lead, new Date(now));
}
function createAppointment(db: DemoDatabase, body: Record<string, any>, now: string) {
  const type = text(body.type, 'Tipo', 50);
  required(type !== 'follow_up' || body.leadId, 'Vincule um lead para registrar o retorno no hist\u00f3rico.');
  const lead = body.leadId ? getLead(db, String(body.leadId)) : undefined;
  const scheduledAt = date(body.scheduledAt, 'Data agendada');
  const endsAt = body.endsAt ? date(body.endsAt, 'Fim') : undefined;
  required(!endsAt || endsAt > scheduledAt, 'O fim deve ser posterior ao in\u00edcio.');
  const item: LeadAppointment = { id: nextId(db, 'appointment'), leadId: lead?.id, ownerUserId: validateOwner(body.ownerUserId), type, channel: text(body.channel, 'Canal', 50), scheduledAt, endsAt, status: 'scheduled', notes: String(body.notes || '').slice(0, 4000), location: String(body.location || '').slice(0, 250), createdAt: now, updatedAt: now, createdBy: ADMIN_ID };
  db.appointments.push(item); if (lead) event(db, lead, 'appointment_scheduled', 'Atividade demonstrativa agendada.', now, { appointmentId: item.id, scheduledAt });
  return decorateAppointment(db, item);
}

/** Metrics use a creation-date cohort shared with CRM. Revenue is not credit principal. */
export function indicators(db: DemoDatabase, kind: string, query: URLSearchParams, now = new Date()) {
  const filter = new URLSearchParams();
  if (query.get('startDate')) filter.set('dateFrom', query.get('startDate')!);
  if (query.get('endDate')) filter.set('dateTo', query.get('endDate')!);
  if (query.get('responsibleId')) filter.set('ownerUserId', query.get('responsibleId')!);
  const all = filterLeads(db, filter, now);
  const prevFilter = new URLSearchParams(filter);
  const start = query.get('startDate'); const end = query.get('endDate');
  let previous: DemoLead[] = [];
  if (start && end) {
    const startMs = Date.parse(start.slice(0, 10)); const duration = Date.parse(end.slice(0, 10)) - startMs + DAY_MS;
    if (Number.isFinite(duration) && duration > 0) { prevFilter.set('dateFrom', new Date(startMs - duration).toISOString().slice(0, 10)); prevFilter.set('dateTo', new Date(startMs - DAY_MS).toISOString().slice(0, 10)); previous = filterLeads(db, prevFilter, now); }
  }
  const won = (rows: DemoLead[]) => rows.filter(l => l.status === STATUS.won);
  const revenue = (rows: DemoLead[]) => money(sum(won(rows), l => l.pipeId === ACCOUNTING_ID ? l.value : l.value * .02));
  const alerts = (rows: DemoLead[]) => rows.filter(l => sla(l, now) === 'overdue').length;
  const stats = (rows: DemoLead[], prev: DemoLead[]) => {
    const wins = won(rows); const priorWins = won(prev); const conv = rate(wins.length, rows.length);
    return { count: rows.length, countChange: change(rows.length, prev.length), wins: wins.length, winsChange: change(wins.length, priorWins.length), revenue: revenue(rows), revenueChange: change(revenue(rows), revenue(prev)), conversion: conv, conversionChange: money(conv - rate(priorWins.length, prev.length)), alerts: alerts(rows) };
  };
  const accounting = all.filter(l => l.pipeId === ACCOUNTING_ID); const financial = all.filter(l => l.pipeId === FINANCIAL_ID);
  const a = stats(accounting, previous.filter(l => l.pipeId === ACCOUNTING_ID)); const f = stats(financial, previous.filter(l => l.pipeId === FINANCIAL_ID)); const g = stats(all, previous);
  const financialValue = sum(won(financial), l => l.value);
  if (kind === 'general') {
    const firstMonth = all.map(l => calendar(l.createdAt).slice(0, 7)).sort()[0] || calendar(now.toISOString()).slice(0, 7);
    const endMonth = (end || calendar(now.toISOString())).slice(0, 7);
    const months: string[] = [];
    const cursor = new Date(`${firstMonth}-01T12:00:00Z`);
    while (cursor.toISOString().slice(0, 7) <= endMonth && months.length < 120) { months.push(cursor.toISOString().slice(0, 7)); cursor.setUTCMonth(cursor.getUTCMonth() + 1); }
    return {
      summary: { healthScore: all.length ? Math.max(0, Math.round(100 - rate(g.alerts, all.length))) : 0, healthStatus: !all.length || g.alerts ? 'ATTENTION' : 'GOOD', totalLeads: g.count, totalLeadsChange: g.countChange, openOpportunities: all.filter(l => l.status === STATUS.opportunity).length, totalRevenue: g.revenue, totalRevenueChange: g.revenueChange, conversionRate: g.conversion, conversionRateChange: g.conversionChange, criticalAlerts: g.alerts },
      accounting: { totalLeads: a.count, totalLeadsChange: a.countChange, clientsActivated: a.wins, recurringRevenue: a.revenue, conversionRate: a.conversion, alertsCount: a.alerts },
      financial: { totalLeads: f.count, totalLeadsChange: f.countChange, releases: f.wins, releasedValue: financialValue, approvalRate: f.conversion, alertsCount: f.alerts },
      evolution: months.map(month => { const rows = all.filter(l => calendar(l.createdAt).startsWith(month)); return { label: `${month.slice(5)}/${month.slice(2, 4)}`, totalLeads: rows.length, accountingLeads: rows.filter(l => l.pipeId === ACCOUNTING_ID).length, financialLeads: rows.filter(l => l.pipeId === FINANCIAL_ID).length, totalRevenue: revenue(rows), conversionRate: rate(won(rows).length, rows.length), criticalAlerts: alerts(rows) }; }),
      operationShare: [{ operation: 'Contabilidade', leads: a.count, revenue: a.revenue, alertsCount: a.alerts, conversionRate: a.conversion }, { operation: 'Financeira', leads: f.count, revenue: f.revenue, alertsCount: f.alerts, conversionRate: f.conversion }],
    };
  }
  const rows = kind === 'accounting' ? accounting : financial;
  const pipe = getPipe(kind === 'accounting' ? ACCOUNTING_ID : FINANCIAL_ID);
  const counts = pipe.steps.map(s => rows.filter(l => l.stage === s.name));
  const funnel = pipe.steps.map((s, i) => ({ stage: s.name, count: counts[i].length, value: sum(counts[i], l => l.value), percentOfTotal: rate(counts[i].length, rows.length), conversionFromPrev: i === 0 ? 100 : rate(rows.filter(l => l.stageHistory?.some(h => h.stageName === s.name) && l.stageHistory?.some(h => h.stageName === pipe.steps[i - 1].name)).length, rows.filter(l => l.stageHistory?.some(h => h.stageName === pipe.steps[i - 1].name)).length) }));
  // Current inventory counts and historical progression are separate: transition percentages use unique historical visitors.
  if (kind === 'accounting') return {
    summary: { leadsReceived: a.count, leadsReceivedChange: a.countChange, proposalsSent: rows.filter(l => l.stageHistory?.some(h => h.stageName === pipe.steps[2].name)).length, proposalsAccepted: a.wins, contractsSigned: a.wins, clientsActivated: a.wins, clientsActivatedChange: a.winsChange, recurringRevenue: a.revenue, recurringRevenueChange: a.revenueChange, averageTicket: a.wins ? money(a.revenue / a.wins) : 0, conversionRate: a.conversion, conversionRateChange: a.conversionChange },
    funnel, ranking: USERS.map(u => { const selected = rows.filter(l => l.ownerUserId === u.id); return { userId: u.id, name: u.name, leads: selected.length, clients: won(selected).length, revenue: revenue(selected), conversionRate: rate(won(selected).length, selected.length) }; }), alertsCount: a.alerts,
  };
  required(kind === 'financial', 'Indicador indispon\u00edvel.', 404);
  const prevValue = sum(won(previous.filter(l => l.pipeId === FINANCIAL_ID)), l => l.value);
  return { summary: { financialLeads: f.count, financialLeadsChange: f.countChange, releases: f.wins, releasesChange: f.winsChange, forecastValue: sum(rows.filter(isOpen), l => l.value), releasedValue: financialValue, releasedValueChange: change(financialValue, prevValue), pendingValue: sum(rows.filter(isOpen), l => l.value), averageTicket: f.wins ? money(financialValue / f.wins) : 0, approvalRate: f.conversion, approvalRateChange: f.conversionChange }, funnel, ranking: USERS.map(u => { const selected = rows.filter(l => l.ownerUserId === u.id); return { userId: u.id, name: u.name, leads: selected.length, released: won(selected).length, releasedValue: sum(won(selected), l => l.value), approvalRate: rate(won(selected).length, selected.length) }; }), alertsCount: f.alerts };
}

/** Route coverage is explicit. Unimplemented operations are never forwarded or silently accepted. */
export function execute(db: DemoDatabase, method: string, pathname: string, query = new URLSearchParams(), body: Record<string, any> = {}, now = new Date()): DemoResponse {
  const at = now.toISOString(); const read = method === 'GET';
  const ok = (result: unknown, status = 200): DemoResponse => ({ status, body: result, changed: !read });
  if (pathname === '/auth/login' && method === 'POST') { required(body.login === DEMO_LOGIN && body.password === DEMO_PASSWORD, 'Use o bot\u00e3o Entrar na demonstra\u00e7\u00e3o.', 401); return { status: 200, body: { user: USERS[0], ...tokens() } }; }
  if (pathname === '/auth/refresh' && method === 'POST') { required(body.refreshToken === REFRESH_TOKEN, 'Sess\u00e3o demo inv\u00e1lida.', 401); return { status: 200, body: tokens() }; }
  if (pathname === '/auth/logout' && method === 'POST') return { status: 200, body: { ok: true } };
  if (pathname === '/auth/me' && read) return ok(USERS[0]);
  if (pathname === '/settings/public' && read) return ok({ pipes: PIPES, branding: { appName: 'WMS Empresarial - Demonstra\u00e7\u00e3o', appNameShort: 'WMS Demo', copyright: 'Dados fict\u00edcios. Nenhuma opera\u00e7\u00e3o externa.' } });
  if (pathname === '/settings' && read) return ok({ slaDays: 5 });
  if (pathname === '/users' && read) return ok(paginate(USERS.filter(u => !query.get('search') || u.name.toLowerCase().includes(query.get('search')!.toLowerCase())), query));
  if (pathname === '/products' && read) return ok(paginate(PRODUCTS.filter(p => !query.get('pipeId') || p.pipeId === query.get('pipeId')), query));
  if (pathname === '/product-groups' && read) return ok([{ id: 'demo-group', name: 'Servi\u00e7os demonstrativos' }]);
  if (pathname === '/partners' && read) return ok(PARTNERS);
  if (pathname === '/service-units' && read) return ok(paginate([{ id: 'demo-unit', name: 'Unidade demonstrativa', active: true }], query));
  if (pathname === '/campaigns' && read) return ok(paginate([], query));
  if (pathname === '/financeira/settings' && read) return ok({ creditoPipeId: '', repassePipeId: '', creditoDefaultProductId: '', automaticSiopiRoutingEnabled: false, whatsappConfigured: false });
  if (pathname === '/pdf-templates' && read) return ok([]);
  if (pathname === '/notifications' && read) return ok(db.notifications);
  if (pathname === '/notifications/read-all' && method === 'PATCH') { db.notifications.forEach(n => { n.read = true; }); return ok({ count: db.notifications.length }); }
  if (pathname.startsWith('/indicators/') && read) return ok(indicators(db, pathname.split('/')[2], query, now));
  if (pathname === '/leads/summary' && read) { const rows = filterLeads(db, query, now); return ok({ total: rows.length, opportunities: rows.filter(l => l.status === STATUS.opportunity).length }); }
  if (pathname === '/leads/count-by-stage' && read) { const rows = filterLeads(db, query, now); return ok(Object.fromEntries(getPipe(query.get('pipeId') || ACCOUNTING_ID).steps.map(s => [s.name, rows.filter(l => l.stage === s.name).length]))); }
  if (pathname === '/leads/stage-options' && read) return ok([...new Set(db.leads.map(l => l.stage))]);
  if ((pathname === '/leads' || pathname === '/clients') && read) {
    const filters = new URLSearchParams(query);
    // Client list labels these bounds as last contact; CRM keeps creation-date defaults.
    if (pathname === '/clients' && !filters.has('dateField')) filters.set('dateField', 'lastContactDate');
    const rows = filterLeads(db, filters, now).filter(l => pathname === '/leads' || l.status === STATUS.won).map(l => decorateLead(db, l, now));
    return ok(paginate(rows, query));
  }
  if (pathname === '/leads' && method === 'POST') {
    const pipe = getPipe(body.pipeId); const id = nextId(db, 'lead');
    const lead: DemoLead = { id, name: text(body.name, 'Nome', 250), pipeId: pipe.id, businessUnit: pipe.unitType, status: STATUS.lead as Lead['status'], stage: pipe.steps[0].name, value: 0, ownerUserId: ADMIN_ID, responsibleUserId: ADMIN_ID, origin: 'manual', sourceType: 'manual', sourceSubtype: 'demonstracao', createdAt: at, updatedAt: at, enteredStageAt: at, comments: [], timeline: [], stageHistory: [{ id: nextId(db, 'stage'), stageName: pipe.steps[0].name, enteredAt: at, slaStatus: 'on_time' }], labels: [], customFields: [] };
    db.leads.push(lead); updateLead(db, lead, { ...body, stage: pipe.steps[0].name }, at);
    for (const field of initialFields(pipe).filter(f => f.required)) required(lead.customFields?.some(f => f.key === field.key && f.value != null && String(f.value).trim()), `Preencha ${field.label}.`);
    event(db, lead, 'created', 'Oportunidade demonstrativa criada.', at); return ok(decorateLead(db, lead, now), 201);
  }
  if (pathname === '/lead-appointments/leads/search' && read) {
    const requested = Number(query.get('limit') || 20);
    const limit = Number.isFinite(requested) ? Math.min(100, Math.max(1, Math.floor(requested))) : 20;
    const rows = filterLeads(db, query, now).filter(l => !query.has('id') || l.id === query.get('id'));
    return ok(rows.slice(0, limit).map(l => ({ id: l.id, name: l.name, company: l.company, stage: l.stage })));
  }
  if (pathname === '/lead-appointments' && read) {
    const rows = db.appointments.filter(a => ['ownerUserId','leadId','status','type'].every(key => !query.get(key) || (a as any)[key] === query.get(key)) && inDates(a.scheduledAt, query.get('dateFrom'), query.get('dateTo')));
    return ok(paginate(rows.map(a => decorateAppointment(db, a)), query));
  }
  if (pathname === '/lead-appointments' && method === 'POST') return ok(createAppointment(db, body, at), 201);
  if (pathname === '/lead-labels' && read) return ok(db.labels.filter(l => !query.get('pipeId') || l.pipeId === query.get('pipeId')));
  if (pathname === '/lead-labels' && method === 'POST') {
    const pipe = getPipe(body.pipeId); const name = text(body.name, 'Etiqueta', 80);
    required(/^#[\da-fA-F]{6}$/.test(body.color), 'Cor inv\u00e1lida.');
    const label = { id: nextId(db, 'label'), pipeId: pipe.id, name, color: body.color, sortOrder: db.labels.length, isActive: true }; db.labels.push(label); return ok(label, 201);
  }
  const parts = pathname.split('/').filter(Boolean); const [resource, id, action] = parts;
  if (resource === 'pipes' && id && read) return ok(getPipe(id));
  if (['lead', 'leads', 'clients'].includes(resource) && id) {
    const lead = getLead(db, id);
    if (resource === 'clients') required(lead.status === STATUS.won, 'Cliente n\u00e3o encontrado.', 404);
    if (!action && read) return ok(decorateLead(db, lead, now));
    if (!action && ['PUT', 'PATCH'].includes(method)) return ok(updateLead(db, lead, body, at));
    if (action === 'commercial-feedback' && read) return ok(feedback(lead));
    if (action === 'response-deadline' && method === 'PUT') {
      const value = body.responseDeadline;
      required(value === null || typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value, 'Data limite inv\u00e1lida.');
      lead.responseDeadline = value; event(db, lead, 'response_deadline_changed', value ? `Prazo de resposta: ${value}.` : 'Prazo removido.', at); return ok(feedback(lead));
    }
    if (action === 'comments' && method === 'POST') {
      const comment = { id: nextId(db, 'comment'), text: text(body.text, 'Coment\u00e1rio'), date: at, userId: ADMIN_ID, userName: USERS[0].name, userInitials: 'AD' }; (lead.comments ??= []).push(comment); lead.updatedAt = at; return ok(comment, 201);
    }
    if (action === 'loss' && method === 'POST') {
      required(isOpen(lead), 'Oportunidade j\u00e1 conclu\u00edda.');
      const step = getPipe(lead.pipeId).steps.find(s => s.id === body.targetStageId && s.stageKind === 'loss'); required(step, 'Etapa de perda inv\u00e1lida.');
      required(['proposal','price','competitor','timing','no_interest','other'].includes(body.category), 'Motivo inv\u00e1lido.');
      const description = text(body.description, 'Motivo da perda'); required(description.length >= 10, 'Descreva o motivo com pelo menos 10 caracteres.');
      lead.loss = { category: body.category, description, lostAt: at, fromStage: lead.stage, stage: step.name };
      updateLead(db, lead, { stage: step.name }, at);
      for (const appointment of db.appointments) {
        if (appointment.leadId !== lead.id || appointment.type !== 'follow_up' || appointment.status !== 'scheduled') continue;
        appointment.status = 'canceled'; appointment.canceledAt = at; appointment.updatedAt = at;
        event(db, lead, 'appointment_updated', 'Retorno cancelado ap\u00f3s o registro de perda.', at, { appointmentId: appointment.id, status: 'canceled' });
      }
      return ok(decorateLead(db, lead, now));
    }
  }
  if (resource === 'lead-appointments' && id) {
    const index = db.appointments.findIndex(a => a.id === id); required(index >= 0, 'Atividade n\u00e3o encontrada.', 404); const item = db.appointments[index]; const previousLead = item.leadId ? getLead(db, item.leadId) : undefined;
    if (method === 'DELETE') { db.appointments.splice(index, 1); if (previousLead) event(db, previousLead, 'appointment_removed', 'Atividade removida.', at); return ok({ ok: true }); }
    if (method === 'PATCH') {
      if ('leadId' in body) item.leadId = body.leadId ? getLead(db, String(body.leadId)).id : undefined;
      if (body.ownerUserId) item.ownerUserId = validateOwner(body.ownerUserId);
      if (body.scheduledAt) item.scheduledAt = date(body.scheduledAt, 'Data agendada');
      if ('endsAt' in body) item.endsAt = body.endsAt ? date(body.endsAt, 'Fim') : undefined;
      required(!item.endsAt || item.endsAt > item.scheduledAt, 'O fim deve ser posterior ao in\u00edcio.');
      for (const key of ['type', 'channel', 'notes', 'location'] as const) if (key in body) item[key] = String(body[key] || '').slice(0, key === 'notes' ? 4000 : 250);
      if (body.status) { required(['scheduled','completed','canceled','no_show'].includes(body.status), 'Status inv\u00e1lido.'); item.status = body.status; item.completedAt = item.status === 'completed' ? at : undefined; item.canceledAt = item.status === 'canceled' ? at : undefined; }
      required(item.type !== 'follow_up' || item.leadId, 'Vincule um lead para registrar o retorno no hist\u00f3rico.');
      item.updatedAt = at;
      const lead = item.leadId ? getLead(db, item.leadId) : undefined;
      if (previousLead && previousLead.id !== lead?.id) event(db, previousLead, 'appointment_updated', 'Atividade desvinculada deste lead.', at, { appointmentId: item.id });
      if (lead) event(db, lead, 'appointment_updated', 'Atividade demonstrativa atualizada.', at, { appointmentId: item.id });
      return ok(decorateAppointment(db, item));
    }
  }
  if (resource === 'lead-labels' && id === 'lead' && action) {
    const lead = getLead(db, action);
    if (read) return ok(lead.labels || []);
    if (method === 'PUT') { required(Array.isArray(body.labelIds) && body.labelIds.every((lid: string) => db.labels.some(l => l.id === lid && l.pipeId === lead.pipeId)), 'Etiquetas inv\u00e1lidas.'); lead.labels = db.labels.filter(l => body.labelIds.includes(l.id)); return ok(lead.labels); }
  }
  if (resource === 'lead-labels' && id === 'step' && read) return ok([]);
  if (resource === 'lead-labels' && id && method === 'PUT') {
    const label = db.labels.find(l => l.id === id); required(label, 'Etiqueta n\u00e3o encontrada.', 404);
    if (body.name) label.name = text(body.name, 'Etiqueta', 80); if (body.color) { required(/^#[\da-fA-F]{6}$/.test(body.color), 'Cor inv\u00e1lida.'); label.color = body.color; }
    for (const lead of db.leads) lead.labels = lead.labels?.map(l => l.id === id ? { ...label } : l); return ok(label);
  }
  if (resource === 'lead-labels' && id && method === 'DELETE') { db.labels = db.labels.filter(l => l.id !== id); for (const lead of db.leads) lead.labels = lead.labels?.filter(l => l.id !== id); return ok({ ok: true }); }
  if (resource === 'notifications' && id && action === 'read' && method === 'PATCH') { const item = db.notifications.find(n => n.id === id); required(item, 'Notifica\u00e7\u00e3o n\u00e3o encontrada.', 404); item.read = true; return ok(item); }
  throw new DemoError(501, `Opera\u00e7\u00e3o fora do escopo da demonstra\u00e7\u00e3o: ${method} ${pathname}. Nenhum servi\u00e7o externo foi chamado.`);
}
