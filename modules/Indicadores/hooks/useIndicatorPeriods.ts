import { useLocation } from 'react-router-dom';
import { isDemo } from '../../../config/demo';
import { writeDatePreference } from '../../../lib/demoPreferences';
import { useCallback, useMemo, useState } from 'react';
import { getDateRangeForFilter, type FilterPeriod, type DateFilterOptions } from '../../../utils/formatters';
import { resolveIndicatorPeriods } from '../../../lib/dashboardPeriods';
export function useIndicatorPeriods() {
  const { pathname } = useLocation();
  const [dateFilter, setDateFilter] = useState<FilterPeriod>('60days');
  const [options, setOptions] = useState<DateFilterOptions>();
  const [filterKey, setFilterKey] = useState(0);
  const handleDateFilterChange = useCallback((period: FilterPeriod, next?: DateFilterOptions) => {
    setDateFilter(period);
    setOptions(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
  }, []);
  const resetDateFilter = useCallback(() => {
    writeDatePreference(window.localStorage, `date-filter:${pathname}`, '60days', isDemo);
    setDateFilter('60days'); setOptions(undefined); setFilterKey(key => key + 1);
  }, [pathname]);
  const ranges = useMemo(() => resolveIndicatorPeriods(getDateRangeForFilter(dateFilter), options), [dateFilter, options]);
  return { dateFilter, dateRange: ranges.primary, comparisonRange: ranges.comparison, customPeriod: !!options, filterKey, options, handleDateFilterChange, resetDateFilter };
}
