import { useIndicatorPeriods } from '../hooks/useIndicatorPeriods';
import { IndicatorPeriodComparison } from './IndicatorPeriodComparison';
import { isDemo } from '../../../config/demo';
import { buildDemoDrilldown } from '../../../lib/demoDrilldown';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
} from 'recharts';
import {
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Target,
  ShieldCheck,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { api } from '../../../lib/axios';
import { DateFilterBar } from '../../../components/DateFilterBar';
import { formatCurrency } from '../../../utils/formatters';
import { KpiCard } from './KpiCard';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  ChartBarTooltip,
  ChartPieTooltip,
  formatValueCurrency,
} from '../../../components/ui/ChartTooltips';
import { useUserStore } from '../../Login/store/useUserStore';
import { CHART_AXIS_TICK, CHART_COLORS, CHART_GRID_STROKE, CHART_PIE_FALLBACK } from '../../../lib/chartTheme';
import { CRM_DRILL_DOWN } from '../../../lib/crmNavigation';
import { DashboardHelpPanel } from './DashboardHelpPanel';
import { DashboardFilterSummary, type DashboardFilterChip } from './DashboardFilterSummary';
import { AppPath } from '../../../routes';
import { formatDate } from '../../../utils/formatters';

interface GeneralSummary {
  healthScore: number;
  healthStatus: 'GOOD' | 'ATTENTION' | 'CRITICAL';
  totalLeads: number;
  totalLeadsChange: number;
  openOpportunities: number;
  totalRevenue: number;
  totalRevenueChange: number;
  conversionRate: number;
  conversionRateChange: number;
  criticalAlerts: number;
}

interface OperationSide {
  totalLeads: number;
  totalLeadsChange: number;
  clientsActivated?: number;
  recurringRevenue?: number;
  conversionRate?: number;
  alertsCount: number;
  releases?: number;
  releasedValue?: number;
  approvalRate?: number;
}

interface EvolutionPoint {
  label: string;
  totalLeads: number;
  accountingLeads: number;
  openingLeads: number;
  onboardingLeads: number;
  totalRevenue: number;
  conversionRate: number;
  criticalAlerts: number;
}

interface OperationSharePoint {
  operation: string;
  pipeId: string;
  slug: string;
  leads: number;
  revenue: number;
  alertsCount: number;
  conversionRate: number;
}

interface GeneralResponse {
  summary: GeneralSummary;
  accounting: OperationSide;
  evolution?: EvolutionPoint[];
  operationShare?: OperationSharePoint[];
}

const HEALTH_LABELS: Record<'GOOD' | 'ATTENTION' | 'CRITICAL', string> = {
  GOOD: 'Boa',
  ATTENTION: 'Atenção',
  CRITICAL: 'Crítica',
};

const PIE_COLORS: Record<string, string> = {
  Contabilidade: '#10b981',
  'Abertura de Empresas': '#2563eb',
  'Onboarding Contábil': '#7c3aed',
};

export const GeneralDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { usersList, fetchUsers } = useUserStore();
  const [data, setData] = useState<GeneralResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { dateFilter, dateRange, comparisonRange, customPeriod, filterKey, options, handleDateFilterChange, resetDateFilter } = useIndicatorPeriods();
  const [responsibleId, setResponsibleId] = useState('');
  type ChartTab = 'evolucao' | 'receita' | 'participacao' | 'comparativo';
  const [chartTab, setChartTab] = useState<ChartTab>('evolucao');
  const chartTabs: { key: ChartTab; label: string }[] = [
    { key: 'evolucao', label: 'Evolução' },
    { key: 'receita', label: 'Honorários e alertas' },
    { key: 'participacao', label: 'Participação' },
    { key: 'comparativo', label: 'Comparativo' },
  ];

  const handleChartTabKeyDown = (event: React.KeyboardEvent, current: ChartTab) => {
    const idx = chartTabs.findIndex((t) => t.key === current);
    if (idx < 0) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setChartTab(chartTabs[(idx + 1) % chartTabs.length].key);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setChartTab(chartTabs[(idx - 1 + chartTabs.length) % chartTabs.length].key);
    }
  };

  const navigateCrm = (path: string) => navigate(isDemo ? buildDemoDrilldown(path, dateRange, 'general') : path);

  const filterChips = useMemo((): DashboardFilterChip[] => {
    const chips: DashboardFilterChip[] = [];
    if (customPeriod || dateFilter !== '60days') {
      const periodLabel =
        dateRange.dateFrom && dateRange.dateTo
          ? `${formatDate(dateRange.dateFrom)} – ${formatDate(dateRange.dateTo)}`
          : 'Todo o período';
      chips.push({
        id: 'period',
        label: periodLabel,
        onRemove: resetDateFilter,
      });
    }
    if (responsibleId) {
      const name = usersList.find((u) => u.id === responsibleId)?.name ?? 'Responsável';
      chips.push({
        id: 'owner',
        label: name,
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
      .get<GeneralResponse>(`/indicators/general?${q.toString()}`)
      .then((r) => {
        if (active) setData(r.data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [dateRange.dateFrom, dateRange.dateTo, responsibleId]);

  if (loading && !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl border border-gray-200" />
          ))}
        </div>
        <div className="h-96 bg-gray-100 rounded-xl border border-gray-200" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-80 bg-gray-100 rounded-xl border border-gray-200" />
          <div className="h-80 bg-gray-100 rounded-xl border border-gray-200" />
        </div>
      </div>
    );
  }

  if (error || (!loading && !data)) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Não foi possível carregar os indicadores gerais"
        description="Verifique sua conexão e tente novamente."
        action={
          <button
            type="button"
            onClick={() => {
              setError(false);
              setLoading(true);
              const q = new URLSearchParams();
              if (dateRange.dateFrom) q.set('startDate', dateRange.dateFrom);
              if (dateRange.dateTo) q.set('endDate', dateRange.dateTo);
              if (responsibleId) q.set('responsibleId', responsibleId);
              api
                .get<GeneralResponse>(`/indicators/general?${q.toString()}`)
                .then((r) => setData(r.data))
                .catch(() => setError(true))
                .finally(() => setLoading(false));
            }}
            className="px-4 py-2 text-sm font-semibold text-white bg-salesforce-blue rounded-lg hover:bg-salesforce-hover transition-colors"
          >
            Tentar novamente
          </button>
        }
      />
    );
  }

  const s = data.summary;
  const acc = data.accounting;
  const evolution = data.evolution ?? [];
  const operationShare = data.operationShare ?? [];
  const hasEvolutionData = evolution.some(
    (point) =>
      point.totalLeads > 0 ||
      point.totalRevenue > 0 ||
      point.conversionRate > 0 ||
      point.criticalAlerts > 0,
  );
  const hasOperationShareData = operationShare.some(
    (point) => point.leads > 0 || point.revenue > 0 || point.alertsCount > 0,
  );

  const operationComparison = operationShare;

  const drillOwner = responsibleId || undefined;

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
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DashboardFilterSummary chips={filterChips} onClearAll={filterChips.length ? clearFilters : undefined} />

      <IndicatorPeriodComparison operation="general" primary={dateRange} comparison={comparisonRange} responsibleId={responsibleId} summary={s} />

      {!isDemo && <DashboardHelpPanel title="Como ler este painel">
        <p>
          <strong>Saúde geral:</strong> pontuação de 0–100 com base na conversão do período e no cumprimento de SLA.
          Boa ≥70, Atenção 40–69, Crítica &lt;40.
        </p>
        <p>
          <strong>Alertas críticos:</strong> leads com SLA vencido. Use os pills e KPIs clicáveis para abrir o CRM já filtrado.
        </p>
      </DashboardHelpPanel>}

      {s.criticalAlerts > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4" role="alert">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle size={18} className="flex-shrink-0" aria-hidden />
              {s.criticalAlerts.toLocaleString('pt-BR')} lead(s) com SLA vencido no período.
            </p>
            <button
              type="button"
              onClick={() => navigateCrm(CRM_DRILL_DOWN.slaOverdue(drillOwner))}
              className="text-sm font-semibold text-red-900 hover:text-red-950 underline-offset-2 hover:underline text-left sm:text-right"
            >
              Ver no CRM
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Saúde da operação"
          value={`${s.healthScore}/100`}
          subtitle={HEALTH_LABELS[s.healthStatus]}
          icon={ShieldCheck}
          color={s.healthStatus === 'GOOD' ? 'green' : s.healthStatus === 'ATTENTION' ? 'amber' : 'red'}
          tooltip="Pontuação 0–100: conversão do período e cumprimento de SLA. Boa ≥70, Atenção 40–69, Crítica &lt;40."
        />
        <KpiCard
          title="Leads totais"
          value={s.totalLeads.toLocaleString('pt-BR')}
          change={s.totalLeadsChange}
          changeLabel="vs período anterior"
          icon={Users}
          color="blue"
          onClick={() => navigateCrm(CRM_DRILL_DOWN.allLeads(drillOwner))}
        />
        <KpiCard
          title="Honorários contratados"
          value={formatCurrency(s.totalRevenue)}
          change={s.totalRevenueChange}
          changeLabel="vs período anterior"
          icon={DollarSign}
          color="green"
          tooltip="Primeira mensalidade e serviços pontuais contratados. Não é receita recorrente."
        />
        <KpiCard
          title="Conversão geral"
          value={`${s.conversionRate.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%`}
          change={s.conversionRateChange}
          changeLabel="p.p. vs período anterior"
          icon={TrendingUp}
          color="teal"
        />
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <button
          type="button"
          onClick={() => s.openOpportunities > 0 && navigateCrm(CRM_DRILL_DOWN.openOpportunities(drillOwner))}
          disabled={s.openOpportunities === 0}
          className="font-semibold text-slate-700 hover:text-slate-900 underline-offset-2 hover:underline disabled:opacity-50 disabled:no-underline focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30 rounded"
        >
          Em aberto: {s.openOpportunities.toLocaleString('pt-BR')} oportunidades
        </button>
        <span className="text-gray-300" aria-hidden>·</span>
        <button
          type="button"
          onClick={() => navigate(AppPath.INDICADORES_CONTABILIDADE)}
          className="font-semibold text-emerald-700 hover:text-emerald-900 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-500/30 rounded"
        >
          Contabilidade: {(acc.conversionRate ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}% conversão
        </button>
        {operationShare.filter(item => item.pipeId !== 'demo-accounting').map(item => <React.Fragment key={item.pipeId}>
          <span className="text-gray-300" aria-hidden>·</span>
          <button type="button" className="font-semibold text-blue-800 hover:underline focus-visible:ring-2 rounded"
            onClick={() => navigateCrm(`/crm?pipeId=${item.pipeId}${drillOwner ? `&ownerUserId=${drillOwner}` : ''}`)}>
            {item.operation}: {item.leads} processos
          </button>
        </React.Fragment> )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div
          role="tablist"
          aria-label="Gráficos executivos"
          className="flex flex-wrap gap-1 border-b border-gray-100 bg-gray-50/80 px-3 py-2"
        >
          {chartTabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={chartTab === key}
              aria-controls={`general-chart-${key}`}
              id={`general-chart-tab-${key}`}
              tabIndex={chartTab === key ? 0 : -1}
              onClick={() => setChartTab(key)}
              onKeyDown={(e) => handleChartTabKeyDown(e, key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue/40 ${
                chartTab === key
                  ? 'bg-white text-salesforce-blue shadow-sm border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {chartTab === 'evolucao' ? (
        <div
          role="tabpanel"
          id="general-chart-evolucao"
          aria-labelledby="general-chart-tab-evolucao"
          className="p-5"
        >
        <div className="mb-4 flex flex-col gap-1">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-500" aria-hidden />
            Evolução executiva
          </h3>
          <p className="text-sm text-gray-500">
            Processos por esteira com leitura simultânea da conversão geral no mesmo período.
          </p>
        </div>

        {!hasEvolutionData ? (
          <ChartEmptyState
            title="Sem histórico para exibir"
            description="Não houve movimentação suficiente no período selecionado para montar a série temporal."
          />
        ) : (
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={evolution} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={CHART_AXIS_TICK} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={CHART_AXIS_TICK} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={CHART_AXIS_TICK}
                  tickFormatter={(value) => `${value}%`}
                />
                <RechartsTooltip
                  content={
                    <ChartBarTooltip
                      labelTitle="Período"
                      formatValue={(value, name) => (name.includes('Conversão') ? `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : value.toLocaleString('pt-BR'))}
                    />
                  }
                />
                <Legend />
                <Bar yAxisId="left" dataKey="accountingLeads" name="Leads contábeis" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="openingLeads" name="Abertura de Empresas" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="onboardingLeads" name="Onboarding Contábil" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="conversionRate"
                  name="Conversão geral"
                  stroke={CHART_COLORS.statusWarning}
                  strokeWidth={3}
                  dot={{ r: 3, fill: CHART_COLORS.statusWarning }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        </div>
        ) : null}

        {chartTab === 'receita' ? (
        <div
          role="tabpanel"
          id="general-chart-receita"
          aria-labelledby="general-chart-tab-receita"
          className="p-5"
        >
          <div className="mb-4 flex flex-col gap-1">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-500" aria-hidden />
              Honorários e alertas no tempo
            </h3>
            <p className="text-sm text-gray-500">
              Honorários contratados e volume de SLAs vencidos. Serviços pontuais não são receita recorrente.
            </p>
          </div>

          {!hasEvolutionData ? (
            <ChartEmptyState
              title="Sem dados comparativos no período"
              description="Quando houver receita ou alertas distribuídos no tempo, o gráfico aparecerá aqui."
            />
          ) : (
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={evolution} margin={{ top: 16, right: 12, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={CHART_AXIS_TICK} />
                  <YAxis
                    yAxisId="money"
                    axisLine={false}
                    tickLine={false}
                    tick={CHART_AXIS_TICK}
                    tickFormatter={(value) => formatCompactCurrency(value)}
                  />
                  <YAxis
                    yAxisId="alerts"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={CHART_AXIS_TICK}
                  />
                  <RechartsTooltip
                    content={
                      <ChartBarTooltip
                        labelTitle="Período"
                        formatValue={(value, name) => ((name.includes('Receita') || name.includes('Honorários')) ? formatValueCurrency(value, name) : value.toLocaleString('pt-BR'))}
                      />
                    }
                  />
                  <Legend />
                  <Bar yAxisId="money" dataKey="totalRevenue" name="Honorários contratados" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Line
                    yAxisId="alerts"
                    type="monotone"
                    dataKey="criticalAlerts"
                    name="Alertas críticos"
                    stroke={CHART_COLORS.statusError}
                    strokeWidth={3}
                    dot={{ r: 3, fill: CHART_COLORS.statusError }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        ) : null}

        {chartTab === 'participacao' ? (
        <div
          role="tabpanel"
          id="general-chart-participacao"
          aria-labelledby="general-chart-tab-participacao"
          className="p-5"
        >
          <div className="mb-4 flex flex-col gap-1">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <PieChartIcon size={16} className="text-blue-500" aria-hidden />
              Participação por operação
            </h3>
            <p className="text-sm text-gray-500">
              Distribuição dos leads do período entre as duas frentes da operação.
            </p>
          </div>

          {!hasOperationShareData ? (
            <ChartEmptyState
              title="Sem composição disponível"
              description="A participação por operação será exibida assim que houver leads no período filtrado."
            />
          ) : (
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={operationShare}
                    dataKey="leads"
                    nameKey="operation"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={3}
                  >
                    {operationShare.map((entry) => (
                      <Cell key={entry.operation} fill={PIE_COLORS[entry.operation] ?? CHART_PIE_FALLBACK} />
                    ))}
                  </Pie>
                  <Legend />
                  <RechartsTooltip content={<ChartPieTooltip valueLabel="Leads" />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        ) : null}

        {chartTab === 'comparativo' ? (
        <div
          role="tabpanel"
          id="general-chart-comparativo"
          aria-labelledby="general-chart-tab-comparativo"
          className="p-5"
        >
        <div className="mb-4 flex flex-col gap-1">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Users size={16} className="text-blue-500" aria-hidden />
            Comparativo entre operações
          </h3>
          <p className="text-sm text-gray-500">
            Processos, honorários, conversão e alertas lado a lado para leitura executiva rápida.
          </p>
        </div>

        {!hasOperationShareData ? (
          <ChartEmptyState
            title="Sem comparativo para mostrar"
            description="A comparação entre as esteiras contábeis depende de dados no período selecionado."
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={operationComparison} layout="vertical" margin={{ top: 8, right: 24, left: 16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={CHART_AXIS_TICK} />
                  <YAxis
                    dataKey="operation"
                    type="category"
                    width={110}
                    axisLine={false}
                    tickLine={false}
                    tick={{ ...CHART_AXIS_TICK, fontWeight: 600 }}
                  />
                  <RechartsTooltip
                    content={
                      <ChartBarTooltip
                        labelTitle="Operação"
                        formatValue={(value, name) => ((name.includes('Receita') || name.includes('Honorários')) ? formatValueCurrency(value, name) : value.toLocaleString('pt-BR'))}
                      />
                    }
                  />
                  <Legend />
                  <Bar dataKey="leads" name="Leads" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="revenue" name="Receita" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {operationComparison.map((item) => (
                <OperationInsightCard key={item.operation} item={item} />
              ))}
            </div>
          </div>
        )}
        </div>
        ) : null}
      </div>
    </div>
  );
};

const OperationInsightCard: React.FC<{
  item: {
    operation: string;
    leads: number;
    revenue: number;
    alertsCount: number;
    conversionRate: number;
  };
}> = ({ item }) => {
  const isAccounting = item.operation === 'Contabilidade';
  const accent = isAccounting ? 'border-emerald-100 bg-emerald-50/60' : 'border-blue-100 bg-blue-50/60';
  const dot = isAccounting ? 'bg-emerald-500' : 'bg-blue-500';

  return (
    <div className={`rounded-xl border p-4 ${accent}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        <p className="text-sm font-bold text-gray-800">{item.operation}</p>
      </div>
      <div className="space-y-2 text-sm">
        <InsightRow label="Leads" value={item.leads.toLocaleString('pt-BR')} />
        <InsightRow label="Receita" value={formatCurrency(item.revenue)} />
        <InsightRow
          label="Conversão"
          value={`${item.conversionRate.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%`}
        />
        <InsightRow label="Alertas" value={item.alertsCount.toLocaleString('pt-BR')} danger={item.alertsCount > 0} />
      </div>
    </div>
  );
};

const InsightRow: React.FC<{
  label: string;
  value: string;
  danger?: boolean;
}> = ({ label, value, danger }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-gray-500">{label}</span>
    <span className={`font-bold tabular-nums ${danger ? 'text-red-600' : 'text-gray-900'}`}>{value}</span>
  </div>
);

const ChartEmptyState: React.FC<{
  title: string;
  description: string;
}> = ({ title, description }) => (
  <div className="h-[260px] flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/70">
    <EmptyState compact icon={BarChart3} title={title} description={description} />
  </div>
);

function formatCompactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(value) >= 1_000) return `R$ ${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  return `R$ ${value.toLocaleString('pt-BR')}`;
}
