import { SortOrder } from '../../types';

export const CLIENTS_LIST_SORT_STORAGE_KEY = 'contabil.clients.listSort';

/** Espelha `ALLOWED_SORT_FIELDS` em `backend/src/clients/services/list.service.ts`. */
export const CLIENTS_LIST_ALLOWED_SORT_BY = [
  'name',
  'company',
  'cpfCnpj',
  'city',
  'ramo',
  'phone',
  'email',
  'createdAt',
  'updatedAt',
  'lastContactDate',
  'lastActionAt',
  'responsibleUserId',
] as const;

export type ClientsListSortBy = (typeof CLIENTS_LIST_ALLOWED_SORT_BY)[number];

export const DEFAULT_CLIENTS_LIST_SORT: {
  sortBy: ClientsListSortBy;
  sortOrder: SortOrder;
} = {
  sortBy: 'name',
  sortOrder: SortOrder.ASC,
};

function isSortOrder(value: unknown): value is SortOrder {
  return value === SortOrder.ASC || value === SortOrder.DESC;
}

export function readStoredClientsListSort(): {
  sortBy: ClientsListSortBy;
  sortOrder: SortOrder;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CLIENTS_LIST_SORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { sortBy?: unknown; sortOrder?: unknown };
    if (
      typeof parsed.sortBy === 'string' &&
      (CLIENTS_LIST_ALLOWED_SORT_BY as readonly string[]).includes(parsed.sortBy) &&
      isSortOrder(parsed.sortOrder)
    ) {
      return {
        sortBy: parsed.sortBy as ClientsListSortBy,
        sortOrder: parsed.sortOrder,
      };
    }
  } catch {
    // JSON inválido ou storage indisponível
  }
  return null;
}

export function getInitialClientsListSort(): {
  sortBy: string;
  sortOrder: SortOrder;
} {
  return readStoredClientsListSort() ?? DEFAULT_CLIENTS_LIST_SORT;
}

export function persistClientsListSort(sortBy: string, sortOrder: SortOrder): void {
  if (typeof window === 'undefined') return;
  if (
    !(CLIENTS_LIST_ALLOWED_SORT_BY as readonly string[]).includes(sortBy) ||
    !isSortOrder(sortOrder)
  ) {
    return;
  }
  try {
    window.localStorage.setItem(
      CLIENTS_LIST_SORT_STORAGE_KEY,
      JSON.stringify({ sortBy, sortOrder }),
    );
  } catch {
    // quota / modo privado
  }
}
