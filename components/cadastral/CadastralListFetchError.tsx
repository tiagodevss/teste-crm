import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';

export interface CadastralListFetchErrorProps {
  title: string;
  message: string;
  onRetry: () => void;
  className?: string;
}

export function CadastralListFetchError({ title, message, onRetry, className = '' }: CadastralListFetchErrorProps) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      description={message}
      action={
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 bg-salesforce-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-salesforce-blue/40"
        >
          Tentar novamente
        </button>
      }
      className={`bg-red-50/70 border border-red-200 text-red-800 rounded-lg ${className}`}
    />
  );
}
