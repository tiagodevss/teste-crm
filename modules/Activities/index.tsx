import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserStore } from '../Login/store/useUserStore';
import { useAuthorization } from '../../hooks/useAuthorization';
import { useDueActivityReminders } from '../../hooks/useDueActivityReminders';
import {
  ACTIVITIES_TAB_TO_PATH,
  AppPath,
  getActivitiesTabFromPathname,
  type ActivitiesTab,
} from '../../routes';
import { ActivitiesOverview } from './components/ActivitiesOverview';
import { AgendaDayView } from './components/AgendaDayView';
import { TeamLeadsView } from './components/TeamLeadsView';
import { ActivitiesPageHeader } from './components/ActivitiesPageHeader';
import { ActivitiesInlineHelp } from './components/ActivitiesInlineHelp';
import { ActivitiesMetrics } from './components/ActivitiesMetrics';
import { TablePageSkeleton } from '../../components/ui/Skeletons';
import {
  ACTIVITIES_FOCUS_RING,
  ACTIVITIES_TAB_LABELS,
  ACTIVITIES_TAB_PANEL_IDS,
  activitiesTabClass,
} from './activitiesUi';
import {
  ACTIVITIES_NEW_EVENT,
  formatAppointmentTime,
  getAppointmentEntityLabel,
  isOverdueAppointment,
} from './activitiesHelpers';
import { useActivitiesDashboard } from './hooks/useActivitiesDashboard';

export const Activities: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { hasActionPermission } = useAuthorization();
  const tab = getActivitiesTabFromPathname(location.pathname);
  const [auditOwnerId, setAuditOwnerId] = useState('');
  const { usersList, fetchUsers } = useUserStore();
  const canManageTeam = hasActionPermission('lead-appointments.manage');
  const effectiveOwnerId = auditOwnerId || user?.id || '';
  const showOwnReminders = !auditOwnerId || auditOwnerId === user?.id;
  const { dueItems } = useDueActivityReminders(showOwnReminders, user?.id);
  const dashboard = useActivitiesDashboard(effectiveOwnerId);

  const visibleTabs = useMemo(
    () =>
      (Object.keys(ACTIVITIES_TAB_LABELS) as ActivitiesTab[]).filter(
        (key) => key !== 'team' || canManageTeam,
      ),
    [canManageTeam],
  );

  const viewingOtherUser = Boolean(auditOwnerId && auditOwnerId !== user?.id);
  const viewingUserName = viewingOtherUser
    ? usersList.find((u) => u.id === auditOwnerId)?.name
    : null;

  const overdueItems = useMemo(
    () => dueItems.filter(isOverdueAppointment),
    [dueItems],
  );

  useEffect(() => {
    if (canManageTeam) void fetchUsers({ page: 1, limit: 200 });
  }, [canManageTeam, fetchUsers]);

  useEffect(() => {
    if (tab === 'team' && !canManageTeam) {
      navigate(ACTIVITIES_TAB_TO_PATH.overview, { replace: true });
    }
  }, [tab, canManageTeam, navigate]);

  const goToTab = useCallback((next: ActivitiesTab) => {
    navigate(ACTIVITIES_TAB_TO_PATH[next]);
    requestAnimationFrame(() => {
      document.getElementById(`activities-tab-${next}`)?.focus();
    });
  }, [navigate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'n') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent(ACTIVITIES_NEW_EVENT));
        return;
      }
      const tabIndex = Number(key);
      if (tabIndex >= 1 && tabIndex <= visibleTabs.length) {
        event.preventDefault();
        goToTab(visibleTabs[tabIndex - 1]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visibleTabs, goToTab]);

  const handleTabKeyDown = (event: React.KeyboardEvent, current: ActivitiesTab) => {
    const idx = visibleTabs.indexOf(current);
    if (idx < 0) return;
    if (event.key === 'Home') {
      event.preventDefault();
      goToTab(visibleTabs[0]);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      goToTab(visibleTabs[visibleTabs.length - 1]);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToTab(visibleTabs[(idx + 1) % visibleTabs.length]);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToTab(visibleTabs[(idx - 1 + visibleTabs.length) % visibleTabs.length]);
    }
  };

  if (!user) return <TablePageSkeleton />;

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden space-y-4 motion-safe:animate-fade-in">
      <div className="sr-only" aria-live="polite" aria-atomic="true" id="activities-live-region" />
      <ActivitiesPageHeader
        canManageTeam={canManageTeam}
        auditOwnerId={auditOwnerId}
        onAuditOwnerChange={setAuditOwnerId}
        usersList={usersList}
      />

      <ActivitiesMetrics metrics={dashboard.metrics} isLoading={dashboard.isLoading} />

      {(viewingUserName || (showOwnReminders && dueItems.length > 0 && tab !== 'team')) && (
        <div className="flex flex-col gap-2" role="region" aria-label="Alertas operacionais">
          {viewingUserName ? (
            <div
              className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950"
              role="status"
            >
              <span>
                Exibindo atividades de <span className="font-semibold">{viewingUserName}</span>
              </span>
              <button
                type="button"
                onClick={() => setAuditOwnerId('')}
                className={`ml-auto inline-flex items-center gap-1.5 rounded text-xs font-semibold text-salesforce-blue hover:text-salesforce-hover ${ACTIVITIES_FOCUS_RING}`}
              >
                <X size={14} aria-hidden />
                Voltar ao meu usuário
              </button>
            </div>
          ) : null}

          {showOwnReminders && dueItems.length > 0 && tab !== 'team' ? (
            <div
              className="rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-4 text-sm text-rose-950"
              role="status"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex min-w-0 items-start gap-3 lg:w-[22rem] lg:shrink-0">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-rose-600 ring-1 ring-inset ring-rose-200" aria-hidden>
                    <AlertTriangle size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-rose-950">Retornos críticos</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-rose-800">
                      {overdueItems.length > 0
                        ? `${overdueItems.length} ${overdueItems.length === 1 ? 'retorno atrasado exige' : 'retornos atrasados exigem'} atenção.`
                        : `${dueItems.length} ${dueItems.length === 1 ? 'retorno está' : 'retornos estão'} próximo do horário.`}
                    </p>
                  </div>
                </div>

                <span className="hidden h-10 w-px bg-rose-200 lg:block" aria-hidden />

                <ul className="min-w-0 flex-1 space-y-1.5">
                  {dueItems.slice(0, 3).map((item) => (
                    <li key={item.id} className="flex min-w-0 items-baseline gap-2 text-xs sm:text-sm">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${isOverdueAppointment(item) ? 'bg-rose-500' : 'bg-amber-500'}`} aria-hidden />
                      <span className="min-w-0 truncate font-semibold text-rose-950">
                        {getAppointmentEntityLabel(item)}
                      </span>
                      <span className="shrink-0 text-rose-800">
                        — {isOverdueAppointment(item) ? 'atrasado às' : 'agendado às'}{' '}
                        <time dateTime={item.scheduledAt} className="font-semibold tabular-nums">
                          {formatAppointmentTime(item.scheduledAt)}
                        </time>
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => navigate(AppPath.ACTIVITIES_AGENDA)}
                  className={`self-start whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100 lg:self-center ${ACTIVITIES_FOCUS_RING}`}
                >
                  Ver agenda
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div
        role="tablist"
        aria-label="Seções de atividades"
        className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
      >
        {visibleTabs.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`activities-tab-${key}`}
            aria-selected={tab === key}
            aria-controls={ACTIVITIES_TAB_PANEL_IDS[key]}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => goToTab(key)}
            onKeyDown={(e) => handleTabKeyDown(e, key)}
            className={`${activitiesTabClass(tab === key)} shrink-0 sm:min-w-[10rem]`}
          >
            {ACTIVITIES_TAB_LABELS[key]}
          </button>
        ))}
      </div>

      <ActivitiesInlineHelp />

      <div
        role="tabpanel"
        id={ACTIVITIES_TAB_PANEL_IDS.overview}
        aria-labelledby="activities-tab-overview"
        hidden={tab !== 'overview'}
      >
        <ActivitiesOverview ownerUserId={effectiveOwnerId} />
      </div>
      <div
        role="tabpanel"
        id={ACTIVITIES_TAB_PANEL_IDS.agenda}
        aria-labelledby="activities-tab-agenda"
        hidden={tab !== 'agenda'}
      >
        <AgendaDayView
          ownerUserId={effectiveOwnerId}
          dashboardItems={dashboard.items}
          dashboardLoading={dashboard.isLoading}
        />
      </div>
      {canManageTeam ? (
        <div
          role="tabpanel"
          id={ACTIVITIES_TAB_PANEL_IDS.team}
          aria-labelledby="activities-tab-team"
          hidden={tab !== 'team'}
        >
          <TeamLeadsView />
        </div>
      ) : null}
    </div>
  );
};
