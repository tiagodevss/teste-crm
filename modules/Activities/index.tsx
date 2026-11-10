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
import { TablePageSkeleton } from '../../components/ui/Skeletons';
import {
  ACTIVITIES_FOCUS_RING,
  ACTIVITIES_TAB_LABELS,
  ACTIVITIES_TAB_PANEL_IDS,
  activitiesTabClass,
} from './activitiesUi';
import { ACTIVITIES_NEW_EVENT, formatAppointmentTime, getAppointmentEntityLabel } from './activitiesHelpers';

export const Activities: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { hasActionPermission } = useAuthorization();
  const tab = getActivitiesTabFromPathname(location.pathname);
  const [auditOwnerId, setAuditOwnerId] = useState('');
  const { usersList, fetchUsers } = useUserStore();
  const canManageTeam = hasActionPermission('lead-appointments.manage');
  const showOwnReminders = !auditOwnerId || auditOwnerId === user?.id;
  const { dueItems } = useDueActivityReminders(showOwnReminders, user?.id);

  const visibleTabs = useMemo(
    () =>
      (Object.keys(ACTIVITIES_TAB_LABELS) as ActivitiesTab[]).filter(
        (key) => key !== 'team' || canManageTeam,
      ),
    [canManageTeam],
  );

  const effectiveOwnerId = auditOwnerId || user?.id || '';
  const viewingOtherUser = Boolean(auditOwnerId && auditOwnerId !== user?.id);
  const viewingUserName = viewingOtherUser
    ? usersList.find((u) => u.id === auditOwnerId)?.name
    : null;

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
    <div className="space-y-5 motion-safe:animate-fade-in">
      <div className="sr-only" aria-live="polite" aria-atomic="true" id="activities-live-region" />
      <ActivitiesPageHeader
        canManageTeam={canManageTeam}
        auditOwnerId={auditOwnerId}
        onAuditOwnerChange={setAuditOwnerId}
        usersList={usersList}
      />

      {(viewingUserName || (showOwnReminders && dueItems.length > 0 && tab !== 'team')) && (
        <div className="flex flex-col gap-2" role="region" aria-label="Alertas operacionais">
          {viewingUserName ? (
            <div
              className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-950"
              role="status"
            >
              <span>
                Exibindo atividades de{' '}
                <span className="font-semibold">{viewingUserName}</span>
              </span>
              <button
                type="button"
                onClick={() => setAuditOwnerId('')}
                className={`ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-salesforce-blue hover:text-salesforce-hover ${ACTIVITIES_FOCUS_RING} rounded`}
              >
                <X size={14} aria-hidden />
                Voltar ao meu usuário
              </button>
            </div>
          ) : null}

          {showOwnReminders && dueItems.length > 0 && tab !== 'team' ? (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              role="status"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-700" aria-hidden />
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="font-semibold">
                    {dueItems.length} retorno{dueItems.length !== 1 ? 's' : ''} pendente
                    {dueItems.length !== 1 ? 's' : ''} para hoje
                  </p>
                  <ul className="space-y-1">
                    {dueItems.slice(0, 3).map((item) => (
                      <li key={item.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <time
                          dateTime={item.scheduledAt}
                          className="font-semibold tabular-nums text-amber-900"
                        >
                          {formatAppointmentTime(item.scheduledAt)}
                        </time>
                        <span className="text-amber-950">{getAppointmentEntityLabel(item)}</span>
                      </li>
                    ))}
                  </ul>
                  {dueItems.length > 3 ? (
                    <p className="text-xs text-amber-800">
                      + {dueItems.length - 3} outro{dueItems.length - 3 !== 1 ? 's' : ''}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => navigate(AppPath.ACTIVITIES_AGENDA)}
                    className={`inline-flex text-sm font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950 ${ACTIVITIES_FOCUS_RING} rounded`}
                  >
                    Ver na agenda de hoje
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div
        role="tablist"
        aria-label="Seções de atividades"
        className="flex flex-wrap gap-1 bg-white rounded-xl border border-gray-200 shadow-sm p-1"
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
            className={activitiesTabClass(tab === key)}
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
        <AgendaDayView ownerUserId={effectiveOwnerId} />
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
