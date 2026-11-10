import type { ProspectStatus } from '../../../types';
import type { DateFilterOptions } from '../../../utils/formatters';

function isStoredDateRange(value: unknown): value is { start: string; end: string } {
  if (!value || typeof value !== 'object') return false;
  const range = value as Record<string, unknown>;
  return typeof range.start === 'string' && typeof range.end === 'string';
}

export function parseProspectDateFilterOptions(
  raw: string | null,
): DateFilterOptions | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (isStoredDateRange(parsed.compareOneRange)) {
      return { compareOneRange: parsed.compareOneRange };
    }
    if (parsed.compareTwoRanges && typeof parsed.compareTwoRanges === 'object') {
      const two = parsed.compareTwoRanges as Record<string, unknown>;
      if (isStoredDateRange(two.intervalA) && isStoredDateRange(two.intervalB)) {
        return {
          compareTwoRanges: {
            intervalA: two.intervalA,
            intervalB: two.intervalB,
          },
        };
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export interface ProspectUrlFilterState {
  statusQuickFilter: '' | ProspectStatus;
  slaFilter: '' | 'on_time' | 'overdue';
  assignedUserId: string;
  cityFilter: string;
  neighborhoodFilter: string;
  groupFilter: string;
  contactQuickFilter: string;
  sourceTypeFilter: '' | 'manual' | 'import' | 'public' | 'campaign' | 'partner';
  sourceSubtypeFilter: string;
  campaignIdFilter: string;
  partnerIdFilter: string;
  productIdFilter: string;
  existingClientFilter: '' | 'yes' | 'no';
  dateField: 'createdAt' | 'contactDate';
  search: string;
}

export function getProspectUrlFilterState(
  params: URLSearchParams,
): ProspectUrlFilterState {
  const status = params.get('status');
  const statusQuickFilter =
    status === 'pendente' ||
    status === 'contatado' ||
    status === 'convertido' ||
    status === 'nao_no_momento'
      ? (status as ProspectStatus)
      : '';

  const sla = params.get('sla');
  const slaFilter = sla === 'on_time' || sla === 'overdue' ? sla : '';

  const sourceType = params.get('origin');
  const sourceTypeFilter =
    sourceType === 'manual' ||
    sourceType === 'import' ||
    sourceType === 'public' ||
    sourceType === 'campaign' ||
    sourceType === 'partner'
      ? sourceType
      : '';

  const existingClient = params.get('existingClient');
  const existingClientFilter = existingClient === 'yes' || existingClient === 'no' ? existingClient : '';

  return {
    statusQuickFilter,
    slaFilter,
    assignedUserId: params.get('ownerUserId') ?? '',
    cityFilter: params.get('city') ?? '',
    neighborhoodFilter: params.get('neighborhood') ?? '',
    groupFilter: params.get('groupName') ?? '',
    contactQuickFilter: params.get('contactResult') ?? '',
    sourceTypeFilter,
    sourceSubtypeFilter: params.get('sourceSubtype') ?? '',
    campaignIdFilter: params.get('campaignId') ?? '',
    partnerIdFilter: params.get('partnerId') ?? '',
    productIdFilter: params.get('productId') ?? '',
    existingClientFilter,
    dateField: params.get('dateField') === 'contactDate' ? 'contactDate' : 'createdAt',
    search: params.get('search') ?? '',
  };
}

export function getProspectPageFromSearchParams(params: URLSearchParams): number {
  const raw = Number(params.get('page'));
  return Number.isInteger(raw) && raw > 0 ? raw : 1;
}

export function setProspectPageInSearchParams(
  params: URLSearchParams,
  page: number,
): URLSearchParams {
  const next = new URLSearchParams(params);
  if (page > 1) next.set('page', String(page));
  else next.delete('page');
  return next;
}

export function getRestoredProspectPageSize(
  storedLimit: number | null | undefined,
  fallback = 10,
): number {
  return Number.isInteger(storedLimit) && Number(storedLimit) > 0
    ? Number(storedLimit)
    : fallback;
}

export function getValidPageAfterDeletion(input: {
  currentPage: number;
  limit: number;
  total: number;
  deleted: number;
}): number {
  const limit = Math.max(1, input.limit);
  const currentPage = Math.max(1, input.currentPage);
  const remainingTotal = Math.max(0, input.total - Math.max(0, input.deleted));
  const lastValidPage = Math.max(1, Math.ceil(remainingTotal / limit));
  return Math.min(currentPage, lastValidPage);
}

export function getVisibleSelectedIds(
  selectedIds: Iterable<string>,
  visibleIds: Iterable<string>,
): string[] {
  const visible = new Set(visibleIds);
  return [...selectedIds].filter((id) => visible.has(id));
}
