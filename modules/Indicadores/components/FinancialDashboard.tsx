import { useIndicatorPeriods } from '../hooks/useIndicatorPeriods';
import { IndicatorPeriodComparison } from './IndicatorPeriodComparison';
import { isDemo } from '../../../config/demo';
import { buildDemoDrilldown } from '../../../lib/demoDrilldown';
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  DollarSign,
  Banknote,
  CheckCircle,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { api } from '../../../lib/axios';
import { DateFilterBar } from '../../../components/DateFilterBar';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { KpiCard } from './KpiCard';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useUserStore } from '../../Login/store/useUserStore';
import { CRM_DRILL_DOWN } from '../../../lib/crmNavigation';
import { DashboardHelpPanel, FunnelConversionLegend } from './DashboardHelpPanel';
import { DashboardFilterSummary, type DashboardFilterChip } from './DashboardFilterSummary';

interface FunnelStage {
  stage: string;
  count: number;
  value: number;
  percentOfTotal: number;
  conversionFromPrev: number;
}

interface RankingEntry {
  userId: string;
  name: string;
  leads: number;
  released: number;
  releasedValue: number;
  approvalRate: number;
}

interface FinancialResponse {
  summary: {
    financialLeads: number;
    financialLeadsChange: number;
    releases: number;
    releasesChange: number;
    forecastValue: number;
    releasedValue: number;
    releasedValueChange: number;
    pendingValue: number;
    averageTicket: number;
    approvalRate: number;
    approvalRateChange: number;
  };
  funnel: FunnelStage[];
  ranking: RankingEntry[];
  alertsCount: number;
}

export const FinancialDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { usersList, fetchUsers } = useUserStore();
  const [data, setData] = useState<FinancialResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { dateFilter, dateRange, comparisonRange, customPeriod, filterKey, options, handleDateFilterChange, resetDateFilter } = useIndicatorPeriods();
  const [responsibleId, setResponsibleId] = useState('');

  const navigateCrm = (path: string) => navigate(isDemo ? buildDemoDrilldown(path, dateRange, 'financial') : path);

  const filterChips = useMemo((): DashboardFilterChip[] => {
    const chips: DashboardFilterChip[] = [];
    if (customPeriod || dateFilter !== '60days') {
      chips.push({
        id: 'period',
        label:
          dateRange.dateFrom && dateRange.dateTo
            ? `${formatDate(dateRange.dateFrom)} – ${formatDate(dateRange.dateTo)}`
            : 'Todo o período',
        onRemove: resetDateFilter,
      });
    }
    if (responsibleId) {
      chips.push({
        id: 'owner',
        label: usersList.find((u) => u.id === responsibleId)?.name ?? 'Responsável',
        onRemove: () => setResponsibleId(''),
      });
    }
    return chips;
  }, [dateFilter, dateRange.dateFrom, dateRange.dateTo, responsibleId, usersList, customPeriod, resetDateFilter]);

  const clearFilters = () => {
    resetDateFilter();
    setResponsibleId('');
  };

  useEffect(() => {
    fetchUsers({ page: 1, limit: 200 }).catch(() => {});
  }, [fetchUsers]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    const q = new URLSearchParams();
    if (dateRange.dateFrom) q.set('startDate', dateRange.dateFrom);
    if (dateRange.dateTo) q.set('endDate', dateRange.dateTo);
    if (responsibleId) q.set('responsibleId', responsibleId);
    api
      .get<FinancialResponse>(`/indicators/financial?${q.toString()}`)
      .then((r) => { if (active) setData(r.data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [dateRange.dateFrom, dateRange.dateTo, responsibleId]);

  const retryFetch = () => {
    setError(false);
    setLoading(true);
    const q = new URLSearchParams();
    if (dateRange.dateFrom) q.set('startDate', dateRange.dateFrom);
    if (dateRange.dateTo) q.set('endDate', dateRange.dateTo);
    if (responsibleId) q.set('responsibleId', responsibleId);
    api
      .get<FinancialResponse>(`/indicators/financial?${q.toString()}`)
      .then((r) => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  if (loading && !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl border border-gray-200" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl border border-gray-200" />
      </div>
    );
  }

  if (error || (!loading && !data)) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Não foi possível carregar os indicadores da Financeira"
        description="Verifique sua conexão e tente novamente."
        action={
          <button
            type="button"
            onClick={retryFetch}
            className="px-4 py-2 text-sm font-semibold text-white bg-salesforce-blue rounded-lg hover:bg-salesforce-hover transition-colors"
          >
            Tentar novamente
          </button>
        }
      />
    );
  }

  const s = data!.summary;
  const funnel = data!.funnel;
  const ranking = data!.ranking;
  const maxValue = funnel.reduce((max, f) => Math.max(max, f.value), 0);

  return (
    <div
      className={`space-y-6 transition-opacity duration-200 ${loading ? 'opacity-60 pointer-events-none' : ''}`}
      aria-busy={loading}
    >
      <div className="flex flex-wrap gap-3 items-end">
        <DateFilterBar key={filterKey} period={dateFilter} initialOptions={options} onFilterChange={handleDateFilterChange} />
        <div className="min-w-[180px]">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Responsável</label>
          <select
            value={responsibleId}
            onChange={(e) => setResponsibleId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">Todos</option>
            {usersList.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      <DashboardFilterSummary chips={filterChips} onClearAll={filterChips.length ? clearFilters : undefined} />

      <IndicatorPeriodComparison operation="financial" primary={dateRange} comparison={comparisonRange} responsibleId={responsibleId} summary={s} />

      {!isDemo && <DashboardHelpPanel title="Como ler este painel">
        <p>
          KPIs refletem leads e valores da operação financeira no período. Valor pendente = previsto em
          andamento menos valor já liberado.
        </p>
        <p>
          Linhas do funil e ranking abrem o CRM filtrado por etapa ou responsável. SLA vencido usa o atalho
          &quot;Ver no CRM&quot;.
        </p>
      </DashboardHelpPanel>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Leads financeiros"
          value={s.financialLeads.toLocaleString('pt-BR')}
          change={s.financialLeadsChange}
          changeLabel="vs período anterior"
          icon={Users}
          color="blue"
          tooltip="Clique para ver leads no CRM"
          onClick={() => navigateCrm(CRM_DRILL_DOWN.allLeads(responsibleId || undefined))}
        />
        <KpiCard
          title="Valor liberado"
          value={formatCurrency(s.releasedValue)}
          change={s.releasedValueChange}
          changeLabel="vs período anterior"
          icon={Banknote}
          color="blue"
        />
        <KpiCard
          title="Valor pendente"
          value={formatCurrency(s.pendingValue)}
          subtitle="Previsto − liberado · cobrar liberação"
          icon={Clock}
          color="amber"
        />
        <KpiCard
          title="Taxa de liberação"
          value={`${s.approvalRate.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%`}
          change={s.approvalRateChange}
          changeLabel="p.p. vs período anterior"
          icon={TrendingUp}
          color="blue"
        />
      </div>

      <details className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          Ver métricas complementares ({3} indicadores)
        </summary>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 px-5 pb-5 pt-1 border-t border-gray-100">
        <KpiCard
          title="Valor previsto"
          value={formatCurrency(s.forecastValue)}
          subtitle="Em andamento (Lead + Oportunidade)"
          icon={DollarSign}
          color="blue"
          tooltip="Soma do valor estimado das oportunidades em andamento"
        />
        <KpiCard
          title="Liberações concluídas"
          value={s.releases.toLocaleString('pt-BR')}
          change={s.releasesChange}
          changeLabel="vs período anterior"
          icon={CheckCircle}
          color="blue"
        />
        <KpiCard
          title="Ticket médio"
          value={formatCurrency(s.averageTicket)}
          icon={DollarSign}
          color="blue"
        />
        </div>
      </details>

      {data!.alertsCount > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4" role="alert">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-600 flex-shrink-0" aria-hidden />
              <p className="text-sm font-semibold text-red-800">
                {data!.alertsCount} {data!.alertsCount === 1 ? 'operação financeira com SLA vencido' : 'operações financeiras com SLA vencido'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigateCrm(CRM_DRILL_DOWN.slaOverdue(responsibleId || undefined))}
              className="text-sm font-semibold text-red-900 hover:text-red-950 underline-offset-2 hover:underline"
            >
              Ver no CRM
            </button>
          </div>
        </div>
      ) : null}

      {funnel.length > 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-500" aria-hidden />
            Funil financeiro
          </h3>
          <FunnelConversionLegend />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500">Etapa</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Qtd</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">% do total</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Conversão etapa ant.</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Valor previsto</th>
                  <th className="py-2 pl-3 text-xs font-semibold text-gray-500">Barra de valor</th>
                </tr>
              </thead>
              <tbody>
                {funnel.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer focus-within:bg-gray-50"
                    onClick={() => navigateCrm(CRM_DRILL_DOWN.byStage(row.stage, responsibleId || undefined))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigateCrm(CRM_DRILL_DOWN.byStage(row.stage, responsibleId || undefined));
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    title={`Abrir etapa ${row.stage} no CRM`}
                  >
                    <td className="py-2.5 pr-4 font-medium text-gray-800">{row.stage}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-bold text-gray-900">
                      {row.count.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-gray-600">
                      {row.percentOfTotal.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {idx === 0 ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <span className={row.conversionFromPrev < 50 ? 'text-red-600 font-semibold' : row.conversionFromPrev < 75 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                          {row.conversionFromPrev.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-blue-700 font-semibold">
                      {row.value > 0 ? formatCurrency(row.value) : '—'}
                    </td>
                    <td className="py-2.5 pl-3 w-32">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${maxValue > 0 ? Math.min((row.value / maxValue) * 100, 100) : 0}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {ranking.length > 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Users size={16} className="text-blue-500" />
            Ranking por Responsável
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500">Responsável</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Leads</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Liberações</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Valor liberado</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((row, idx) => (
                  <tr
                    key={row.userId}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigateCrm(CRM_DRILL_DOWN.allLeads(row.userId))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigateCrm(CRM_DRILL_DOWN.allLeads(row.userId));
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    title={`Ver leads de ${row.name} no CRM`}
                  >
                    <td className="py-2.5 pr-4 font-medium text-gray-800">
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-4 text-center">{idx + 1}</span>
                        {row.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-gray-700">{row.leads.toLocaleString('pt-BR')}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-gray-900">{row.released.toLocaleString('pt-BR')}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-blue-700">{formatCurrency(row.releasedValue)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      <span className={`font-semibold ${row.approvalRate >= 20 ? 'text-emerald-600' : row.approvalRate >= 10 ? 'text-amber-600' : 'text-red-500'}`}>
                        {row.approvalRate.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!funnel.length && !ranking.length && !loading ? (
        <EmptyState
          icon={BarChart3}
          title="Sem dados para o período selecionado"
          description="Ajuste os filtros ou verifique se existem leads na operação Financeira."
        />
      ) : null}
    </div>
  );
};
