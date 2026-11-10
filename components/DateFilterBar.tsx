import { isValidCalendarRange } from '../lib/dashboardPeriods';
import { isDemo } from '../config/demo';
import { readDatePreference, writeDatePreference } from '../lib/demoPreferences';
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Calendar, ArrowRightLeft, GitCompare } from 'lucide-react';
import type { FilterPeriod, DateFilterOptions } from '../utils/formatters';
import { FormDatePicker } from './ui/FormInputs';
import { Modal, ModalHeader, ModalFooter } from './ui/Modal';
import { formatDate } from '../utils/formatters';

export type { FilterPeriod, DateFilterOptions };

type CompareMode = 'none' | 'one' | 'two';
interface OneRangeForm { compareStart: string; compareEnd: string; }
interface TwoRangesForm { startA: string; endA: string; startB: string; endB: string; }
interface DateFilterBarProps {
  onFilterChange: (period: FilterPeriod, options?: DateFilterOptions) => void;
  period?: FilterPeriod;
  storageKey?: string;
  initialOptions?: DateFilterOptions;
  className?: string;
}
const DEFAULT_PERIOD: FilterPeriod = '60days';
function isFilterPeriod(value: string | null): value is FilterPeriod {
  return value === 'today' || value === 'week' || value === 'month' || value === '60days' || value === 'all';
}
function buildOptions(mode: CompareMode, oneRange: OneRangeForm, twoRanges: TwoRangesForm): DateFilterOptions | undefined {
  if (mode === 'one' && isValidCalendarRange({ start: oneRange.compareStart, end: oneRange.compareEnd })) {
    return { compareOneRange: { start: oneRange.compareStart, end: oneRange.compareEnd } };
  }
  if (mode === 'two' && isValidCalendarRange({ start: twoRanges.startA, end: twoRanges.endA }) && isValidCalendarRange({ start: twoRanges.startB, end: twoRanges.endB })) {
    return { compareTwoRanges: { intervalA: { start: twoRanges.startA, end: twoRanges.endA }, intervalB: { start: twoRanges.startB, end: twoRanges.endB } } };
  }
  return undefined;
}
function formatRangeLabel(start: string, end: string): string {
  if (!start || !end) return '';
  return `${formatDate(start)} – ${formatDate(end)}`;
}
function initialCompareMode(options?: DateFilterOptions): CompareMode {
  if (options?.compareTwoRanges) return 'two';
  if (options?.compareOneRange) return 'one';
  return 'none';
}
function initialOneRange(options?: DateFilterOptions): OneRangeForm {
  return { compareStart: options?.compareOneRange?.start ?? '', compareEnd: options?.compareOneRange?.end ?? '' };
}
function initialTwoRanges(options?: DateFilterOptions): TwoRangesForm {
  return { startA: options?.compareTwoRanges?.intervalA.start ?? '', endA: options?.compareTwoRanges?.intervalA.end ?? '', startB: options?.compareTwoRanges?.intervalB.start ?? '', endB: options?.compareTwoRanges?.intervalB.end ?? '' };
}
export const DateFilterBar: React.FC<DateFilterBarProps> = ({ onFilterChange, period: controlledPeriod, storageKey, initialOptions, className }) => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isCrmRoute = location.pathname === '/crm' || location.pathname.startsWith('/crm/');
  const defaultStoragePath = isCrmRoute ? '/crm' : location.pathname;
  const resolvedStorageKey = storageKey ?? `date-filter:${defaultStoragePath}`;
  const queryPeriod = isCrmRoute ? searchParams.get('period') : null;
  const initialStoredPeriod = typeof window !== 'undefined' ? readDatePreference(window.localStorage, resolvedStorageKey, isDemo) : null;
  const initialPeriod = isFilterPeriod(queryPeriod) ? queryPeriod : isFilterPeriod(initialStoredPeriod) ? initialStoredPeriod : DEFAULT_PERIOD;
  const [selectedPeriod, setSelectedPeriod] = useState<FilterPeriod>(initialPeriod);
  const [compareMode, setCompareMode] = useState<CompareMode>(() => initialCompareMode(initialOptions));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const effectivePeriod = controlledPeriod ?? selectedPeriod;
  const oneForm = useForm<OneRangeForm>({ defaultValues: initialOneRange(initialOptions) });
  const twoForm = useForm<TwoRangesForm>({ defaultValues: initialTwoRanges(initialOptions) });
  const oneRange = oneForm.watch();
  const twoRanges = twoForm.watch();
  const draftSnapshotRef = useRef<{ mode: CompareMode; one: OneRangeForm; two: TwoRangesForm } | null>(null);
  const onFilterChangeRef = useRef(onFilterChange);
  const storageHydratedRef = useRef(controlledPeriod === undefined);
  const hydratedStorageKeyRef = useRef<string | null>(controlledPeriod === undefined ? resolvedStorageKey : null);
  const pendingLocalPeriodRef = useRef<FilterPeriod | null>(null);
  onFilterChangeRef.current = onFilterChange;

  useEffect(() => {
    if (controlledPeriod === undefined || typeof window === 'undefined') {
      storageHydratedRef.current = true;
      hydratedStorageKeyRef.current = resolvedStorageKey;
      return;
    }
    const urlPeriod = isFilterPeriod(queryPeriod) ? queryPeriod : null;
    if (urlPeriod) {
      if (urlPeriod !== controlledPeriod) {
        // A URL anterior não pode desfazer uma escolha local antes da persistência.
        if (pendingLocalPeriodRef.current === controlledPeriod) { storageHydratedRef.current = true; return; }
        storageHydratedRef.current = false;
        onFilterChangeRef.current(urlPeriod);
        return;
      }
      pendingLocalPeriodRef.current = null;
      hydratedStorageKeyRef.current = resolvedStorageKey;
      storageHydratedRef.current = true;
      return;
    }
    if (hydratedStorageKeyRef.current === resolvedStorageKey) { storageHydratedRef.current = true; return; }
    const storedPeriod = readDatePreference(window.localStorage, resolvedStorageKey, isDemo);
    if (isFilterPeriod(storedPeriod) && storedPeriod !== controlledPeriod) {
      storageHydratedRef.current = false;
      onFilterChangeRef.current(storedPeriod);
      return;
    }
    hydratedStorageKeyRef.current = resolvedStorageKey;
    storageHydratedRef.current = true;
  }, [controlledPeriod, queryPeriod, resolvedStorageKey]);
  useEffect(() => { if (controlledPeriod !== undefined) setSelectedPeriod(controlledPeriod); }, [controlledPeriod]);
  useEffect(() => {
    if (!storageHydratedRef.current || typeof window === 'undefined') return;
    writeDatePreference(window.localStorage, resolvedStorageKey, effectivePeriod, isDemo);
    if (isCrmRoute && searchParams.get('period') !== effectivePeriod) {
      const next = new URLSearchParams(searchParams);
      next.set('period', effectivePeriod);
      setSearchParams(next, { replace: true, state: location.state });
    }
  }, [effectivePeriod, isCrmRoute, resolvedStorageKey, searchParams, setSearchParams, location.state]);
  useEffect(() => {
    if (!storageHydratedRef.current || isModalOpen) return;
    const options = buildOptions(compareMode, oneRange, twoRanges);
    onFilterChangeRef.current(effectivePeriod, options);
  }, [isModalOpen, effectivePeriod, compareMode, oneRange.compareStart, oneRange.compareEnd, twoRanges.startA, twoRanges.endA, twoRanges.startB, twoRanges.endB]);
  const handlePeriodChange = (period: FilterPeriod) => {
    pendingLocalPeriodRef.current = period;
    if (controlledPeriod === undefined) setSelectedPeriod(period);
    const options = buildOptions(compareMode, oneRange, twoRanges);
    onFilterChange(period, options);
  };
  const snapshotFilters = () => { draftSnapshotRef.current = { mode: compareMode, one: oneForm.getValues(), two: twoForm.getValues() }; };
  const cancelModal = () => {
    const snapshot = draftSnapshotRef.current;
    if (snapshot) { setCompareMode(snapshot.mode); oneForm.reset(snapshot.one); twoForm.reset(snapshot.two); }
    draftSnapshotRef.current = null;
    setIsModalOpen(false);
  };
  const setMode = (mode: CompareMode) => {
    if (mode === compareMode) return;
    if (mode !== 'none') snapshotFilters();
    setCompareMode(mode);
    if (mode === 'none') {
      oneForm.reset({ compareStart: '', compareEnd: '' });
      twoForm.reset({ startA: '', endA: '', startB: '', endB: '' });
      onFilterChange(effectivePeriod, undefined);
      setIsModalOpen(false);
    } else { setIsModalOpen(true); }
  };
  const openModal = () => { if (compareMode === 'one' || compareMode === 'two') { snapshotFilters(); setIsModalOpen(true); } };
  const applyAndClose = () => {
    const options = buildOptions(compareMode, oneRange, twoRanges);
    if (options) { draftSnapshotRef.current = null; setIsModalOpen(false); onFilterChange(effectivePeriod, options); }
  };
  const summaryLabel = compareMode === 'one' && oneRange.compareStart && oneRange.compareEnd
    ? formatRangeLabel(oneRange.compareStart, oneRange.compareEnd)
    : compareMode === 'two' && twoRanges.startA && twoRanges.endA && twoRanges.startB && twoRanges.endB
      ? `${formatRangeLabel(twoRanges.startA, twoRanges.endA)} vs ${formatRangeLabel(twoRanges.startB, twoRanges.endB)}`
      : compareMode === 'one' ? 'Definir período' : compareMode === 'two' ? 'Definir dois períodos' : null;
  const buttonClass = (period: FilterPeriod) => `px-3 py-1.5 text-sm font-medium rounded-md transition-all ${compareMode === 'none' && effectivePeriod === period ? 'bg-salesforce-blue text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`;
  const modeButtonClass = (mode: CompareMode) => `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${compareMode === mode ? mode === 'two' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`;
  const modalTitle = compareMode === 'one' ? 'Comparar 1 período' : 'Comparar 2 períodos';
  const canApply = !!buildOptions(compareMode, oneRange, twoRanges);
  return (<>
    <div className={`bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between mb-6 animate-fade-in ${className ?? ''}`}>
      <div className="flex flex-wrap justify-center min-w-0 items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
        <button onClick={() => handlePeriodChange('today')} className={buttonClass('today')}>Hoje</button>
        <button onClick={() => handlePeriodChange('week')} className={buttonClass('week')}>Semana</button>
        <button onClick={() => handlePeriodChange('month')} className={buttonClass('month')}>Mês</button>
        <button onClick={() => handlePeriodChange('60days')} className={buttonClass('60days')}>60 Dias</button>
        <button onClick={() => handlePeriodChange('all')} className={buttonClass('all')}>Todo o período</button>
      </div>
      <div className="flex flex-wrap justify-center min-w-0 items-center gap-2">
        <div className="h-8 w-px bg-gray-200 hidden md:block" />
        <div className="flex flex-wrap justify-center min-w-0 items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
          <button type="button" onClick={() => setMode('none')} className={modeButtonClass('none')} aria-pressed={compareMode === 'none'}><Calendar size={14} /><span className="hidden sm:inline">Filtrar</span></button>
          <button type="button" onClick={() => setMode('one')} className={modeButtonClass('one')} aria-pressed={compareMode === 'one'}><ArrowRightLeft size={14} /><span className="hidden sm:inline">1 período</span></button>
          <button type="button" onClick={() => setMode('two')} className={modeButtonClass('two')} aria-pressed={compareMode === 'two'}><GitCompare size={14} /><span className="hidden sm:inline">2 períodos</span></button>
        </div>
        {(compareMode === 'one' || compareMode === 'two') && <button type="button" onClick={openModal} className="px-3 py-1.5 text-sm font-medium text-salesforce-blue hover:bg-salesforce-blue/10 rounded-md border border-salesforce-blue/30 transition-colors truncate max-w-[200px] sm:max-w-[280px]" title={summaryLabel ?? 'Abrir datas'}>{summaryLabel ?? (compareMode === 'one' ? 'Definir período' : 'Definir períodos')}</button>}
        {compareMode === 'none' && <span className="flex items-center text-gray-400 text-sm gap-2"><Calendar size={16} /><span className="hidden sm:inline">Filtrando por data</span></span>}
      </div>
    </div>
    <Modal isOpen={isModalOpen} onClose={cancelModal} contentClassName="max-w-md">
      <ModalHeader title={modalTitle} onClose={cancelModal} />
      <div className="px-6 py-4 space-y-4">
        {compareMode === 'one' && <>
          <FormDatePicker label="Data inicial" name="compareStart" control={oneForm.control} errors={oneForm.formState.errors} tooltip="" />
          <FormDatePicker label="Data final" name="compareEnd" control={oneForm.control} errors={oneForm.formState.errors} tooltip="" />
        </>}
        {compareMode === 'two' && <>
          <div className="space-y-2"><p className="text-sm font-semibold text-gray-700">Período 1</p><div className="grid grid-cols-2 gap-3">
            <FormDatePicker label="De" name="startA" control={twoForm.control} errors={twoForm.formState.errors} tooltip="" />
            <FormDatePicker label="Até" name="endA" control={twoForm.control} errors={twoForm.formState.errors} tooltip="" />
          </div></div>
          <div className="space-y-2"><p className="text-sm font-semibold text-gray-700">Período 2</p><div className="grid grid-cols-2 gap-3">
            <FormDatePicker label="De" name="startB" control={twoForm.control} errors={twoForm.formState.errors} tooltip="" />
            <FormDatePicker label="Até" name="endB" control={twoForm.control} errors={twoForm.formState.errors} tooltip="" />
          </div></div>
        </>}
      </div>
      {!canApply && <p role="status" className="px-6 pb-3 text-sm text-amber-800">Informe datas válidas, com o início anterior ou igual ao fim de cada intervalo.</p>}
      <ModalFooter>
        <button type="button" onClick={cancelModal} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium">Cancelar</button>
        <button type="button" onClick={applyAndClose} disabled={!canApply} className="px-4 py-2 bg-salesforce-blue text-white rounded-lg hover:bg-[#0160b4] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">Aplicar</button>
      </ModalFooter>
    </Modal>
  </>);
};
