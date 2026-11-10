import React from 'react';
import { AlertTriangle, Clock3, PauseCircle } from 'lucide-react';
import { LeadSlaStatus } from '../../types';
import { formatDateTime } from '../../utils/formatters';

interface SlaBadgeProps {
  status?: LeadSlaStatus;
  dueAt?: string;
  pausedAt?: string;
  pauseTooltip?: string;
  compact?: boolean;
}

function getSlaConfig(status?: LeadSlaStatus) {
  switch (status) {
    case 'warning':
      return {
        label: 'SLA em atenção (24h+)',
        className: 'bg-amber-50 text-amber-800 border-amber-200',
        Icon: AlertTriangle,
      };
    case 'overdue':
      return {
        label: 'SLA atrasado (escalonado)',
        className: 'bg-red-50 text-red-800 border-red-200',
        Icon: AlertTriangle,
      };
    case 'on_time':
      return {
        label: 'SLA no prazo',
        className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        Icon: Clock3,
      };
    default:
      return {
        label: 'SLA sem prazo',
        className: 'bg-gray-50 text-gray-600 border-gray-200',
        Icon: Clock3,
      };
  }
}

export function SlaBadge({
  status,
  dueAt,
  pausedAt,
  pauseTooltip,
  compact = false,
}: SlaBadgeProps) {
  const isPaused = Boolean(pausedAt);
  const config = isPaused
    ? {
        label: 'SLA pausado',
        className: 'bg-blue-50 text-blue-800 border-blue-200',
        Icon: PauseCircle,
      }
    : getSlaConfig(status);
  const Icon = config.Icon;
  const title = isPaused
    ? pauseTooltip ??
      `SLA pausado em ${formatDateTime(pausedAt as string)} até o próximo retorno agendado.`
    : dueAt
      ? `Prazo: ${formatDateTime(dueAt)}`
      : 'Sem prazo configurado. Para definir ou alterar, abra Configurações do pipe > Etapas e informe o prazo total da etapa.';

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.className}`}
      title={title}
    >
      <Icon size={compact ? 12 : 14} />
      <span>
        {compact
          ? config.label.replace('SLA ', '')
          : config.label}
      </span>
      {!isPaused && dueAt && !compact && (
        <span className="opacity-80">• {formatDateTime(dueAt)}</span>
      )}
    </div>
  );
}
