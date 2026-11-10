import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/axios';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { indicatorQuery, type IndicatorDateRange } from '../../../lib/dashboardPeriods';
interface Props {
  operation: 'general' | 'accounting';
  primary: IndicatorDateRange;
  comparison?: IndicatorDateRange;
  responsibleId: string;
  summary: object;
}
const metrics = {
  general: [['totalLeads', 'Leads totais', 'count'], ['totalRevenue', 'Honorários contratados', 'money'], ['conversionRate', 'Conversão geral', 'rate'], ['criticalAlerts', 'Alertas críticos', 'count']],
  accounting: [['leadsReceived', 'Leads recebidos', 'count'], ['clientsActivated', 'Clientes ativados', 'count'], ['recurringRevenue', 'Receita recorrente', 'money'], ['conversionRate', 'Conversão', 'rate']],
} as const;
function formatted(value: number, kind: string) {
  return kind === 'money' ? formatCurrency(value) : kind === 'rate' ? `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : value.toLocaleString('pt-BR');
}
export function IndicatorPeriodComparison({ operation, primary, comparison, responsibleId, summary }: Props) {
  const [data, setData] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const start = comparison?.dateFrom; const end = comparison?.dateTo;
  useEffect(() => {
    let active = true;
    setData(null); setError(false);
    if (!start || !end) return;
    api.get<{ summary: Record<string, number> }>(`/indicators/${operation}?${indicatorQuery({ dateFrom: start, dateTo: end }, responsibleId)}`)
      .then(response => { if (active) setData(response.data.summary); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [operation, start, end, responsibleId, retry]);
  if (!start || !end) return null;
  const first = summary as Record<string, number>;
  return <section className="rounded-lg border border-gray-200 bg-white p-4" aria-label="Comparativo dos períodos selecionados" data-testid="indicator-period-comparison">
    <h2 className="text-base font-semibold text-gray-900">Comparativo dos períodos selecionados</h2>
    <p className="mt-1 text-sm text-gray-600">Período 1: {formatDate(primary.dateFrom!)} – {formatDate(primary.dateTo!)}. Período 2: {formatDate(start)} – {formatDate(end)}.</p>
    <p className="mt-1 text-sm text-gray-600">Os indicadores e gráficos abaixo mostram o Período 1. A variação nesta tabela compara o Período 2 com o Período 1.</p>
    {error ? <p role="alert" className="mt-3 text-sm text-red-800">Não foi possível carregar o Período 2. <button className="font-semibold underline" onClick={() => setRetry(value => value + 1)}>Tentar novamente</button></p>
      : !data ? <p role="status" className="mt-3 text-sm">Carregando comparação...</p>
      : <div className="mt-3 overflow-x-auto"><table className="w-full text-sm text-left">
        <caption className="sr-only">Comparativo por indicador e variação absoluta</caption>
        <thead><tr className="border-b text-gray-600"><th scope="col" className="p-2">Indicador</th><th scope="col" className="p-2">Período 1</th><th scope="col" className="p-2">Período 2</th><th scope="col" className="p-2">Variação (2 − 1)</th></tr></thead>
        <tbody>{metrics[operation].map(([key, label, kind]) => {
          const a = first[key] ?? 0; const b = data[key] ?? 0; const delta = Math.round((b - a) * 100) / 100;
          return <tr key={key} className="border-b last:border-0"><th scope="row" className="p-2 font-medium">{label}</th><td className="p-2 tabular-nums">{formatted(a, kind)}</td><td className="p-2 tabular-nums">{formatted(b, kind)}</td><td className="p-2 tabular-nums">{kind === 'rate' ? `${delta.toLocaleString('pt-BR')} p.p.` : formatted(delta, kind)}</td></tr>;
        })}</tbody>
      </table></div>}
  </section>;
}
