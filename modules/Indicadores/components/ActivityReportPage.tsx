import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Clock3,
  TrendingUp,
  Users,
  FileText,
  CheckCircle,
  DollarSign,
  UserRoundSearch,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { api } from '../../../lib/axios';
import { canViewCommissionData } from '../../../lib/commissionVisibility';
import { useUserStore } from '../../Login/store/useUserStore';
import { KpiCard } from './KpiCard';
import { EmptyState } from '../../../components/ui/EmptyState';
import { DashboardHelpPanel } from './DashboardHelpPanel';
import { DashboardFilterSummary, type DashboardFilterChip } from './DashboardFilterSummary';
import { formatDate } from '../../../utils/formatters';
import { CRM_DRILL_DOWN } from '../../../lib/crmNavigation';

interface ActivityReportDaily {
  date: string;
  systemSeconds: number;
  externalSeconds: number;
  totalSeconds: number;
}

interface CommercialMetrics {
  leadsCreated: number;
  leadsAttended: number;
  proposalsSent: number;
  proposalsAccepted: number;
  valueClosed: number;
  conversionRate: number;
  /** Presente apenas para perfil administrador. */
  avgCommission?: number;
}

interface ActivityReportResponse {
  period: {
    from: string | null;
    to: string | null;
    ownerUserId: string;
  };
  totals: {
    systemSeconds: number;
    externalSeconds: number;
    totalSeconds: number;
    idleSeconds: number;
  };
  commercial: CommercialMetrics;
  daily: ActivityReportDaily[];
}

interface InactivityBucket<T> {
  minimumHours: number;
  count: number;
  items: T[];
}

interface InactivityLeadItem {
  id: string;
  name: string;
}

interface InactivityProposalItem {
  id: string;
  leadName: string;
}

interface InactivityBuckets<T> {
  h24: InactivityBucket<T>;
  h48: InactivityBucket<T>;
  h72: InactivityBucket<T>;
}

interface InactivityReportResponse {
  generatedAt: string;
  thresholdsHours: number[];
  leads: {
    totalActiveLeads: number;
    buckets: InactivityBuckets<InactivityLeadItem>;
  };
  proposals: {
    totalOpenProposals: number;
    buckets: InactivityBuckets<InactivityProposalItem>;
  };
}

interface ProposalRow {
  id: string;
  status: string;
  channel: string;
  sentAt: string | null;
  valueOffered: number;
  valueClosed: number | null;
  acceptedAt: string | null;
  lostReason: string | null;
  lead: { id: string; name: string; company: string | null; stage?: string | null } | null;
  campaign: { id: string; name: string } | null;
  responsible?: { id: string; name: string } | null;
}

interface ActivityReportPageProps {
  canAuditOthers: boolean;
  standalone?: boolean;
}

type ProposalOutcomeFilter = '' | 'sent' | 'accepted' | 'rejected';

function toMonthRange(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex, 0, 23, 59, 59, 999));
  return { from: start.toISOString(), to: end.toISOString() };
}

function formatSeconds(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

function formatDay(dateIso: string) {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: 'Rascunho',
    sent: 'Enviada',
    accepted: 'Aceita',
    rejected: 'Perdida',
    expired: 'Expirada',
  };
  return map[status] ?? status;
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    expired: 'bg-yellow-100 text-yellow-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

function KpiCardSkeleton() {
  return <div className="h-28 rounded-xl border border-gray-200 bg-gray-100 animate-pulse" aria-hidden />;
}

export const ActivityReportPage: React.FC<ActivityReportPageProps> = ({
  canAuditOthers,
  standalone = false,
}) => {
  const navigate = useNavigate();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [periodMode, setPeriodMode] = useState<'month' | 'range'>('month');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [proposalStatusFilter, setProposalStatusFilter] = useState<ProposalOutcomeFilter>('');
  const [stageFilter, setStageFilter] = useState('');
  const { user, usersList, fetchUsers } = useUserStore();
  const showCommission = canViewCommissionData(user ?? undefined);
  const [selectedOwnerUserId, setSelectedOwnerUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [report, setReport] = useState<ActivityReportResponse | null>(null);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [leadRows, setLeadRows] = useState<
    { id: string; name: string; stage: string; status: string; owner?: { name: string } }[]
  >([]);
  const [inactivityReport, setInactivityReport] = useState<InactivityReportResponse | null>(null);
  const [stageOptions, setStageOptions] = useState<string[]>([]);

  useEffect(() => {
    void api
      .get<string[]>('/leads/stage-options')
      .then((res) => setStageOptions(res.data ?? []))
      .catch(() => setStageOptions([]));
  }, []);

  useEffect(() => {
    if (!canAuditOthers) return;
    void fetchUsers({ page: 1, limit: 200 });
  }, [canAuditOthers, fetchUsers]);

  const fetchReport = useCallback(async () => {
    if (periodMode === 'range') {
      if (!dateFrom || !dateTo) {
        return;
      }
      if (dateFrom > dateTo) {
        toast.error('A data inicial deve ser anterior ou igual à data final.');
        return;
      }
    }
    setIsLoading(true);
    setFetchError(false);
    const range = periodMode === 'range' && dateFrom && dateTo
      ? { from: new Date(`${dateFrom}T00:00:00`).toISOString(), to: new Date(`${dateTo}T23:59:59`).toISOString() }
      : toMonthRange(selectedMonth);
    try {
      const [activityRes, proposalRes, inactivityRes, leadsRes] = await Promise.all([
        api.get<ActivityReportResponse>('/activity/report', {
          params: {
            from: range.from,
            to: range.to,
            ownerUserId: selectedOwnerUserId || undefined,
          },
        }),
        api.get<ProposalRow[]>('/proposals/report', {
          params: {
            from: range.from,
            to: range.to,
            ownerId: selectedOwnerUserId || undefined,
            status: proposalStatusFilter || undefined,
          },
        }),
        api.get<InactivityReportResponse>('/leads/inactivity-report', {
          params: {
            ownerUserId: selectedOwnerUserId || undefined,
          },
        }),
        api.get<{ data: { id: string; name: string; stage: string; status: string; owner?: { name: string } }[] }>(
          '/leads',
          {
            params: {
              page: 1,
              limit: 500,
              ownerUserId: selectedOwnerUserId || undefined,
              stage: stageFilter || undefined,
            },
          },
        ),
      ]);
      setReport(activityRes.data);
      setProposals(proposalRes.data);
      setInactivityReport(inactivityRes.data);
      setLeadRows(leadsRes.data.data ?? []);
    } catch (error) {
      console.error('Erro ao carregar relatório comercial', error);
      toast.error('Não foi possível carregar o relatório comercial.');
      setFetchError(true);
      setReport(null);
      setProposals([]);
      setInactivityReport(null);
      setLeadRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedOwnerUserId, dateFrom, dateTo, proposalStatusFilter, stageFilter, periodMode]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const chartData = useMemo(() => (report?.daily ?? []).slice(-10), [report?.daily]);

  const commercial = report?.commercial;
  const crmOwnerId = selectedOwnerUserId || undefined;

  const filterChips = useMemo((): DashboardFilterChip[] => {
    const chips: DashboardFilterChip[] = [];
    if (periodMode === 'month' && selectedMonth !== currentMonth) {
      chips.push({
        id: 'month',
        label: `Mês: ${selectedMonth}`,
        onRemove: () => setSelectedMonth(currentMonth),
      });
    }
    if (periodMode === 'range' && (dateFrom || dateTo)) {
      chips.push({
        id: 'range',
        label: dateFrom && dateTo ? `${formatDate(dateFrom)} – ${formatDate(dateTo)}` : 'Intervalo incompleto',
        onRemove: () => {
          setDateFrom('');
          setDateTo('');
          setPeriodMode('month');
        },
      });
    }
    if (proposalStatusFilter) {
      const labels: Record<string, string> = {
        sent: 'Propostas enviadas',
        accepted: 'Propostas aceitas',
        rejected: 'Propostas perdidas',
      };
      chips.push({
        id: 'proposal',
        label: labels[proposalStatusFilter] ?? proposalStatusFilter,
        onRemove: () => setProposalStatusFilter(''),
      });
    }
    if (stageFilter.trim()) {
      chips.push({
        id: 'stage',
        label: `Etapa: ${stageFilter.trim()}`,
        onRemove: () => setStageFilter(''),
      });
    }
    if (selectedOwnerUserId) {
      chips.push({
        id: 'owner',
        label: usersList.find((u) => u.id === selectedOwnerUserId)?.name ?? 'Consultor',
        onRemove: () => setSelectedOwnerUserId(''),
      });
    }
    return chips;
  }, [
    periodMode,
    selectedMonth,
    dateFrom,
    dateTo,
    proposalStatusFilter,
    stageFilter,
    selectedOwnerUserId,
    usersList,
  ]);

  const clearReportFilters = () => {
    setPeriodMode('month');
    setSelectedMonth(currentMonth);
    setDateFrom('');
    setDateTo('');
    setProposalStatusFilter('');
    setStageFilter('');
    setSelectedOwnerUserId('');
  };

  const openCrmForInactiveLeads = () => {
    navigate(CRM_DRILL_DOWN.allLeads(crmOwnerId));
  };

  const leadBucketByThreshold = useMemo(() => {
    const map = new Map<number, number>();
    const buckets = inactivityReport?.leads.buckets;
    if (!buckets) return map;
    map.set(24, buckets.h24.count);
    map.set(48, buckets.h48.count);
    map.set(72, buckets.h72.count);
    return map;
  }, [inactivityReport]);

  const proposalBucketByThreshold = useMemo(() => {
    const map = new Map<number, number>();
    const buckets = inactivityReport?.proposals.buckets;
    if (!buckets) return map;
    map.set(24, buckets.h24.count);
    map.set(48, buckets.h48.count);
    map.set(72, buckets.h72.count);
    return map;
  }, [inactivityReport]);

  const handleExport = useCallback(() => {
    if (!proposals.length && !leadRows.length && !report) {
      toast.error('Não há dados para exportar.');
      return;
    }

    const proposalHeaders = [
      'Lead',
      'Empresa',
      'Etapa',
      'Status',
      'Canal',
      'Valor Ofertado',
      'Valor Fechado',
      'Enviada em',
      'Aceita em',
      'Campanha',
      'Responsável',
    ];
    const proposalData = proposals.map((p) => [
      p.lead?.name ?? '-',
      p.lead?.company ?? '-',
      p.lead?.stage ?? '-',
      statusLabel(p.status),
      p.channel,
      p.valueOffered,
      p.valueClosed ?? '',
      p.sentAt ? new Date(p.sentAt).toLocaleDateString('pt-BR') : '-',
      p.acceptedAt ? new Date(p.acceptedAt).toLocaleDateString('pt-BR') : '-',
      p.campaign?.name ?? '-',
      p.responsible?.name ?? '-',
    ]);

    const leadHeaders = ['Lead', 'Etapa', 'Status', 'Responsável'];
    const leadData = leadRows.map((l) => [l.name, l.stage, l.status, l.owner?.name ?? '-']);

    const summaryHeaders = ['Métrica', 'Valor'];
    const commercialMetrics = report?.commercial;
    const summaryData = [
      ['Horas no sistema', formatSeconds(report?.totals.systemSeconds ?? 0)],
      ['Horas externas', formatSeconds(report?.totals.externalSeconds ?? 0)],
      ['Leads criados', commercialMetrics?.leadsCreated ?? 0],
      ['Propostas enviadas', commercialMetrics?.proposalsSent ?? 0],
      ['Propostas aceitas', commercialMetrics?.proposalsAccepted ?? 0],
      ['Receita fechada', commercialMetrics?.valueClosed ?? 0],
    ];

    const dailyHeaders = ['Data', 'Sistema', 'Externo', 'Total'];
    const dailyData = (report?.daily ?? []).map((d) => [
      formatDay(d.date),
      formatSeconds(d.systemSeconds),
      formatSeconds(d.externalSeconds),
      formatSeconds(d.totalSeconds),
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryData]), 'Resumo');
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([proposalHeaders, ...proposalData]),
      'Propostas',
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([leadHeaders, ...leadData]), 'Leads');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([dailyHeaders, ...dailyData]), 'Atividades dia');

    const suffix = dateFrom && dateTo ? `${dateFrom}_${dateTo}` : selectedMonth;
    XLSX.writeFile(wb, `relatorio-comercial-${suffix}.xlsx`);
    toast.success('Relatório exportado.');
  }, [proposals, leadRows, report, selectedMonth, dateFrom, dateTo]);

  return (
    <div className="space-y-4" aria-busy={isLoading}>
      {/* Header + filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 size={18} className="text-salesforce-blue" />
              Relatório Comercial
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Produtividade, leads, propostas e conversões por período e consultor.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <fieldset className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              <legend className="sr-only">Modo de período</legend>
              <button
                type="button"
                onClick={() => {
                  setPeriodMode('month');
                  setDateFrom('');
                  setDateTo('');
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  periodMode === 'month' ? 'bg-white text-salesforce-blue shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Por mês
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('range')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  periodMode === 'range' ? 'bg-white text-salesforce-blue shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Intervalo
              </button>
            </fieldset>
            {periodMode === 'month' ? (
              <div>
                <label htmlFor="activity-report-month" className="block text-xs font-semibold text-gray-600 mb-1">Mês</label>
                <input
                  id="activity-report-month"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                />
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="activity-report-from" className="block text-xs font-semibold text-gray-600 mb-1">De</label>
                  <input
                    id="activity-report-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="activity-report-to" className="block text-xs font-semibold text-gray-600 mb-1">Até</label>
                  <input
                    id="activity-report-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            <div>
              <label htmlFor="activity-report-proposal-status" className="block text-xs font-semibold text-gray-600 mb-1">Propostas</label>
            <select
              id="activity-report-proposal-status"
              value={proposalStatusFilter}
              onChange={(e) => setProposalStatusFilter(e.target.value as ProposalOutcomeFilter)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Todas propostas</option>
              <option value="sent">Em andamento (enviada)</option>
              <option value="accepted">Entregue (aceita)</option>
              <option value="rejected">Perdida (rejeitada)</option>
            </select>
            </div>
            <div>
              <label htmlFor="activity-report-stage" className="block text-xs font-semibold text-gray-600 mb-1">Etapa kanban</label>
            <select
              id="activity-report-stage"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm min-w-[180px]"
            >
              <option value="">Todas as etapas</option>
              {stageOptions.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
            </div>
            {canAuditOthers ? (
              <div className="relative">
                <UserRoundSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  className="rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm"
                  value={selectedOwnerUserId}
                  onChange={(e) => setSelectedOwnerUserId(e.target.value)}
                >
                  <option value="">Meu relatório</option>
                  {usersList.map((user) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              title="Exportar relatório em Excel"
            >
              <Download size={14} />
              Exportar Excel
            </button>
          </div>
        </div>
      </div>

      <DashboardFilterSummary chips={filterChips} onClearAll={filterChips.length ? clearReportFilters : undefined} />

      {periodMode === 'range' && (!dateFrom || !dateTo) ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2" role="status">
          Selecione as datas inicial e final para carregar o relatório no modo intervalo.
        </p>
      ) : null}

      <DashboardHelpPanel title="Como ler este relatório">
        <p>
          O scorecard principal mostra leads, conversões e receita do período. Horas e métricas
          complementares ficam nas seções expansíveis abaixo.
        </p>
        <p>
          Buckets de inatividade contam leads/propostas sem atuação há 24h, 48h ou 72h. Clique em um
          bucket de leads para abrir o CRM do consultor e priorizar follow-up.
        </p>
      </DashboardHelpPanel>

      {fetchError && !isLoading ? (
        <EmptyState
          icon={BarChart3}
          title="Não foi possível carregar o relatório"
          description="Verifique o período selecionado e tente novamente."
          action={
            <button
              type="button"
              onClick={() => void fetchReport()}
              className="px-4 py-2 text-sm font-semibold text-white bg-salesforce-blue rounded-lg hover:bg-salesforce-hover transition-colors"
            >
              Tentar novamente
            </button>
          }
        />
      ) : null}

      {/* Scorecard principal — 4 métricas comerciais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }, (_, i) => <KpiCardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              title="Leads criados"
              value={String(commercial?.leadsCreated ?? 0)}
              icon={Users}
              color="blue"
              tooltip="Leads abertos pelo consultor no período"
              onClick={commercial?.leadsCreated ? () => navigate(CRM_DRILL_DOWN.allLeads(crmOwnerId)) : undefined}
            />
            <KpiCard
              title="Propostas aceitas"
              value={String(commercial?.proposalsAccepted ?? 0)}
              icon={CheckCircle}
              color="green"
              tooltip="Propostas com status Aceita"
              onClick={commercial?.proposalsAccepted ? () => navigate(CRM_DRILL_DOWN.clients(crmOwnerId)) : undefined}
            />
            <KpiCard
              title="Receita fechada"
              value={formatCurrency(commercial?.valueClosed ?? 0)}
              icon={DollarSign}
              color="green"
              tooltip="Soma dos valores das propostas aceitas no período"
            />
            <KpiCard
              title="Taxa de conversão"
              value={formatPercent(commercial?.conversionRate ?? 0)}
              icon={TrendingUp}
              color="blue"
              tooltip="Propostas aceitas ÷ propostas enviadas"
            />
          </>
        )}
      </div>

      <details className="rounded-xl border border-gray-200 bg-white shadow-sm group">
        <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30 flex items-center gap-2">
          <Clock3 size={14} className="text-salesforce-blue" aria-hidden />
          Horas e produtividade (3 indicadores)
        </summary>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-5 pb-5 pt-1 border-t border-gray-100">
          {isLoading ? (
            Array.from({ length: 3 }, (_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard
                title="Horas no sistema"
                value={formatSeconds(report?.totals.systemSeconds ?? 0)}
                icon={Clock3}
                color="slate"
                tooltip="Tempo total com sessão ativa no sistema"
              />
              <KpiCard
                title="Horas externas"
                value={formatSeconds(report?.totals.externalSeconds ?? 0)}
                icon={Clock3}
                color="slate"
                tooltip="Compromissos externos concluídos (visitas, reuniões)"
              />
              <KpiCard
                title="Total trabalhado"
                value={formatSeconds(report?.totals.totalSeconds ?? 0)}
                icon={Clock3}
                color="blue"
                tooltip="Sistema + externo"
              />
            </>
          )}
        </div>
      </details>

      <details className="rounded-xl border border-gray-200 bg-white shadow-sm group">
        <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30 flex items-center gap-2">
          <BarChart3 size={14} className="text-salesforce-blue" aria-hidden />
          Métricas comerciais complementares
        </summary>
        <div className={`grid grid-cols-1 gap-4 px-5 pb-5 pt-1 border-t border-gray-100 ${showCommission ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {isLoading ? (
            Array.from({ length: showCommission ? 3 : 2 }, (_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard
                title="Leads atendidos"
                value={String(commercial?.leadsAttended ?? 0)}
                icon={Users}
                color="teal"
                tooltip="Leads com ao menos 1 compromisso concluído no período"
              />
              <KpiCard
                title="Propostas enviadas"
                value={String(commercial?.proposalsSent ?? 0)}
                icon={FileText}
                color="slate"
                tooltip="Propostas enviadas no período (status não-rascunho)"
              />
              {showCommission ? (
                <KpiCard
                  title="Comissão média"
                  value={formatCurrency(commercial?.avgCommission ?? 0)}
                  icon={DollarSign}
                  color="amber"
                  tooltip="Média de comissão calculada sobre propostas aceitas com campanha associada"
                />
              ) : null}
            </>
          )}
        </div>
      </details>

      <details className="rounded-xl border border-gray-200 bg-white shadow-sm group">
        <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30 flex items-center gap-2">
          <Clock3 size={14} className="text-salesforce-blue" aria-hidden />
          Inatividade de leads e propostas (24h / 48h / 72h)
        </summary>
        <div className="px-5 pb-5 pt-1 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-3">
          Clique em um bucket de leads para abrir o CRM e priorizar contato.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">Leads sem atuação</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[24, 48, 72].map((threshold) => {
                const count = leadBucketByThreshold.get(threshold) ?? 0;
                return (
                <button
                  key={`lead-${threshold}`}
                  type="button"
                  disabled={count === 0}
                  onClick={openCrmForInactiveLeads}
                  title={count > 0 ? `Abrir CRM — ${count} lead(s) inativo(s) há ${threshold}h+` : undefined}
                  className={`rounded-md p-2 border text-center transition-colors focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30 ${
                    count > 0
                      ? 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-200 cursor-pointer'
                      : 'bg-gray-50 border-gray-100 opacity-60 cursor-default'
                  }`}
                >
                  <p className="text-[11px] text-gray-500">{threshold}h+</p>
                  <p className="text-lg font-bold text-gray-900">{count}</p>
                </button>
              );})}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">Propostas sem atuação</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[24, 48, 72].map((threshold) => (
                <div key={`proposal-${threshold}`} className="rounded-md bg-gray-50 p-2 border border-gray-100">
                  <p className="text-[11px] text-gray-500">{threshold}h+</p>
                  <p className="text-lg font-bold text-gray-900">{proposalBucketByThreshold.get(threshold) ?? 0}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      </details>

      <details className="rounded-xl border border-gray-200 bg-white shadow-sm group">
        <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30 flex items-center gap-2">
          <Clock3 size={14} className="text-salesforce-blue" aria-hidden />
          Evolução diária — últimos 10 dias com apontamento
        </summary>
        <div className="px-5 pb-5 pt-1 border-t border-gray-100">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum registro no período selecionado.</p>
        ) : (
          <div className="space-y-2">
            {chartData.map((day) => {
              const percentExternal =
                day.totalSeconds > 0
                  ? Math.round((day.externalSeconds / day.totalSeconds) * 100)
                  : 0;
              return (
                <div key={day.date} className="rounded-lg border border-gray-200 p-3" title={`Sistema: ${formatSeconds(day.systemSeconds)} | Externo: ${formatSeconds(day.externalSeconds)}`}>
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                    <span>{formatDay(day.date)}</span>
                    <span>{formatSeconds(day.totalSeconds)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-salesforce-blue"
                      style={{ width: `${Math.max(0, 100 - percentExternal)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                    <span>Sistema: {formatSeconds(day.systemSeconds)}</span>
                    <span>Externo: {formatSeconds(day.externalSeconds)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </details>

      <details className="rounded-xl border border-gray-200 bg-white shadow-sm group">
        <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30 flex items-center gap-2">
          <FileText size={14} className="text-salesforce-blue" aria-hidden />
          Propostas do período ({proposals.length})
        </summary>
        <div className="px-5 pb-5 pt-1 border-t border-gray-100">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded bg-gray-100 animate-pulse" />)}
          </div>
        ) : proposals.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma proposta enviada no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="pb-2 pr-4 text-left font-semibold">Lead</th>
                  <th className="pb-2 pr-4 text-left font-semibold">Status</th>
                  <th className="pb-2 pr-4 text-left font-semibold">Campanha</th>
                  <th className="pb-2 pr-4 text-right font-semibold">Valor</th>
                  <th className="pb-2 pr-4 text-right font-semibold">Fechado</th>
                  <th className="pb-2 text-left font-semibold">Enviada em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {proposals.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2 pr-4">
                      <p className="font-medium text-gray-900">{p.lead?.name ?? '—'}</p>
                      {p.lead?.company ? (
                        <p className="text-xs text-gray-400">{p.lead.company}</p>
                      ) : null}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor(p.status)}`} title={p.lostReason ?? undefined}>
                        {statusLabel(p.status)}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{p.campaign?.name ?? '—'}</td>
                    <td className="py-2 pr-4 text-right font-medium text-gray-800">
                      {formatCurrency(p.valueOffered)}
                    </td>
                    <td className="py-2 pr-4 text-right font-medium text-green-700">
                      {p.valueClosed != null ? formatCurrency(p.valueClosed) : '—'}
                    </td>
                    <td className="py-2 text-gray-500">
                      {p.sentAt ? new Date(p.sentAt).toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </details>
    </div>
  );
};

export default ActivityReportPage;
