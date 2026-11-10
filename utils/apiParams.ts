import { PaginationParams, SortOrder } from '../types';
export function buildPaginationParams(params: PaginationParams): Record<string, string> {
  const q: Record<string, string> = { page: String(params.page), limit: String(params.limit) };
  if (params.sortBy) { q.sortBy = params.sortBy; q.sortOrder = params.sortOrder ?? SortOrder.ASC; }
  return q;
}
export function parsePaginatedResponse<T>(res: { data: T[]; total: number; page: number; limit: number; totalPages: number }) { return res; }
