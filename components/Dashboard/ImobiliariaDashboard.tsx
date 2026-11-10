import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartBarTooltip } from '../ui/ChartTooltips';
import { Handshake, TrendingUp, DollarSign, Users, LayoutDashboard } from 'lucide-react';
import { useUserStore } from '../../modules/Login/store/useUserStore';
import { api } from '../../lib/axios';
import { formatCurrency, getDateRangeForFilter, formatDate } from '../../utils/formatters';
import { KpiCard } from '../../modules/Indicadores/components/KpiCard';
import { DashboardHelpPanel } from '../../modules/Indicadores/components/DashboardHelpPanel';
import { DashboardFilterSummary, type DashboardFilterChip } from '../../modules/Indicadores/components/DashboardFilterSummary';
import { EmptyState } from '../ui/EmptyState';
import { DateFilterBar, type FilterPeriod } from '../DateFilterBar';
import { CHART_AXIS_TICK, CHART_GRID_STROKE_LIGHT } from '../../lib/chartTheme';
import { CRM_DRILL_DOWN } from '../../lib/crmNavigation';
import { LeadStatus } from '../../types';

interface PerformancePoint {
  month: string;
  monthLabel?: string;
  deals: number;
  revenue: number;
}

interface PartnerSummary {
  totalClients: number;
  totalDeals: number;
  totalRevenue: number;
  commissionRate: number;
  estimatedCommission: number;
}

const PERIOD_LABEL: Partial<Record<FilterPeriod, string>> = {
  today: 'Hoje',
  week: 'Última semana',
  month: 'Mês atual',
  '60days': 'Últimos 60 dias',
  all: 'Histórico completo',
};

function chartMonthLabel(row: PerformancePoint): string {
  return row.monthLabel ?? row.month;
}

export const ImobiliariaDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [performanceData, setPerformanceData] = useState<PerformancePoint[]>([]);
  const [summary, setSummary] = useState<PartnerSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [dateFilter, setDateFilter] = useState<FilterPeriod>('all');

  const partnerId = user?.partnerId;
  const dateRange = useMemo(() => getDateRangeForFilter(dateFilter), [dateFilter]);

  const fetchData = useCallback(async () => {
    if (!partnerId) return;
    setIsLoading(true);
    setLoadError(false);
    try {
      const params: Record<string, string> = {};
      if (dateRange.dateFrom) params.dateFrom = dateRange.dateFrom;
      if (dateRange.dateTo) params.dateTo = dateRange.dateTo;
      const q = new URLSearchParams(params).toString();
      const suffix = q ? `?${q}` : '';
      const [perfRes, summaryRes] = await Promise.all([
        api.get<PerformancePoint[]>(`/partners/${partnerId}/performance${suffix}`),
        api.get<PartnerSummary>(`/partners/${partnerId}/summary${suffix}`),
      ]);
      setPerformanceData(perfRes.data);
      setSummary(summaryRes.data);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [partnerId, dateRange.dateFrom, dateRange.dateTo]);

  useEffect(() => {
    if (!partnerId) {
      setIsLoading(false);
      return;
    }
    void fetchData();
  }, [partnerId, fetchData]);

  const periodLabel = PERIOD_LABEL[dateFilter] ?? 'Período selecionado';

  const filterChips = useMemo((): DashboardFilterChip[] => {
    if (dateFilter === 'all') return [];
    return [
      {
        id: 'period',
        label:
          dateRange.dateFrom && dateRange.dateTo
            ? `${periodLabel} · ${formatDate(dateRange.dateFrom)} – ${formatDate(dateRange.dateTo)}`
            : periodLabel,
        onRemove: () => setDateFilter('all'),
      },
    ];
  }, [dateFilter, dateRange.dateFrom, dateRange.dateTo, periodLabel]);

  const chartData = useMemo(
    () =>
      performanceData.map((row) => ({
        ...row,
        chartLabel: chartMonthLabel(row),
      })),
    [performanceData],
  );

  const periodTotals = useMemo(() => {
    const deals = summary?.totalDeals ?? 0;
    const revenue = summary?.totalRevenue ?? 0;
    const estimatedCommission =
      summary?.estimatedCommission ?? revenue * (summary?.commissionRate ?? 0.05);
    return { deals, revenue, estimatedCommission };
  }, [summary]);

  if (!partnerId) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title="Parceiro não vinculado"
        description="Entre em contato com o administrador para vincular sua conta à imobiliária."
      />
    );
  }

  if (isLoading && !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-xl border border-gray-200" />
        ))}
        <div className="md:col-span-3 h-80 bg-gray-100 rounded-xl border border-gray-200" />
      </div>
    );
  }

  if (loadError) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title="Não foi possível carregar seus indicadores"
        description="Verifique sua conexão e tente novamente."
        action={
          <button
            type="button"
            onClick={() => void fetchData()}
            className="px-4 py-2 text-sm font-semibold text-white bg-salesforce-blue rounded-lg hover:bg-salesforce-hover transition-colors"
          >
            Tentar novamente
          </button>
        }
      />
    );
  }

  const totalClients = summary?.totalClients ?? 0;
  const openPartnerCrm = (status?: LeadStatus) => {
    navigate(CRM_DRILL_DOWN.byPartner(partnerId, status));
  };

  return (
    <div className="space-y-6 animate-fade-in" aria-busy={isLoading}>
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Olá, <span className="font-semibold text-gray-900">{user?.name}</span>
          {' · '}Resultados das suas indicações.
        </p>
        <DateFilterBar period={dateFilter} onFilterChange={setDateFilter} />
        <p className="text-xs text-gray-500">
          <span className="font-semibold text-gray-600">{periodLabel}</span>
          {dateRange.dateFrom && dateRange.dateTo
            ? ` · ${formatDate(dateRange.dateFrom)} a ${formatDate(dateRange.dateTo)}`
            : null}
          {' · '}Gráfico e totais de contratos/receita refletem o período filtrado na API.
        </p>
      </div>

      <DashboardFilterSummary chips={filterChips} onClearAll={filterChips.length ? () => setDateFilter('all') : undefined} />

      <DashboardHelpPanel title="Como ler seu painel de parceiro">
        <p>
          KPIs de indicações e comissão estimada respeitam o filtro de datas. Clientes e contratos
          clicáveis abrem o CRM filtrado pelo seu parceiro. &quot;Clientes indicados&quot; é o total
          histórico convertido, independente do período.
        </p>
      </DashboardHelpPanel>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Comissão estimada"
          value={formatCurrency(periodTotals.estimatedCommission)}
          subtitle="Projeção no período selecionado"
          icon={DollarSign}
          color="green"
          tooltip="Estimativa com base na taxa de comissão vigente"
        />
        <KpiCard
          title="Clientes indicados"
          value={totalClients.toLocaleString('pt-BR')}
          subtitle="Total histórico convertido"
          icon={Users}
          color="blue"
          tooltip="Clique para ver no CRM"
          onClick={() => openPartnerCrm(LeadStatus.CLIENTE)}
        />
        <KpiCard
          title="Contratos fechados"
          value={periodTotals.deals.toLocaleString('pt-BR')}
          subtitle="No período selecionado"
          icon={Handshake}
          color="teal"
          tooltip="Clique para ver indicações no CRM"
          onClick={() => openPartnerCrm()}
        />
        <KpiCard
          title="Volume de vendas"
          value={formatCurrency(periodTotals.revenue)}
          subtitle="Receita no período selecionado"
          icon={TrendingUp}
          color="slate"
        />
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-800">Desempenho mensal</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Histórico de indicações convertidas e receita gerada.
          </p>
        </div>
        {chartData.length === 0 ? (
          <div className="h-80 flex items-center justify-center border border-dashed border-gray-200 rounded-lg bg-gray-50">
            <p className="text-sm text-gray-500">Sem dados de desempenho no período</p>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE_LIGHT} />
                <XAxis dataKey="chartLabel" axisLine={false} tickLine={false} tick={CHART_AXIS_TICK} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={CHART_AXIS_TICK} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={CHART_AXIS_TICK}
                  tickFormatter={(val) => `R$ ${val / 1000}k`}
                />
                <RechartsTooltip
                  content={
                    <ChartBarTooltip
                      labelTitle="Mês"
                      formatValue={(val, name) => (name === 'Receita' ? formatCurrency(val) : String(val))}
                    />
                  }
                />
                <Bar yAxisId="left" dataKey="deals" name="Contratos" fill="#0176d3" radius={[4, 4, 0, 0]} barSize={32} />
                <Bar yAxisId="right" dataKey="revenue" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
