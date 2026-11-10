import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Reduz padding e tamanhos para uso dentro de tabelas/cards */
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact = false,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-12 px-6'} ${className}`}
      role="status"
      aria-label={title}
    >
      <div
        className={`rounded-full flex items-center justify-center text-gray-400 ${compact ? 'w-12 h-12 mb-3' : 'w-16 h-16 mb-4'} bg-gray-100`}
        aria-hidden
      >
        <Icon size={compact ? 24 : 28} strokeWidth={1.5} />
      </div>
      <p className={`font-medium text-gray-700 ${compact ? 'text-sm' : 'text-base'}`}>{title}</p>
      {description && (
        <p className={`text-gray-500 mt-1 ${compact ? 'text-xs max-w-xs' : 'text-sm mt-1.5 max-w-sm'}`}>
          {description}
        </p>
      )}
      {action && <div className={`mt-4 ${compact ? 'mt-3' : ''}`}>{action}</div>}
    </div>
  );
}
