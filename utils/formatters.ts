export type FilterPeriod = 'today' | 'week' | 'month' | '60days' | 'all' | 'custom';
export interface DateRange { start: string; end: string; }
export interface DateFilterOptions {
  compareOneRange?: DateRange;
  compareTwoRanges?: { intervalA: DateRange; intervalB: DateRange; };
}
export interface EvolucaoResult { absoluta: number; percentual: number | null; }
export function evolucao(valorA: number, valorB: number): EvolucaoResult {
  const absoluta = valorB - valorA;
  const percentual = valorA === 0 ? (valorB === 0 ? 0 : null) : (absoluta / valorA) * 100;
  return { absoluta, percentual: percentual ?? 0 };
}
export function formatEvolucao(valorA: number, valorB: number, decimals: number = 1): string {
  const { percentual } = evolucao(valorA, valorB);
  if (percentual === null) return valorB === 0 ? '0%' : '—';
  const signal = percentual > 0 ? '+' : '';
  const formatted = percentual.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${signal}${formatted}%`;
}
function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function getDateRangeForFilter(dateFilter: FilterPeriod): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const today = toLocalDateString(now);
  if (dateFilter === 'today') return { dateFrom: today, dateTo: today };
  if (dateFilter === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); return { dateFrom: toLocalDateString(d), dateTo: today }; }
  if (dateFilter === 'month') { const firstDay = new Date(now.getFullYear(), now.getMonth(), 1); return { dateFrom: toLocalDateString(firstDay), dateTo: today }; }
  if (dateFilter === '60days') { const d = new Date(now); d.setDate(d.getDate() - 60); return { dateFrom: toLocalDateString(d), dateTo: today }; }
  return {};
}
function parseToLocalDateOnly(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) { const [y, m, d] = dateStr.split('-').map(Number); return new Date(y, m - 1, d); }
  const date = new Date(dateStr);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
export const isDateInFilter = (dateStr: string | undefined, dateFilter: FilterPeriod): boolean => {
  if (!dateStr) return false;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const target = parseToLocalDateOnly(dateStr); target.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(now.getTime() - target.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  switch (dateFilter) {
    case 'today': return diffDays === 0;
    case 'week': return diffDays <= 7;
    case 'month': return diffDays <= 30;
    case '60days': return diffDays <= 60;
    case 'all': return true;
    default: return true;
  }
};
export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) { const [year, month, day] = dateStr.split('-'); return `${day}/${month}/${year}`; }
  try { return new Intl.DateTimeFormat('pt-BR').format(new Date(dateStr)); } catch { return dateStr; }
};
export const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return '-';
  try { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr)); }
  catch { return dateStr; }
};
export const formatPhone = (value?: string | null): string => {
  if (!value) return '-';
  let d = digitsOnly(value);
  if (d.startsWith('55') && d.length > 11) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length === 0) return '-';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
export const formatPhoneList = (values?: string[] | null): string => {
  if (!values?.length) return '-';
  return values.map((v) => formatPhone(v)).filter((s) => s !== '-').join(' · ') || '-';
};
export const applyPhoneMask = (raw: string): string => {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('55') && d.length > 11) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  const ddd = d.slice(0, 2); const local = d.slice(2);
  if (local.length <= 5) return `(${ddd}) ${local}`;
  return `(${ddd}) ${local.slice(0, 5)}-${local.slice(5)}`;
};
export const applyCurrencyMask = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '0,00';
  const value = parseInt(digits, 10) / 100;
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};
const currencyInputDisplayFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatCurrencyInputDisplay = (value: number | null | undefined): string => {
  const n = value == null || Number.isNaN(Number(value)) ? 0 : Number(value);
  return currencyInputDisplayFormatter.format(n);
};
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatCurrency = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '-';
  const n = typeof value === 'string' ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : Number(value);
  if (Number.isNaN(n)) return '-';
  return currencyFormatter.format(n);
};
export const digitsOnly = (value: string): string => value.replace(/\D/g, '');
export const formatCpf = (value: string): string => {
  const d = digitsOnly(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};
export const formatCnpj = (value: string): string => {
  const d = digitsOnly(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};
export const formatLoginInput = (value: string): string => {
  if (!value) return '';
  if (/[a-zA-Z@]/.test(value)) return value;
  const d = digitsOnly(value);
  if (d.length <= 11) return formatCpf(value);
  return formatCnpj(value);
};
export const unformatLogin = (value: string): string => {
  if (value.includes('@')) return value.trim().toLowerCase();
  return digitsOnly(value);
};
export const formatPercent = (value: number | string | null | undefined, decimals: number = 0): string => {
  if (value === null || value === undefined || value === '') return '-';
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (Number.isNaN(n)) return '-';
  const formatted = n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${formatted}%`;
};
export const formatPercentFlexible = (value: number | string | null | undefined, maxDecimals: number = 2): string => {
  if (value === null || value === undefined || value === '') return '-';
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (Number.isNaN(n)) return '-';
  const formatted = n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: maxDecimals });
  return `${formatted}%`;
};
export function computeDaysWithoutAction(lastActionAt?: string | null, fallbackDate?: string | null): number | undefined {
  const raw = lastActionAt ?? fallbackDate;
  if (!raw) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const diffMs = Date.now() - parsed.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
export function getInactivityCutoffDate(days: number): string {
  const d = new Date();d.setDate(d.getDate() - days);
  const y = d.getFullYear();const m = String(d.getMonth() + 1).padStart(2, '0');const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
