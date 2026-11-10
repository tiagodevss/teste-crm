import React from 'react';
import { HelpCircle } from 'lucide-react';

interface DashboardHelpPanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const DashboardHelpPanel: React.FC<DashboardHelpPanelProps> = ({
  title,
  children,
  className = '',
}) => (
  <details
    className={`rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-600 ${className}`}
  >
    <summary className="cursor-pointer list-none font-semibold text-gray-700 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue/40 rounded">
      <HelpCircle size={16} className="text-gray-400 shrink-0" aria-hidden />
      {title}
    </summary>
    <div className="mt-3 space-y-2 leading-relaxed">{children}</div>
  </details>
);

export const FunnelConversionLegend: React.FC<{ onRowClickHint?: boolean }> = ({
  onRowClickHint = true,
}) => (
  <p className="text-xs text-gray-500 mb-3 leading-relaxed">
    Conversão da etapa anterior:{' '}
    <span className="text-emerald-600 font-semibold">≥75%</span> boa,{' '}
    <span className="text-amber-600 font-semibold">50–74%</span> atenção,{' '}
    <span className="text-red-600 font-semibold">&lt;50%</span> crítica.
    {onRowClickHint ? ' Clique em uma linha para abrir os leads no CRM.' : null}
  </p>
);
