import React from 'react';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Tooltip } from '../../../components/ui/Tooltip';

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  color?: 'blue' | 'teal' | 'green' | 'amber' | 'red' | 'slate';
  tooltip?: string;
  onClick?: () => void;
  active?: boolean;
}

const COLOR_MAP: Record<
  NonNullable<KpiCardProps['color']>,
  { icon: string; border: string; badge: string }
> = {
  blue: {
    icon: 'bg-blue-50 text-blue-600',
    border: 'border-t-blue-500',
    badge: 'bg-blue-50 text-blue-700',
  },
  teal: {
    icon: 'bg-teal-50 text-teal-600',
    border: 'border-t-teal-500',
    badge: 'bg-teal-50 text-teal-700',
  },
  green: {
    icon: 'bg-emerald-50 text-emerald-600',
    border: 'border-t-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-600',
    border: 'border-t-amber-500',
    badge: 'bg-amber-50 text-amber-700',
  },
  red: {
    icon: 'bg-red-50 text-red-600',
    border: 'border-t-red-500',
    badge: 'bg-red-50 text-red-700',
  },
  slate: {
    icon: 'bg-slate-100 text-slate-600',
    border: 'border-t-slate-400',
    badge: 'bg-slate-100 text-slate-700',
  },
};

function TrendBadge({ change }: { change: number }) {
  const isPositive = change > 0;
  const isNeutral = change === 0;
  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
        <Minus size={11} />
        0%
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
      }`}
    >
      {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {isPositive ? '+' : ''}
      {change.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
    </span>
  );
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  subtitle,
  icon: Icon,
  color = 'blue',
  tooltip,
  onClick,
  active,
}) => {
  const colors = COLOR_MAP[color];
  return (
    <div
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick && active ? true : undefined}
      className={`relative bg-white rounded-xl border border-gray-200 p-5 shadow-sm border-t-4 ${colors.border} ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30' : ''
      } ${active ? 'ring-2 ring-salesforce-blue/35 shadow-md' : ''}`}
    >
      {tooltip ? (
        <div className="absolute top-3 right-3 z-10">
          <Tooltip content={tooltip} />
        </div>
      ) : null}
      {(Icon || change !== undefined) ? (
        <div className="flex items-start justify-between gap-3 mb-3">
          {Icon ? (
            <div className={`rounded-lg p-2 ${colors.icon}`}>
              <Icon size={20} />
            </div>
          ) : null}
          {change !== undefined ? <TrendBadge change={change} /> : null}
        </div>
      ) : null}
      <p className="text-xs font-semibold text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      {subtitle ? <p className="mt-1.5 text-xs text-gray-500 leading-snug">{subtitle}</p> : null}
      {changeLabel ? <p className="mt-1 text-xs text-gray-400">{changeLabel}</p> : null}
    </div>
  );
};
