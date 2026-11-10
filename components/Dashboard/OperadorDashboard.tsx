import React, { useEffect, useMemo, useState } from 'react';
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
import {
  Users,
  Clock,
  CheckCircle2,
  Target,
  ArrowRight,
  Kanban,
  UserPlus,
  TrendingUp,
  LayoutDashboard,
} from 'lucide-react';
import { useCRMStore } from '../../modules/CRM/store';
import { useUserStore } from '../../modules/Login/store/useUserStore';
import { LeadStatus } from '../../types';
import { formatCurrency, formatDate, getDateRangeForFilter } from '../../utils/formatters';
import { AppPath, getLeadDetailPath } from '../../routes';
import { CRM_DRILL_DOWN } from '../../lib/crmNavigation';
import { DateFilterBar, type FilterPeriod, type DateFilterOptions } from '../DateFilterBar';
import { EmptyState } from '../ui/EmptyState';
import { KpiCard } from '../../modules/Indicadores/components/KpiCard';
import { DashboardHelpPanel } from '../../modules/Indicadores/components/DashboardHelpPanel';
import { DashboardFilterSummary, type DashboardFilterChip } from '../../modules/Indicadores/components/DashboardFilterSummary';
import { CHART_AXIS_TICK, CHART_CURSOR_FILL, CHART_GRID_STROKE_LIGHT } from '../../lib/chartTheme';

const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  [LeadStatus.LEAD]: 'Lead',
  [LeadStatus.OPORTUNIDADE]: 'Oportunidade',
  [LeadStatus.CLIENTE]: 'Cliente',
  [LeadStatus.PERDIDO]: 'Perdido',
};

export const OperadorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { leadsDashboard, leadsDashboardLoading, fetchLeadsDashboard } = useCRMStore();
  const { user } = useUserStore();
  const [dateFilter, setDateFilter] = useState<FilterPeriod>('60days');

  const dateRange = useMemo(() => getDateRangeForFilter(dateFilter), [dateFilter]);

  const filterChips = useMemo((): DashboardFilterChip[] => {
    if (dateFilter === '60days') return [];
    return [
      {
        id: 'period',
        label:
          dateRange.dateFrom && dateRange.dateTo
            ? `${formatDate(dateRange.dateFrom)} – ${formatDate(dateRange.dateTo)}`
            : 'Todo o período',
        onRemove: () => setDateFilter('60days'),
      },
    ];
  }, [dateFilter, dateRange.dateFrom, dateRange.dateTo]);

  useEffect(() => {
    fetchLeadsDashboard({
      view: 'operator',
      dateFrom: dateRange.dateFrom,
      dateTo: dateRange.dateTo,
    });
  }, [fetchLeadsDashboard, dateRange.dateFrom, dateRange.dateTo]);

  const handleFilterChange = (period: FilterPeriod, _options?: DateFilterOptions) => {
    setDateFilter(period);
  };

  const stats = leadsDashboard;
  const loading = leadsDashboardLoading;
  const loadError = !loading && !stats;

  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-xl border border-gray-200" />
        ))}
        <div className="md:col-span-2 h-96 bg-gray-100 rounded-xl border border-gray-200" />
        <div className="h-96 bg-gray-100 rounded-xl border border-gray-200" />
      </div>
    );
  }

  if (loadError || stats?.view !== 'operator') {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title="Não foi possível carregar seus indicadores"
        description="Os números refletem apenas os leads atribuídos a você, com o mesmo critério do CRM."
        action={
          <button
            type="button"
            onClick={() =>
              fetchLeadsDashboard({
                view: 'operator',
                dateFrom: dateRange.dateFrom,
                dateTo: dateRange.dateTo,
              })
            }
            className="px-4 py-2 text-sm font-semibold text-white bg-salesforce-blue rounded-lg hover:bg-salesforce-hover transition-colors"
          >
            Tentar novamente
          </button>
        }
      />
    );
  }

  const kpis = stats.kpis;
  const active = kpis.activeLeads ?? 0;
  const converted = kpis.clientsCount;
  const potentialValue = kpis.pipelineValue ?? 0;
  const conversionRate = kpis.conversionRatePercent;
  const funnelData = stats.funnelByStage ?? [];
  const recentLeads = stats.recentLeads ?? [];
  const ownerId = user?.id;

  return (
    <div className="space-y-6 animate-fade-in" aria-busy={loading}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-gray-600">
            Olá, <span className="font-semibold text-gray-900">{user?.name}</span>
          </p>
          <p className="text-xs text-gray-500">
            {stats.period.dateFrom && stats.period.dateTo ? (
              <>
                Período: {formatDate(stats.period.dateFrom)} – {formatDate(stats.period.dateTo)}
              </>
            ) : (
              <>Todos os seus leads (sem filtro de data)</>
            )}
            {' · '}Apenas leads em que você é o responsável
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(AppPath.CRM, { state: { openCreateLead: true } })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-salesforce-blue text-white rounded-lg text-sm font-semibold hover:bg-salesforce-hover transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-salesforce-blue focus:ring-offset-2"
        >
          <UserPlus size={16} aria-hidden />
          Novo Lead
        </button>
      </div>

      <DateFilterBar period={dateFilter} onFilterChange={handleFilterChange} />

      <DashboardFilterSummary chips={filterChips} onClearAll={filterChips.length ? () => setDateFilter('60days') : undefined} />

      <DashboardHelpPanel title="Como ler seu painel">
        <p>
          Métricas limitadas aos leads em que você é responsável. KPIs clicáveis abrem o CRM já filtrado
          por sua carteira. A taxa de sucesso considera clientes convertidos sobre o total de leads no
          período selecionado.
        </p>
      </DashboardHelpPanel>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Leads ativos"
          value={active.toLocaleString('pt-BR')}
          subtitle="Lead + Oportunidade"
          icon={Users}
          color="blue"
          tooltip="Seus leads em pipeline no CRM"
          onClick={ownerId ? () => navigate(CRM_DRILL_DOWN.allLeads(ownerId)) : undefined}
        />
        <KpiCard
          title="Conversões"
          value={converted.toLocaleString('pt-BR')}
          icon={CheckCircle2}
          color="green"
          tooltip="Leads convertidos em clientes"
          onClick={ownerId ? () => navigate(CRM_DRILL_DOWN.clients(ownerId)) : undefined}
        />
        <KpiCard
          title="Valor em pipeline"
          value={formatCurrency(potentialValue)}
          icon={TrendingUp}
          color="teal"
          tooltip="Soma estimada das oportunidades em aberto"
          onClick={ownerId ? () => navigate(CRM_DRILL_DOWN.openOpportunities(ownerId)) : undefined}
        />
        <KpiCard
          title="Taxa de sucesso"
          value={`${conversionRate}%`}
          subtitle="Clientes ÷ total de leads no período"
          icon={Target}
          color="amber"
          tooltip="Ver clientes convertidos no CRM"
          onClick={ownerId && converted > 0 ? () => navigate(CRM_DRILL_DOWN.clients(ownerId)) : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
            <Kanban size={20} className="mr-2 text-salesforce-blue" aria-hidden />
            Distribuição do funil ativo
          </h3>
          <p className="text-sm text-gray-500 mt-0.5 mb-4">
            Clique em uma etapa para abrir o CRM filtrado.
          </p>
          {funnelData.length === 0 ? (
            <div className="h-80 flex items-center justify-center border border-dashed border-gray-200 rounded-lg bg-gray-50">
              <p className="text-sm text-gray-500">Sem leads em pipeline neste período</p>
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={funnelData}
                  layout="vertical"
                  onClick={(state) => {
                    const label = state?.activeLabel;
                    if (label && ownerId) {
                      navigate(CRM_DRILL_DOWN.byStage(String(label), ownerId));
                    }
                  }}
                  style={{ cursor: ownerId ? 'pointer' : 'default' }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={CHART_GRID_STROKE_LIGHT} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={150}
                    axisLine={false}
                    tickLine={false}
                    tick={CHART_AXIS_TICK}
                  />
                  <RechartsTooltip content={<ChartBarTooltip labelTitle="Etapa" />} cursor={{ fill: CHART_CURSOR_FILL }} />
                  <Bar dataKey="value" name="Leads" fill="#0176d3" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {ownerId && funnelData.length > 0 ? (
            <ul className="flex flex-wrap gap-2 mt-3" aria-label="Etapas do funil — abrir no CRM">
              {funnelData.map((row) => (
                <li key={row.name}>
                  <button
                    type="button"
                    onClick={() => navigate(CRM_DRILL_DOWN.byStage(row.name, ownerId))}
                    className="group rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold hover:bg-blue-50 hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30"
                  >
                    <span className="text-slate-800 group-hover:text-blue-950">
                      {row.name} ({row.value})
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
            <Clock size={20} className="mr-2 text-salesforce-blue" aria-hidden />
            Leads recentes
          </h3>
          {recentLeads.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum lead no período</p>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => lead.id && navigate(getLeadDetailPath(lead.id))}
                  className="w-full flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-salesforce-blue/30 hover:bg-white cursor-pointer transition-colors group text-left focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30"
                >
                  <span
                    className={`mt-1 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      lead.status === LeadStatus.CLIENTE
                        ? 'bg-emerald-50 text-emerald-700'
                        : lead.status === LeadStatus.OPORTUNIDADE
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {LEAD_STATUS_LABEL[lead.status] ?? lead.status}
                  </span>
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-salesforce-blue">{lead.name}</p>
                    <p className="text-xs text-gray-500 truncate">{lead.stage}</p>
                  </div>
                  <ArrowRight size={14} className="shrink-0 text-gray-400 group-hover:translate-x-0.5 transition-transform" aria-hidden />
                </button>
              ))}
              <button
                type="button"
                className="w-full mt-2 flex items-center justify-center gap-2 py-2 text-sm font-bold text-salesforce-blue hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30"
                onClick={() => navigate(AppPath.CRM)}
              >
                Acessar CRM completo
                <ArrowRight size={16} aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
