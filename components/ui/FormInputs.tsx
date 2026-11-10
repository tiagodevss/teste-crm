import React, { useState, useRef, useEffect, useMemo, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { UseFormRegister, FieldErrors, Control, Controller } from 'react-hook-form';
import { ChevronDown, AlertCircle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { Select } from './Select';
import { applyPhoneMask, formatCurrencyInputDisplay } from '../../utils/formatters';

const DEFAULT_DATE_TOOLTIP = 'Selecione a data no calendário ou digite no formato dia/mês/ano.';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    name: string;
    register: UseFormRegister<any>;
    errors: FieldErrors;
    required?: boolean;
    className?: string;
    leftIcon?: React.ReactNode;
    currency?: boolean;
    /** Quando true, aplica máscara BR: fixo (XX) XXXX-XXXX ou celular (XX) 9XXXX-XXXX. Exige control para funcionar. */
    phone?: boolean;
    /** Obrigatório quando phone=true, para aplicar máscara. */
    control?: Control<any>;
    /** Texto do tooltip (em campos de data é usado automaticamente se não informado). */
    tooltip?: string;
    /** Quando true (currency), permite que o campo fique vazio (null) em vez de forçar 0. */
    allowEmpty?: boolean;
}

const inputBaseClass = (errorMessage: string, leftOrCurrency: boolean, type?: string) =>
    `block w-full border rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 transition-all sm:text-sm bg-white text-gray-900 placeholder-gray-400
    ${leftOrCurrency ? 'pl-10' : ''}
    ${type === 'number' ? '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' : ''}
    ${errorMessage
        ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
        : 'border-gray-300 focus:ring-salesforce-blue/20 focus:border-salesforce-blue'
    } disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`;

export const FormInput: React.FC<FormInputProps> = ({
    label, name, register, errors, required, className = '', leftIcon, currency, phone, control, type, tooltip, allowEmpty, ...props
}) => {
    if (currency && control) {
        return (
            <FormCurrency
                label={label}
                name={name}
                control={control}
                errors={errors}
                required={required}
                className={className}
                placeholder={props.placeholder}
                tooltip={tooltip}
                disabled={props.disabled}
                allowEmpty={allowEmpty}
            />
        );
    }
    const errorMessage = errors[name]?.message as string;
    const showTooltip = type === 'date' ? (tooltip ?? DEFAULT_DATE_TOOLTIP) : tooltip;
    const leftOrCurrency = Boolean(leftIcon || currency);
    const { onWheel, ...inputProps } = props;
    const handleWheel = (event: React.WheelEvent<HTMLInputElement>) => {
        onWheel?.(event);
        if (type === 'number' && event.currentTarget === document.activeElement) {
            event.currentTarget.blur();
        }
    };

    const wrappedInput = phone && control ? (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value, ...fieldRest } }) => {
                const raw = value == null ? '' : String(value).replace(/\D/g, '');
                const displayValue = raw ? applyPhoneMask(raw) : '';
                return (
                <input
                    {...fieldRest}
                    type="text"
                    value={displayValue}
                    onChange={(e) => onChange(applyPhoneMask(e.target.value))}
                    placeholder={props.placeholder ?? '(00) 0000-0000 ou (00) 90000-0000'}
                    className={inputBaseClass(errorMessage, leftOrCurrency)}
                    autoComplete="tel"
                    disabled={props.disabled}
                />
                );
            }}
        />
    ) : (
        <input
            type={type}
            {...register(
                name,
                type === 'number'
                    ? {
                        valueAsNumber: !allowEmpty,
                        setValueAs: (value) => {
                            if (value === '' || value === null || value === undefined) {
                                return allowEmpty ? undefined : value;
                            }
                            return Number(value);
                        },
                    }
                    : undefined,
            )}
            className={inputBaseClass(errorMessage, leftOrCurrency, type)}
            onWheel={handleWheel}
            {...inputProps}
        />
    );

    return (
        <div className={className}>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                <span>{label} {required && <span className="text-red-500">*</span>}</span>
                {showTooltip && (
                    <Tooltip content={showTooltip} placement="top" className="focus:outline-none" />
                )}
            </label>
            <div className="relative">
                {(leftIcon || currency) && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 font-medium">
                        {currency ? 'R$' : leftIcon}
                    </div>
                )}
                {wrappedInput}
                {errorMessage && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                )}
            </div>
            {errorMessage && (
                <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
            )}
        </div>
    );
};

interface FormCurrencyProps {
    label: string;
    name: string;
    control: Control<any>;
    errors: FieldErrors;
    required?: boolean;
    className?: string;
    placeholder?: string;
    tooltip?: string;
    disabled?: boolean;
    allowEmpty?: boolean;
}

/** 
 * Componente de moeda centralizado. 
 * Preenche sempre a partir dos centavos (direita para esquerda).
 */
export const FormCurrency: React.FC<FormCurrencyProps> = ({
    label, name, control, errors, required, className = '', placeholder = '0,00', tooltip, disabled, allowEmpty
}) => {
    const errorMessage = errors[name]?.message as string;

    return (
        <div className={className}>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                <span>{label} {required && <span className="text-red-500">*</span>}</span>
                {tooltip && <Tooltip content={tooltip} placement="top" />}
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 font-medium">
                    R$
                </div>
                <Controller
                    name={name}
                    control={control}
                    render={({ field: { onChange, value, ...fieldRest } }) => {
                        const numericValue = typeof value === 'number' ? value : value == null ? null : Number(value);
                        const displayValue = (allowEmpty && numericValue == null)
                            ? ''
                            : formatCurrencyInputDisplay(numericValue);

                        return (
                            <input
                                {...fieldRest}
                                type="text"
                                value={displayValue}
                                onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, '');
                                    onChange(digits ? parseInt(digits, 10) / 100 : (allowEmpty ? null : 0));
                                }}
                                placeholder={placeholder}
                                className={inputBaseClass(errorMessage, true)}
                                disabled={disabled}
                                autoComplete="off"
                            />
                        );
                    }}
                />
                {errorMessage && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                )}
            </div>
            {errorMessage && (
                <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
            )}
        </div>
    );
};

interface FormSelectOption {
    label: string;
    value: string | number;
}

interface FormSelectProps {
    label: string;
    name: string;
    control: Control<any>;
    options: FormSelectOption[];
    errors: FieldErrors;
    required?: boolean;
    placeholder?: string;
    className?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
    label, name, control, options, errors, required, placeholder = 'Selecione...', className = ''
}) => {
    const errorMessage = errors[name]?.message as string;
    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value } }) => (
                <Select
                    label={label}
                    required={required}
                    value={value}
                    onChange={onChange}
                    options={options}
                    placeholder={placeholder}
                    error={errorMessage}
                    className={className}
                />
            )}
        />
    );
};

interface FormDatePickerProps {
    label: string;
    name: string;
    control: Control<any>;
    errors: FieldErrors;
    required?: boolean;
    placeholder?: string;
    className?: string;
    /** Texto do tooltip ao lado do label. Omitir ou passar "" para não exibir. */
    tooltip?: string;
}

export const FormDatePicker: React.FC<FormDatePickerProps> = ({
    label, name, control, errors, required, placeholder = "DD/MM/YYYY", className = '', tooltip: tooltipProp
}) => {
    const tooltip = tooltipProp !== undefined ? tooltipProp : DEFAULT_DATE_TOOLTIP;
    const showTooltip = Boolean(tooltip);
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputWrapperRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    const errorMessage = errors[name]?.message as string;

    const MONTHS = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedInsideContainer = containerRef.current && containerRef.current.contains(target);
            const clickedInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target);

            if (!clickedInsideContainer && !clickedInsideDropdown) {
                setIsOpen(false);
            }
        };

        const handleResize = () => setIsOpen(false);
        const handleScroll = () => setIsOpen(false);

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, []);

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    /** Aplica máscara DD/MM/AAAA: só números, insere / após dia e mês, máx 8 dígitos. */
    const applyDateMask = (raw: string): string => {
        const digits = raw.replace(/\D/g, '').slice(0, 8);
        if (digits.length <= 2) return digits;
        if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    };

    /** Parse dd/mm/yyyy or d/m/yyyy to YYYY-MM-DD, or return null if invalid. */
    const parseDateInput = (input: string): string | null => {
        const trimmed = input.trim().replace(/\s/g, '');
        if (!trimmed) return null;
        const parts = trimmed.split(/[/.-]/);
        if (parts.length !== 3) return null;
        const [a, b, c] = parts.map((p) => parseInt(p, 10));
        if (Number.isNaN(a) || Number.isNaN(b) || Number.isNaN(c)) return null;
        let day: number, month: number, year: number;
        if (c > 999) {
            year = c;
            day = a;
            month = b;
        } else if (a > 31) {
            year = a;
            day = c;
            month = b;
        } else {
            day = a;
            month = b;
            year = c < 100 ? 2000 + c : c;
        }
        if (month < 1 || month > 12 || day < 1 || day > 31) return null;
        const d = new Date(year, month - 1, day);
        if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    };

    // Calendar logic
    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    return (
        <div className={className} ref={containerRef}>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                <span>{label} {required && <span className="text-red-500">*</span>}</span>
                {showTooltip && <Tooltip content={tooltip} placement="top" />}
            </label>
            <Controller
                name={name}
                control={control}
                render={({ field: { onChange, value } }) => {
                    const [inputText, setInputText] = useState(() => (value ? formatDateDisplay(value) : ''));
                    useEffect(() => {
                        setInputText(value ? formatDateDisplay(value) : '');
                    }, [value]);

                    const openCalendar = () => {
                        if (!isOpen && inputWrapperRef.current) {
                            if (value) {
                                const [y, m, d] = value.split('-').map(Number);
                                setViewDate(new Date(y, m - 1, d));
                            }
                            const rect = inputWrapperRef.current.getBoundingClientRect();
                            setCoords({
                                top: rect.bottom + window.scrollY + 4,
                                left: rect.left + window.scrollX
                            });
                        }
                        setIsOpen(!isOpen);
                    };

                    const handleBlur = () => {
                        const parsed = parseDateInput(inputText);
                        if (parsed) {
                            onChange(parsed);
                            setInputText(formatDateDisplay(parsed));
                        } else if (inputText.trim() === '') {
                            onChange('');
                        } else {
                            setInputText(value ? formatDateDisplay(value) : '');
                        }
                    };

                    const handleSelectDate = (day: number) => {
                        const year = viewDate.getFullYear();
                        const month = String(viewDate.getMonth() + 1).padStart(2, '0');
                        const dayStr = String(day).padStart(2, '0');
                        const dateStr = `${year}-${month}-${dayStr}`;
                        onChange(dateStr);
                        setInputText(formatDateDisplay(dateStr));
                        setIsOpen(false);
                    };

                    const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
                    const startDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
                    
                    const days = [];
                    for (let i = 0; i < startDay; i++) {
                        days.push(<div key={`empty-${i}`} className="h-8"></div>);
                    }
                    for (let d = 1; d <= daysInMonth; d++) {
                        const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const isSelected = value === dateStr;
                        const isToday = new Date().toDateString() === new Date(viewDate.getFullYear(), viewDate.getMonth(), d).toDateString();

                        days.push(
                            <div 
                                key={d}
                                onClick={() => handleSelectDate(d)}
                                className={`h-8 w-8 flex items-center justify-center rounded-full text-sm cursor-pointer transition-colors mx-auto
                                    ${isSelected ? 'bg-salesforce-blue text-white font-bold' : 'text-gray-700 hover:bg-gray-100'}
                                    ${!isSelected && isToday ? 'border border-salesforce-blue text-salesforce-blue font-bold' : ''}
                                `}
                            >
                                {d}
                            </div>
                        );
                    }

                    return (
                        <div
                            ref={inputWrapperRef}
                            className={`relative flex items-center bg-white border rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-offset-0 sm:text-sm transition-all
                                ${errorMessage 
                                    ? 'border-red-300 focus-within:ring-red-200 focus-within:border-red-500' 
                                    : 'border-gray-300 focus-within:ring-salesforce-blue/20 focus-within:border-salesforce-blue'
                                }`}
                        >
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(applyDateMask(e.target.value))}
                                onBlur={handleBlur}
                                placeholder={placeholder}
                                className={`flex-1 min-w-0 bg-transparent border-0 py-2.5 pl-3 pr-2 focus:outline-none focus:ring-0 placeholder-gray-400 text-gray-900
                                    ${errorMessage ? 'placeholder-red-300' : ''}`}
                                autoComplete="off"
                            />
                            <button
                                type="button"
                                onClick={openCalendar}
                                className="flex items-center justify-center py-2.5 pr-3 text-gray-400 hover:text-salesforce-blue transition-colors focus:outline-none focus:ring-0"
                                aria-label="Abrir calendário"
                            >
                                <CalendarIcon className="h-5 w-5" />
                            </button>

                            {isOpen && createPortal(
                                <div 
                                    ref={dropdownRef}
                                    style={{ 
                                        position: 'fixed', 
                                        top: coords.top - window.scrollY, 
                                        left: coords.left - window.scrollX, 
                                        zIndex: 99999 
                                    }}
                                    className="w-72 bg-white shadow-xl rounded-lg p-4 border border-gray-200 animate-fade-in"
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-800">
                                            <ChevronLeft size={20} />
                                        </button>
                                        <span className="font-bold text-gray-800 text-sm">
                                            {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                                        </span>
                                        <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-800">
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-7 mb-2 text-center">
                                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                                            <div key={i} className="text-xs font-bold text-gray-400">
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-7 gap-y-1">
                                        {days}
                                    </div>
                                </div>,
                                document.body
                            )}
                        </div>
                    );
                }}
            />
            {errorMessage && (
                <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
            )}
        </div>
    );
};

const AUTOCOMPLETE_GAP_PX = 4;
/** Alinhado ao max-h-60 do Tailwind (15rem). */
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
            : Math.max(spaceBelow - AUTOCOMPLETE_GAP_PX, 0)
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

export interface FormAutocompleteOption {
    label: string;
    value: string | number;
    /** Exibido após o label com estilo mais claro (ex.: email). */
    sublabel?: string;
}

interface FormAutocompleteProps {
    label: string;
    name: string;
    control: Control<any>;
    options: FormAutocompleteOption[];
    errors: FieldErrors;
    required?: boolean;
    /** Mensagem exibida quando o campo é obrigatório e não preenchido. */
    requiredMessage?: string;
    placeholder?: string;
    className?: string;
}

export const FormAutocomplete: React.FC<FormAutocompleteProps> = ({
    label, name, control, options, errors, required, requiredMessage = 'Campo obrigatório', placeholder = 'Digite para buscar...', className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [coords, setCoords] = useState<AutocompleteCoords>({
        left: 0,
        width: 0,
        openUpward: false,
        maxHeight: AUTOCOMPLETE_MAX_DROPDOWN_PX,
    });

    const errorMessage = errors[name]?.message as string;

    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options;
        const term = search.trim().toLowerCase();
        return options.filter(opt => {
            const matchLabel = (opt.label || '').toLowerCase().includes(term);
            const matchSublabel = (opt.sublabel || '').toLowerCase().includes(term);
            return matchLabel || matchSublabel;
        });
    }, [options, search]);

    const optionDisplayText = (opt: FormAutocompleteOption) =>
        opt.sublabel ? `${opt.label} - ${opt.sublabel}` : opt.label;

    const updateDropdownPosition = useCallback(() => {
        if (!inputRef.current || !isOpen) return;
        setCoords(computeAutocompleteCoords(inputRef.current));
    }, [isOpen]);

    useLayoutEffect(() => {
        updateDropdownPosition();
    }, [updateDropdownPosition]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const inContainer = containerRef.current?.contains(target);
            const inDropdown = dropdownRef.current?.contains(target);
            if (!inContainer && !inDropdown) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    return (
        <div className={className} ref={containerRef}>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <Controller
                name={name}
                control={control}
                render={({ field: { onChange, value } }) => {
                    const selected = options.find(opt => String(opt.value) === String(value));
                    const displayText = isOpen ? search : (selected ? optionDisplayText(selected) : '');

                    const openDropdown = () => {
                        if (inputRef.current) {
                            setCoords(computeAutocompleteCoords(inputRef.current));
                        }
                        setIsOpen(true);
                    };

                    return (
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={displayText}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    if (!e.target.value) onChange('');
                                    openDropdown();
                                }}
                                onFocus={() => {
                                    setSearch('');
                                    openDropdown();
                                }}
                                placeholder={placeholder}
                                className={`block w-full border rounded-lg shadow-sm py-2.5 px-3 pr-10 focus:outline-none focus:ring-2 transition-all sm:text-sm bg-white text-gray-900 placeholder-gray-400
                                ${errorMessage ? 'border-red-300 focus:ring-red-200 focus:border-red-500' : 'border-gray-300 focus:ring-salesforce-blue/20 focus:border-salesforce-blue'}`}
                                autoComplete="off"
                            />
                            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </span>

                            {isOpen && createPortal(
                                <div
                                    ref={dropdownRef}
                                    style={{
                                        position: 'fixed',
                                        left: coords.left - window.scrollX,
                                        width: coords.width,
                                        zIndex: 99999,
                                        maxHeight: coords.maxHeight,
                                        ...(coords.openUpward
                                            ? { bottom: coords.bottom, top: 'auto' }
                                            : { top: (coords.top ?? 0) - window.scrollY, bottom: 'auto' }),
                                    }}
                                    className="bg-white shadow-xl rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm animate-fade-in border border-gray-100"
                                >
                                    {filteredOptions.length > 0 ? filteredOptions.map((option) => (
                                        <div
                                            key={option.value}
                                            className={`relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-blue-50 transition-colors ${String(value) === String(option.value) ? 'text-salesforce-blue font-semibold bg-blue-50/50' : 'text-gray-900'}`}
                                            onClick={() => {
                                                onChange(option.value);
                                                setSearch(optionDisplayText(option));
                                                setIsOpen(false);
                                                inputRef.current?.blur();
                                            }}
                                        >
                                            <span className="block truncate">
                                                {option.sublabel ? (
                                                    <><span>{option.label}</span> <span className="text-gray-400">{option.sublabel}</span></>
                                                ) : (
                                                    option.label
                                                )}
                                            </span>
                                            {String(value) === String(option.value) && (
                                                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-salesforce-blue">
                                                    <Check className="h-4 w-4" />
                                                </span>
                                            )}
                                        </div>
                                    )) : (
                                        <div className="py-2 px-3 text-gray-500 italic">Nenhum resultado</div>
                                    )}
                                </div>,
                                document.body
                            )}
                        </div>
                    );
                }}
            />
            {errorMessage && <p className="mt-1 text-xs text-red-600">{errorMessage}</p>}
        </div>
    );
};

interface FormMultiSelectProps {
    label: string;
    name: string;
    control: Control<any>;
    options: FormAutocompleteOption[];
    errors: FieldErrors;
    required?: boolean;
    placeholder?: string;
    emptyMessage?: string;
    className?: string;
    disabled?: boolean;
}

export const FormMultiSelect: React.FC<FormMultiSelectProps> = ({
    label,
    name,
    control,
    options,
    errors,
    required,
    placeholder = 'Digite para buscar...',
    emptyMessage = 'Nenhum resultado',
    className = '',
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [coords, setCoords] = useState<AutocompleteCoords>({
        left: 0,
        width: 0,
        openUpward: false,
        maxHeight: AUTOCOMPLETE_MAX_DROPDOWN_PX,
    });

    const errorMessage = errors[name]?.message as string;
    const listboxId = `${name}-listbox`;

    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options;
        const term = search.trim().toLowerCase();
        return options.filter((opt) => {
            const matchLabel = (opt.label || '').toLowerCase().includes(term);
            const matchSublabel = (opt.sublabel || '').toLowerCase().includes(term);
            return matchLabel || matchSublabel;
        });
    }, [options, search]);

    const optionDisplayText = (opt: FormAutocompleteOption) =>
        opt.sublabel ? `${opt.label} - ${opt.sublabel}` : opt.label;

    const updateDropdownPosition = useCallback(() => {
        if (!inputRef.current || !isOpen) return;
        setCoords(computeAutocompleteCoords(inputRef.current));
    }, [isOpen]);

    useLayoutEffect(() => {
        updateDropdownPosition();
    }, [updateDropdownPosition]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const inContainer = containerRef.current?.contains(target);
            const inDropdown = dropdownRef.current?.contains(target);
            if (!inContainer && !inDropdown) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const summarizeSelection = (selected: string[]) => {
        if (selected.length === 0) return '';
        const labels = selected
            .map((id) => options.find((opt) => String(opt.value) === String(id)))
            .filter(Boolean)
            .map((opt) => optionDisplayText(opt!));
        if (labels.length <= 2) return labels.join(', ');
        return `${labels.length} itens selecionados`;
    };

    return (
        <div className={className} ref={containerRef}>
            <label htmlFor={`${name}-input`} className="block text-sm font-semibold text-gray-700 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <Controller
                name={name}
                control={control}
                defaultValue={[]}
                render={({ field: { onChange, value } }) => {
                    const selected: string[] = Array.isArray(value)
                        ? value.map((entry) => String(entry))
                        : [];
                    const displayText = isOpen ? search : summarizeSelection(selected);

                    const openDropdown = () => {
                        if (disabled) return;
                        if (inputRef.current) {
                            setCoords(computeAutocompleteCoords(inputRef.current));
                        }
                        setIsOpen(true);
                    };

                    const toggleOption = (optionValue: string | number) => {
                        const id = String(optionValue);
                        const next = selected.includes(id)
                            ? selected.filter((entry) => entry !== id)
                            : [...selected, id];
                        onChange(next);
                    };

                    return (
                        <div className="relative">
                            <input
                                ref={inputRef}
                                id={`${name}-input`}
                                type="text"
                                role="combobox"
                                aria-expanded={isOpen}
                                aria-controls={listboxId}
                                aria-autocomplete="list"
                                aria-haspopup="listbox"
                                disabled={disabled}
                                value={displayText}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    openDropdown();
                                }}
                                onFocus={() => {
                                    setSearch('');
                                    openDropdown();
                                }}
                                placeholder={placeholder}
                                className={`block w-full border rounded-lg shadow-sm py-2.5 px-3 pr-10 focus:outline-none focus:ring-2 transition-all sm:text-sm bg-white text-gray-900 placeholder-gray-400 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
                                ${errorMessage ? 'border-red-300 focus:ring-red-200 focus:border-red-500' : 'border-gray-300 focus:ring-salesforce-blue/20 focus:border-salesforce-blue'}`}
                                autoComplete="off"
                            />
                            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </span>

                            {isOpen && createPortal(
                                <div
                                    ref={dropdownRef}
                                    id={listboxId}
                                    role="listbox"
                                    aria-multiselectable="true"
                                    aria-label={label}
                                    style={{
                                        position: 'fixed',
                                        left: coords.left - window.scrollX,
                                        width: coords.width,
                                        zIndex: 99999,
                                        maxHeight: coords.maxHeight,
                                        ...(coords.openUpward
                                            ? { bottom: coords.bottom, top: 'auto' }
                                            : { top: (coords.top ?? 0) - window.scrollY, bottom: 'auto' }),
                                    }}
                                    className="bg-white shadow-xl rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm animate-fade-in border border-gray-100"
                                >
                                    {filteredOptions.length > 0 ? filteredOptions.map((option) => {
                                        const isSelected = selected.includes(String(option.value));
                                        return (
                                            <div
                                                key={option.value}
                                                role="option"
                                                aria-selected={isSelected}
                                                className={`relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-blue-50 transition-colors ${isSelected ? 'text-salesforce-blue font-semibold bg-blue-50/50' : 'text-gray-900'}`}
                                                onClick={() => toggleOption(option.value)}
                                            >
                                                <span className="block truncate">
                                                    {option.sublabel ? (
                                                        <>
                                                            <span>{option.label}</span>{' '}
                                                            <span className="text-gray-400">{option.sublabel}</span>
                                                        </>
                                                    ) : (
                                                        option.label
                                                    )}
                                                </span>
                                                {isSelected && (
                                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-salesforce-blue">
                                                        <Check className="h-4 w-4" aria-hidden="true" />
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    }) : (
                                        <div className="py-2 px-3 text-gray-500 italic">{emptyMessage}</div>
                                    )}
                                </div>,
                                document.body
                            )}
                        </div>
                    );
                }}
            />
            {errorMessage && <p className="mt-1 text-xs text-red-600">{errorMessage}</p>}
        </div>
    );
};
