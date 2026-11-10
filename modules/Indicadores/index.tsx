import { isDemo } from '../../config/demo';
import React, { useEffect, useMemo } from 'react';
import { HelpCircle, LayoutDashboard } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserStore } from '../Login/store/useUserStore';
import { useAuthorization } from '../../hooks/useAuthorization';
import { EmptyState } from '../../components/ui/EmptyState';
import { OperadorDashboard } from '../../components/Dashboard/OperadorDashboard';
import { ImobiliariaDashboard } from '../../components/Dashboard/ImobiliariaDashboard';
import ActivityReportPage from './components/ActivityReportPage';
import { GeneralDashboard } from './components/GeneralDashboard';
import { AccountingDashboard } from './components/AccountingDashboard';
import { FinancialDashboard } from './components/FinancialDashboard';
import {
  getIndicadoresAdminTabFromPathname,
  getIndicadoresNonAdminTabFromPathname,
  INDICADORES_ADMIN_TAB_TO_PATH,
  INDICADORES_NON_ADMIN_TAB_TO_PATH,
  type IndicadoresAdminTab,
  type IndicadoresNonAdminTab,
} from '../../routes';

const TAB_STYLE_ACTIVE = 'bg-salesforce-blue text-white border-salesforce-blue';
const TAB_STYLE_INACTIVE = 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50';
const TAB_BASE =
  'px-3 py-2 rounded-lg text-sm font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue/40';

const ADMIN_TAB_LABELS: Record<IndicadoresAdminTab, string> = {
  geral: 'Geral',
  contabilidade: 'Contabilidade',
  financeira: 'Financeira',
  relatorios: 'Relatórios',
};

const ADMIN_PANEL_IDS: Record<IndicadoresAdminTab, string> = {
  geral: 'indicadores-panel-geral',
  contabilidade: 'indicadores-panel-contabilidade',
  financeira: 'indicadores-panel-financeira',
  relatorios: 'indicadores-panel-relatorios',
};

const NON_ADMIN_TAB_LABELS: Record<IndicadoresNonAdminTab, string> = {
  dashboard: 'Dashboard',
  report: 'Relatório Comercial',
};

const NON_ADMIN_PANEL_IDS: Record<IndicadoresNonAdminTab, string> = {
  dashboard: 'indicadores-panel-dashboard',
  report: 'indicadores-panel-report',
};

function IndicadoresPageHeader() {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Indicadores</h1>
      <p className="text-gray-500 text-sm">Acompanhe KPIs e produtividade em tempo real.</p>
      {!isDemo && <details className="mt-3 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-600 group">
        <summary className="cursor-pointer list-none font-semibold text-gray-700 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue/40 rounded">
          <HelpCircle size={16} className="text-gray-400" aria-hidden />
          Como usar este painel
        </summary>
        <ul className="mt-3 space-y-2 pl-1 list-disc list-inside marker:text-gray-400">
          <li>Filtre por período e responsável; os KPIs clicáveis abrem o CRM com o filtro correspondente.</li>
          <li>Use as setas ← → nas abas para alternar entre visões sem o mouse.</li>
          <li>Passe o cursor no ícone (i) dos cards para ver a definição de cada métrica.</li>
          <li>Alertas de SLA exibem atalho &quot;Ver no CRM&quot; para leads com prazo vencido.</li>
        </ul>
      </details>}
    </div>
  );
}

export const Indicadores: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { hasActionPermission } = useAuthorization();

  const canReadActivityReport =
    hasActionPermission('activity-reports.read') ||
    hasActionPermission('activity-reports.manage');
  const canAuditActivityReport = hasActionPermission('activity-reports.manage');

  const profile = user?.profile;
  const isPartner = profile?.isStaff === false;
  const isAdmin = profile?.isAdmin === true;
  const hasProfile = Boolean(profile);

  const adminTab = getIndicadoresAdminTabFromPathname(location.pathname);
  const nonAdminTab = getIndicadoresNonAdminTabFromPathname(location.pathname);

  const visibleAdminTabs = useMemo(
    () =>
      (Object.keys(ADMIN_TAB_LABELS) as IndicadoresAdminTab[]).filter(
        (key) => key !== 'relatorios' || canReadActivityReport,
      ),
    [canReadActivityReport],
  );

  const visibleNonAdminTabs = useMemo(
    () =>
      (Object.keys(NON_ADMIN_TAB_LABELS) as IndicadoresNonAdminTab[]).filter(
        (key) => key !== 'report' || canReadActivityReport,
      ),
    [canReadActivityReport],
  );

  useEffect(() => {
    if (!isAdmin || !hasProfile) return;
    if (adminTab === 'relatorios' && !canReadActivityReport) {
      navigate(INDICADORES_ADMIN_TAB_TO_PATH.geral, { replace: true });
    }
  }, [adminTab, canReadActivityReport, hasProfile, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin || !hasProfile) return;
    if (nonAdminTab === 'report' && !canReadActivityReport) {
      navigate(INDICADORES_NON_ADMIN_TAB_TO_PATH.dashboard, { replace: true });
    }
  }, [canReadActivityReport, hasProfile, isAdmin, navigate, nonAdminTab]);

  const handleAdminTabKeyDown = (
    event: React.KeyboardEvent,
    current: IndicadoresAdminTab,
  ) => {
    const idx = visibleAdminTabs.indexOf(current);
    if (idx < 0) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigate(INDICADORES_ADMIN_TAB_TO_PATH[visibleAdminTabs[(idx + 1) % visibleAdminTabs.length]]);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigate(
        INDICADORES_ADMIN_TAB_TO_PATH[
          visibleAdminTabs[(idx - 1 + visibleAdminTabs.length) % visibleAdminTabs.length]
        ],
      );
    }
  };

  const handleNonAdminTabKeyDown = (
    event: React.KeyboardEvent,
    current: IndicadoresNonAdminTab,
  ) => {
    const idx = visibleNonAdminTabs.indexOf(current);
    if (idx < 0) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigate(INDICADORES_NON_ADMIN_TAB_TO_PATH[visibleNonAdminTabs[(idx + 1) % visibleNonAdminTabs.length]]);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigate(
        INDICADORES_NON_ADMIN_TAB_TO_PATH[
          visibleNonAdminTabs[(idx - 1 + visibleNonAdminTabs.length) % visibleNonAdminTabs.length]
        ],
      );
    }
  };

  if (!hasProfile) {
    return (
      <div className="p-1">
        <IndicadoresPageHeader />
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <EmptyState
            icon={LayoutDashboard}
            title="Selecione uma conta para visualizar os indicadores"
            description="Os dashboards são exibidos de acordo com o perfil do usuário."
          />
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="p-1">
        <IndicadoresPageHeader />

        <div
          role="tablist"
          aria-label="Indicadores por operação"
          className="mb-5 flex flex-wrap gap-2"
        >
          {visibleAdminTabs.map((tabKey) => {
            const active = adminTab === tabKey;
            return (
              <button
                key={tabKey}
                type="button"
                role="tab"
                id={`indicadores-tab-${tabKey}`}
                aria-selected={active}
                aria-controls={ADMIN_PANEL_IDS[tabKey]}
                tabIndex={active ? 0 : -1}
                onClick={() => navigate(INDICADORES_ADMIN_TAB_TO_PATH[tabKey])}
                onKeyDown={(e) => handleAdminTabKeyDown(e, tabKey)}
                className={`${TAB_BASE} ${active ? TAB_STYLE_ACTIVE : TAB_STYLE_INACTIVE}`}
              >
                {ADMIN_TAB_LABELS[tabKey]}
              </button>
            );
          })}
        </div>

        {adminTab === 'geral' ? (
          <div
            role="tabpanel"
            id={ADMIN_PANEL_IDS.geral}
            aria-labelledby="indicadores-tab-geral"
          >
            <GeneralDashboard />
          </div>
        ) : null}
        {adminTab === 'contabilidade' ? (
          <div
            role="tabpanel"
            id={ADMIN_PANEL_IDS.contabilidade}
            aria-labelledby="indicadores-tab-contabilidade"
          >
            <AccountingDashboard />
          </div>
        ) : null}
        {adminTab === 'financeira' ? (
          <div
            role="tabpanel"
            id={ADMIN_PANEL_IDS.financeira}
            aria-labelledby="indicadores-tab-financeira"
          >
            <FinancialDashboard />
          </div>
        ) : null}
        {adminTab === 'relatorios' && canReadActivityReport ? (
          <div
            role="tabpanel"
            id={ADMIN_PANEL_IDS.relatorios}
            aria-labelledby="indicadores-tab-relatorios"
          >
            <ActivityReportPage canAuditOthers={canAuditActivityReport} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="p-1">
      <IndicadoresPageHeader />

      <div
        role="tablist"
        aria-label="Indicadores"
        className="mb-4 flex flex-wrap gap-2"
      >
        {visibleNonAdminTabs.map((tabKey) => {
          const active = nonAdminTab === tabKey;
          return (
            <button
              key={tabKey}
              type="button"
              role="tab"
              id={`indicadores-tab-${tabKey}`}
              aria-selected={active}
              aria-controls={NON_ADMIN_PANEL_IDS[tabKey]}
              tabIndex={active ? 0 : -1}
              onClick={() => navigate(INDICADORES_NON_ADMIN_TAB_TO_PATH[tabKey])}
              onKeyDown={(e) => handleNonAdminTabKeyDown(e, tabKey)}
              className={`${TAB_BASE} ${active ? TAB_STYLE_ACTIVE : TAB_STYLE_INACTIVE}`}
            >
              {NON_ADMIN_TAB_LABELS[tabKey]}
            </button>
          );
        })}
      </div>

      {nonAdminTab === 'dashboard' ? (
        <div
          role="tabpanel"
          id={NON_ADMIN_PANEL_IDS.dashboard}
          aria-labelledby="indicadores-tab-dashboard"
        >
          {isPartner ? <ImobiliariaDashboard /> : <OperadorDashboard />}
        </div>
      ) : null}
      {nonAdminTab === 'report' && canReadActivityReport ? (
        <div
          role="tabpanel"
          id={NON_ADMIN_PANEL_IDS.report}
          aria-labelledby="indicadores-tab-report"
        >
          <ActivityReportPage canAuditOthers={canAuditActivityReport} />
        </div>
      ) : null}
    </div>
  );
};
