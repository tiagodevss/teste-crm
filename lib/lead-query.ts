const FILTER_KEYS = [
  'search', 'pipeId', 'status', 'stage', 'origin', 'sourceSubtype',
  'campaignId', 'partnerId', 'productId', 'clientWms', 'dateField',
  'dateFrom', 'dateTo', 'ownerUserId', 'labelId', 'slaStatus', 'temperature',
] as const;
export type LeadFilterQuery = Partial<Record<(typeof FILTER_KEYS)[number], string>> & {
  hasImportDate?: boolean;
};
/** One encoding contract for the list, kanban and summary. */
export function buildLeadFilterQuery(filters: LeadFilterQuery = {}): URLSearchParams {
  const query = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filters[key]?.trim();
    if (value) query.set(key, value);
  }
  if (filters.hasImportDate) query.set('hasImportDate', 'true');
  return query;
}
