import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { ACTIVITIES_FOCUS_RING } from '../activitiesUi';

interface ActivitiesFetchErrorProps {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
  staleData?: boolean;
}

export function ActivitiesFetchError({
  message,
  onRetry,
  isRetrying = false,
  staleData = false,
}: ActivitiesFetchErrorProps) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
      role="alert"
    >
      <div className="flex items-start gap-2 min-w-0 flex-1">
        <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" aria-hidden />
        <div>
          <p>{message}</p>
          {staleData ? (
            <p className="mt-1 text-xs text-red-800">
              Exibindo dados anteriores enquanto a atualização não é concluída.
            </p>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className={`inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 text-xs font-semibold text-red-900 bg-white border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-60 ${ACTIVITIES_FOCUS_RING}`}
      >
        <RefreshCw size={14} className={isRetrying ? 'motion-safe:animate-spin motion-reduce:animate-none' : ''} aria-hidden />
        Tentar novamente
      </button>
    </div>
  );
}
