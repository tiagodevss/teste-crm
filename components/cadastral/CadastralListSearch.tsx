import React from 'react';
import { Search } from 'lucide-react';

const INPUT_CLASS =
  'w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20 focus:border-salesforce-blue transition-all shadow-sm';

export interface CadastralListSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSubmitSearch: () => void;
  placeholder?: string;
  className?: string;
  id?: string;
  /** Botão explícito ao lado (ex.: tela de Usuários) */
  showSubmitButton?: boolean;
  submitButtonLabel?: string;
  'aria-label'?: string;
}

export function CadastralListSearch({
  value,
  onChange,
  onSubmitSearch,
  placeholder = 'Buscar... (Enter)',
  className = '',
  id,
  showSubmitButton = false,
  submitButtonLabel = 'Buscar',
  'aria-label': ariaLabel = 'Buscar na listagem',
}: CadastralListSearchProps) {
  return (
    <div className={`flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1 ${className}`}>
      <div className="relative w-full md:w-72">
        <input
          id={id}
          type="search"
          autoComplete="off"
          placeholder={placeholder}
          className={INPUT_CLASS}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmitSearch()}
          aria-label={ariaLabel}
        />
        <Search className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" size={18} aria-hidden />
      </div>
      {showSubmitButton && (
        <button
          type="button"
          onClick={onSubmitSearch}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20 transition-colors shrink-0"
        >
          {submitButtonLabel}
        </button>
      )}
    </div>
  );
}
