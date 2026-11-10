import type { DateFilterOptions, DateRange } from '../utils/formatters';
export interface IndicatorDateRange { dateFrom?: string; dateTo?: string }
export function isValidCalendarRange(range: DateRange | undefined): range is DateRange {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  return !!range && valid(range.start) && valid(range.end) && range.start <= range.end;
}
/** The selected cohort (A) drives all main charts and drilldowns. B is explicit, never an implicit previous period. */
export function resolveIndicatorPeriods(preset: IndicatorDateRange, options?: DateFilterOptions): { primary: IndicatorDateRange; comparison?: IndicatorDateRange } {
  const pair = options?.compareTwoRanges;
  if (pair && isValidCalendarRange(pair.intervalA) && isValidCalendarRange(pair.intervalB)) {
    return { primary: { dateFrom: pair.intervalA.start, dateTo: pair.intervalA.end }, comparison: { dateFrom: pair.intervalB.start, dateTo: pair.intervalB.end } };
  }
  const single = options?.compareOneRange;
  if (isValidCalendarRange(single)) return { primary: { dateFrom: single.start, dateTo: single.end } };
  return { primary: preset };
}
export function indicatorQuery(range: IndicatorDateRange, responsibleId: string): string {
  const params = new URLSearchParams();
  if (range.dateFrom) params.set('startDate', range.dateFrom);
  if (range.dateTo) params.set('endDate', range.dateTo);
  if (responsibleId) params.set('responsibleId', responsibleId);
  return params.toString();
}
