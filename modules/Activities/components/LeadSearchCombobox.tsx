import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, Lock, Search, X } from 'lucide-react';
import { api } from '../../../lib/axios';
import { ACTIVITIES_INPUT_CLASS } from '../activitiesUi';

const AUTOCOMPLETE_GAP_PX = 4;
const AUTOCOMPLETE_MAX_DROPDOWN_PX = 240;

type AutocompleteCoords = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  openUpward: boolean;
  maxHeight: number;
};

function computeAutocompleteCoords(input: HTMLInputElement): AutocompleteCoords {
  const rect = input.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const openUpward =
    spaceBelow < AUTOCOMPLETE_MAX_DROPDOWN_PX + AUTOCOMPLETE_GAP_PX && spaceAbove > spaceBelow;
  const maxHeight = Math.min(
    AUTOCOMPLETE_MAX_DROPDOWN_PX,
    openUpward
      ? Math.max(spaceAbove - AUTOCOMPLETE_GAP_PX, 0)
      : Math.max(spaceBelow - AUTOCOMPLETE_GAP_PX, 0),
  );
  return {
    left: rect.left + window.scrollX,
    width: rect.width,
    top: openUpward ? undefined : rect.bottom + window.scrollY + AUTOCOMPLETE_GAP_PX,
    bottom: openUpward ? window.innerHeight - rect.top + AUTOCOMPLETE_GAP_PX : undefined,
    openUpward,
    maxHeight,
  };
}

export interface LeadSearchOption {
  id: string;
  name: string;
  company?: string | null;
  stage?: string | null;
}

interface LeadSearchResponseItem {
  id: string;
  name: string;
  company?: string | null;
  stage?: string | null;
}

function formatLeadLabel(lead: Pick<LeadSearchOption, 'name' | 'company'>) {
  return lead.company ? `${lead.name} · ${lead.company}` : lead.name;
}

export interface LeadSearchComboboxProps {
  id?: string;
  label?: string;
  value: string;
  displayLabel?: string;
  onChange: (leadId: string, label: string) => void;
  locked?: boolean;
  loading?: boolean;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

export const LeadSearchCombobox: React.FC<LeadSearchComboboxProps> = ({
  id,
  label = 'Vincular lead',
  value,
  displayLabel = '',
  onChange,
  locked = false,
  loading = false,
  placeholder = 'Buscar por nome ou empresa…',
  hint,
  error,
  required = false,
  className = '',
}) => {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<LeadSearchOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [coords, setCoords] = useState<AutocompleteCoords>({
    left: 0,
    width: 0,
    openUpward: false,
    maxHeight: AUTOCOMPLETE_MAX_DROPDOWN_PX,
  });

  const inputId = id ?? `${listboxId}-input`;
  const hasSelection = Boolean(value && displayLabel);

  const updateDropdownPosition = useCallback(() => {
    if (!inputRef.current || !isOpen) return;
    setCoords(computeAutocompleteCoords(inputRef.current));
  }, [isOpen]);

  useLayoutEffect(() => {
    updateDropdownPosition();
  }, [updateDropdownPosition]);

  const searchLeads = useCallback(async (term: string) => {
    setSearching(true);
    setSearchError(null);
    try {
      const trimmed = term.trim();
      const query = new URLSearchParams({ limit: '20' });
      if (trimmed) query.set('search', trimmed);
      const response = await api.get<LeadSearchResponseItem[]>(
        `/lead-appointments/leads/search?${query.toString()}`,
      );
      const next = (response.data ?? []).map((lead) => ({
        id: lead.id,
        name: lead.name,
        company: lead.company,
        stage: lead.stage,
      }));
      setOptions(next);
      setActiveIndex(next.length > 0 ? 0 : -1);
    } catch {
      setOptions([]);
      setActiveIndex(-1);
      setSearchError('Não foi possível buscar leads. Tente novamente.');
    } finally {
      setSearching(false);
    }
  }, []);

  const openDropdown = useCallback(() => {
    if (locked || loading) return;
    if (inputRef.current) {
      setCoords(computeAutocompleteCoords(inputRef.current));
    }
    setIsOpen(true);
  }, [locked, loading]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const selectLead = useCallback(
    (lead: LeadSearchOption) => {
      onChange(lead.id, formatLeadLabel(lead));
      setSearch('');
      setOptions([]);
      closeDropdown();
      inputRef.current?.blur();
    },
    [closeDropdown, onChange],
  );

  const clearSelection = useCallback(() => {
    onChange('', '');
    setSearch('');
    setOptions([]);
    closeDropdown();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [closeDropdown, onChange]);

  const handleSearchChange = (next: string) => {
    setSearch(next);
    openDropdown();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void searchLeads(next);
    }, 300);
  };

  const handleFocus = () => {
    if (locked || loading) return;
    if (hasSelection) {
      setSearch(displayLabel);
    }
    openDropdown();
    void searchLeads(hasSelection ? displayLabel : search);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (locked || loading) return;

    if (event.key === 'Escape') {
      event.stopPropagation();
      closeDropdown();
      return;
    }

    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      openDropdown();
      void searchLeads(search.trim() || displayLabel);
      return;
    }

    if (!isOpen || options.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + options.length) % options.length);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectLead(options[activeIndex]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inContainer && !inDropdown) closeDropdown();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeDropdown]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = () => updateDropdownPosition();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [isOpen, updateDropdownPosition]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const showDropdown = isOpen && !locked && !loading;
  const inputValue = locked || loading ? displayLabel : isOpen ? search : hasSelection ? displayLabel : search;

  return (
    <div className={className} ref={containerRef}>
      <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label}
        {!required ? (
          <span className="ml-1 font-normal text-gray-500">(opcional)</span>
        ) : (
          <span className="text-red-500"> *</span>
        )}
      </label>

      <div className="relative">
        <span
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"
          aria-hidden
        >
          {locked ? <Lock className="h-4 w-4" /> : loading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Search className="h-4 w-4" />}
        </span>

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          value={inputValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={locked ? undefined : loading ? 'Carregando lead…' : placeholder}
          disabled={locked || loading}
          readOnly={locked}
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
          aria-busy={loading || searching}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          autoComplete="off"
          className={`block w-full py-2.5 pl-9 pr-10 ${ACTIVITIES_INPUT_CLASS}
            ${locked || loading
              ? 'cursor-default border-gray-200 bg-gray-50 text-gray-700'
              : error
                ? 'border-red-300 bg-white text-gray-900 focus:border-red-500 focus:ring-red-200'
                : 'bg-white text-gray-900 placeholder-gray-400'
            }`}
        />

        {hasSelection && !locked && !loading ? (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue/40 rounded-r-lg"
            aria-label="Remover lead vinculado"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-gray-500 leading-relaxed">
          {hint}
        </p>
      ) : null}

      {showDropdown
        ? createPortal(
            <div
              ref={dropdownRef}
              id={listboxId}
              role="listbox"
              style={{
                position: 'fixed',
                left: coords.left - window.scrollX,
                width: coords.width,
                maxHeight: coords.maxHeight,
                zIndex: 10001,
                ...(coords.openUpward
                  ? { bottom: coords.bottom, top: 'auto' }
                  : { top: (coords.top ?? 0) - window.scrollY, bottom: 'auto' }),
              }}
              className="overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-xl ring-1 ring-black/5 animate-fade-in motion-reduce:animate-none"
            >
              {searching ? (
                <div className="flex items-center gap-2 px-3 py-2.5 text-gray-500" role="presentation">
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />
                  Buscando leads…
                </div>
              ) : options.length === 0 ? (
                <div className="px-3 py-2.5 text-gray-500" role="presentation">
                  {searchError ?? 'Nenhum lead encontrado'}
                </div>
              ) : (
                options.map((lead, index) => {
                  const isActive = activeIndex === index;
                  const isSelected = value === lead.id;
                  return (
                    <button
                      key={lead.id}
                      type="button"
                      role="option"
                      id={`${listboxId}-opt-${index}`}
                      aria-selected={isActive || isSelected}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectLead(lead)}
                      className={`flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left transition-colors
                        ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}
                        ${isSelected ? 'text-salesforce-blue' : 'text-gray-900'}`}
                    >
                      <span className="min-w-0">
                        <span className="flex items-baseline gap-1.5 truncate">
                          <span className="truncate font-medium">{lead.name}</span>
                          {lead.stage ? (
                            <span className="shrink-0 truncate text-xs font-normal text-gray-400">
                              {lead.stage}
                            </span>
                          ) : null}
                        </span>
                        {lead.company ? (
                          <span className="block truncate text-xs text-gray-500">{lead.company}</span>
                        ) : null}
                      </span>
                      {isSelected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-salesforce-blue" aria-hidden /> : null}
                    </button>
                  );
                })
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};
