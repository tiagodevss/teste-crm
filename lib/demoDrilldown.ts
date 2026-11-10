/** Preserve the dashboard cohort instead of dropping filters at the pipe picker. */
export function buildDemoDrilldown(
  path: string,
  range: { dateFrom?: string; dateTo?: string },
  operation: 'general' | 'accounting',
): string {
  const query = new URLSearchParams(path.split('?')[1] || '');
  if (range.dateFrom) query.set('dateFrom', range.dateFrom);
  if (range.dateTo) query.set('dateTo', range.dateTo);
  query.set('dateField', 'createdAt');
  if (operation === 'accounting') query.set('pipeId', 'demo-accounting');
  query.set('operation', operation);
  return `/demo/oportunidades?${query.toString()}`;
}
