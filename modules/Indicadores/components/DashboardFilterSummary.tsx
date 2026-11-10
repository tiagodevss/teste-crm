import React from 'react';
import { X } from 'lucide-react';

export interface DashboardFilterChip {
  id: string;
  label: string;
  onRemove?: () => void;
}

interface DashboardFilterSummaryProps {
  chips: DashboardFilterChip[];
  onClearAll?: () => void;
  className?: string;
}

export const DashboardFilterSummary: React.FC<DashboardFilterSummaryProps> = ({
  chips,
  onClearAll,
  className = '',
}) => {
  if (chips.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Filtros ativos"
    >
      <span className="text-xs font-semibold text-gray-500 shrink-0">Filtros:</span>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700"
        >
          {chip.label}
          {chip.onRemove ? (
            <button
              type="button"
              onClick={chip.onRemove}
              className="rounded p-0.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30"
              aria-label={`Remover filtro ${chip.label}`}
            >
              <X size={12} aria-hidden />
            </button>
          ) : null}
        </span>
      ))}
      {onClearAll ? (
        <button
          type="button"
          onClick={onClearAll}
          className="ml-auto text-xs font-semibold text-salesforce-blue hover:underline focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30 rounded"
        >
          Limpar todos
        </button>
      ) : null}
    </div>
  );
};
