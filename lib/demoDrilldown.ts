/** Preserve the dashboard cohort instead of dropping filters at the pipe picker. */
export function buildDemoDrilldown(
  path: string,
  range: { dateFrom?: string; dateTo?: string },
  operation: 'general' | 'accounting' | 'financial',
): string {
  const query = new URLSearchParams(path.split('?')[1] || '');
  if (range.dateFrom) query.set('dateFrom', range.dateFrom);
  if (range.dateTo) query.set('dateTo', range.dateTo);
  query.set('dateField', 'createdAt');
  if (operation !== 'general') query.set('pipeId', operation === 'accounting' ? 'demo-accounting' : 'demo-financial');
  query.set('operation', operation);
  return `/demo/oportunidades?${query.toString()}`;
}
