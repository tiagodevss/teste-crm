import React, { useEffect, useId, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { searchMunicipios, type MunicipioOption } from '../../../lib/financeira-api';

interface MunicipioAutocompleteProps {
    label: string;
    value: string;
    onChange: (value: string, option?: MunicipioOption) => void;
    error?: string;
    required?: boolean;
    disabled?: boolean;
}

/**
 * Autocomplete de município (catálogo IBGE local do backend). O valor gravado é `<Município> - <UF>`
 * e só é aceito quando escolhido na lista. Navegação por teclado: ↑/↓, Enter e Esc.
 */
export function MunicipioAutocomplete({ label, value, onChange, error, required, disabled }: MunicipioAutocompleteProps) {
    const inputId = useId();
    const listId = `${inputId}-list`;
    const [text, setText] = useState(value);
    const [options, setOptions] = useState<MunicipioOption[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Mantém o texto alinhado quando o valor é redefinido externamente (reset do formulário).
    useEffect(() => {
        setText(value);
    }, [value]);

    useEffect(() => {
        if (!open) return;
        const term = text.trim();
        if (term.length < 2) {
            setOptions([]);
            return;
        }
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setLoading(true);
            try {
                const result = await searchMunicipios(term, controller.signal);
                setOptions(result);
                setActive(0);
            } catch {
                if (!controller.signal.aborted) setOptions([]);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 220);
        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [text, open]);

    useEffect(() => {
        const handler = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const select = (option: MunicipioOption) => {
        setText(option.value);
        onChange(option.value, option);
        setOpen(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActive((current) => Math.min(current + 1, Math.max(options.length - 1, 0)));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((current) => Math.max(current - 1, 0));
        } else if (event.key === 'Enter' && open && options[active]) {
            event.preventDefault();
            select(options[active]);
        } else if (event.key === 'Escape' && open) {
            event.stopPropagation();
            setOpen(false);
        }
    };

    return (
        <div ref={containerRef} className="relative">
            <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <input
                    id={inputId}
                    type="text"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={open && options[active] ? `${inputId}-opt-${active}` : undefined}
                    aria-invalid={Boolean(error)}
                    autoComplete="off"
                    disabled={disabled}
                    value={text}
                    placeholder="Digite a cidade (ex.: Sao Paulo)"
                    onChange={(event) => {
                        setText(event.target.value);
                        setOpen(true);
                        // Texto digitado só vira valor ao escolher uma opção da lista.
                        if (value) onChange('');
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    className={`block w-full border rounded-lg shadow-sm py-2.5 pl-9 pr-9 focus:outline-none focus:ring-2 sm:text-sm bg-white text-gray-900 placeholder-gray-400 ${
                        error
                            ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                            : 'border-gray-300 focus:ring-salesforce-blue/20 focus:border-salesforce-blue'
                    }`}
                />
                {loading && (
                    <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" aria-hidden="true" />
                )}
            </div>
            {open && text.trim().length >= 2 && (
                <ul
                    id={listId}
                    role="listbox"
                    className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-100 bg-white py-1 text-sm shadow-xl"
                >
                    {options.length === 0 && !loading ? (
                        <li className="px-3 py-2 italic text-gray-500">Nenhum município encontrado</li>
                    ) : (
                        options.map((option, index) => (
                            <li
                                key={option.ibgeCode}
                                id={`${inputId}-opt-${index}`}
                                role="option"
                                aria-selected={index === active}
                                onMouseEnter={() => setActive(index)}
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                    select(option);
                                }}
                                className={`cursor-pointer px-3 py-2 ${index === active ? 'bg-blue-50 text-salesforce-blue' : 'text-gray-900'}`}
                            >
                                {option.name} <span className="text-gray-400">- {option.uf}</span>
                            </li>
                        ))
                    )}
                </ul>
            )}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}
