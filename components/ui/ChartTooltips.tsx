import React from 'react';
import { formatCurrency } from '../../utils/formatters';

/** Payload item passado pelo Recharts para Bar/Line/Area tooltips */
export interface ChartTooltipPayloadItem {
  name: string;
  value: number;
  fill?: string;
  color?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
}

/** Props do tooltip de gráficos Bar/Line/Area (Recharts) */
export interface ChartBarTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string;
  /** Título exibido acima do label (ex: "Período"). Se não informado, o label é o título. */
  labelTitle?: string;
  /** Formata o valor exibido. Padrão: número formatado (locale). Para moeda use formatValueCurrency. */
  formatValue?: (value: number, name: string) => string;
  /** Sufixo após o valor (ex: "/5" para notas). */
  valueSuffix?: string;
}

const defaultFormatValue = (value: number): string =>
  value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** Tooltip padrão para gráficos de Barra, Linha e Área. Estilo consistente em todo o app. */
export const ChartBarTooltip: React.FC<ChartBarTooltipProps> = ({
  active,
  payload,
  label,
  labelTitle,
  formatValue = (v, _n) => defaultFormatValue(v),
  valueSuffix = '',
}) => {
  if (!active || !payload?.length) return null;
  const title = labelTitle ?? undefined;
  return (
    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-xl min-w-[200px] outline-none">
      {(title || label) && (
        <p className="font-bold text-gray-800 mb-2 border-b border-gray-100 pb-2 text-sm">
          {title && <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">{title}</span>}
          <span className={title ? 'block mt-0.5' : ''}>{label}</span>
        </p>
      )}
      <div className="space-y-2">
        {payload.map((entry, index) => {
          const color = entry.color ?? entry.fill ?? '#64748b';
          const text = formatValue(entry.value, entry.name) + valueSuffix;
          return (
            <div key={index} className="flex items-center justify-between text-xs gap-4">
              <span className="flex items-center gap-2 text-gray-600 font-medium min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="truncate">{entry.name}</span>
              </span>
              <span className="font-bold text-gray-800 tabular-nums shrink-0">{text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Formata valor como moeda para uso em ChartBarTooltip / ChartPieTooltip */
export const formatValueCurrency = (_value: number, _name: string): string =>
  formatCurrency(_value);

/** Props do tooltip de gráficos Pizza (Recharts) */
export interface ChartPieTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload?: { fill?: string } }>;
  /** Label da grandeza (ex: "Valor", "Faturamento"). Exibido como "Label: valor" */
  valueLabel?: string;
  /** Formata o valor. Padrão: número formatado. Para moeda use formatValueCurrency. */
  formatValue?: (value: number) => string;
  /** Sufixo após o valor (ex: "/5"). */
  valueSuffix?: string;
}

/** Tooltip padrão para gráficos de Pizza. Estilo consistente em todo o app. */
export const ChartPieTooltip: React.FC<ChartPieTooltipProps> = ({
  active,
  payload,
  valueLabel = 'Valor',
  formatValue = (v) => defaultFormatValue(v),
  valueSuffix = '',
}) => {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  const fill = data.payload?.fill;
  const text = formatValue(data.value) + valueSuffix;
  return (
    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-xl outline-none min-w-[180px]">
      <div className="flex items-center gap-2 mb-1">
        {fill && (
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: fill }} />
        )}
        <p className="text-sm font-bold text-gray-800 truncate">{data.name}</p>
      </div>
      <p className="text-xs text-gray-500">
        {valueLabel}: <span className="font-bold text-gray-700">{text}</span>
      </p>
    </div>
  );
};
