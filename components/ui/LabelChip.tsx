import { X } from 'lucide-react';
import { LeadLabel } from '../../types';

interface LabelChipProps {
  label: LeadLabel;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

export function LabelChip({ label, onRemove, size = 'sm' }: LabelChipProps) {
  const pad = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium border ${pad}`}
      style={{
        backgroundColor: `${label.color}18`,
        borderColor: `${label.color}40`,
        color: label.color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: label.color }}
      />
      {label.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 rounded-full hover:bg-black/10 p-0.5 transition-colors"
          aria-label={`Remover label ${label.name}`}
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}
