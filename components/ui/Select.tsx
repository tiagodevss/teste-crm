import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps {
  value: string | number | undefined | null;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  label?: string;
  /** Exibe asterisco vermelho ao lado do label (para campos obrigatórios) */
  required?: boolean;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** Tamanho do campo: sm (compacto), md (padrão) */
  size?: 'sm' | 'md';
  /** Classe extra no trigger (ex: min-w para filtros) */
  triggerClassName?: string;
}

const sizeClasses = {
  sm: 'py-1.5 pl-2.5 pr-8 text-sm',
  md: 'py-2.5 pl-3 pr-10 text-sm',
};

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  label,
  required,
  placeholder = 'Selecione...',
  error,
  disabled = false,
  className = '',
  id,
  size = 'md',
  triggerClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const displayText = selectedOption ? selectedOption.label : placeholder;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inContainer && !inDropdown) setIsOpen(false);
    };

    const handleResize = () => setIsOpen(false);
    const handleScroll = (event: Event) => {
      const target = event.target as Node;
      if (dropdownRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const hasError = Boolean(error);

  return (
    <div className={className} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-semibold text-gray-700 mb-1.5"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          ref={buttonRef}
          id={id}
          type="button"
          onClick={toggleOpen}
          disabled={disabled}
          className={`
            relative w-full bg-white border rounded-lg shadow-sm text-left cursor-default
            focus:outline-none focus:ring-2 transition-all
            disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
            ${sizeClasses[size]}
            ${hasError
              ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
              : 'border-gray-300 focus:ring-salesforce-blue/20 focus:border-salesforce-blue'
            }
            ${triggerClassName}
          `}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={label || placeholder}
        >
          <span
            className={`block truncate ${!value && value !== 0 ? 'text-gray-400' : 'text-gray-900'}`}
          >
            {displayText}
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </span>
        </button>

        {isOpen &&
          createPortal(
            <div
              ref={dropdownRef}
              role="listbox"
              style={{
                position: 'fixed',
                top: coords.top - window.scrollY,
                left: coords.left - window.scrollX,
                width: coords.width,
                zIndex: 99999,
              }}
              className="bg-white shadow-xl max-h-60 rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none border border-gray-100 animate-fade-in"
            >
              {options.length > 0 ? (
                options.map((option) => {
                  const isSelected = String(value) === String(option.value);
                  return (
                    <div
                      key={String(option.value)}
                      role="option"
                      aria-selected={isSelected}
                      className={`
                        cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 transition-colors
                        ${isSelected ? 'text-salesforce-blue font-semibold bg-blue-50/50' : 'text-gray-900'}
                      `}
                      onClick={() => handleSelect(option.value)}
                    >
                      <span className="block truncate">{option.label}</span>
                      {isSelected && (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-salesforce-blue">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-2 px-3 text-gray-500 italic text-sm">
                  Nenhuma opção
                </div>
              )}
            </div>,
            document.body
          )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};
