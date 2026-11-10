import type { ActivitiesTab } from '../../routes';

export const ACTIVITIES_FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue/40 focus-visible:ring-offset-2';

export const ACTIVITIES_TAB_LABELS: Record<ActivitiesTab, string> = {
  overview: 'Minhas atividades',
  agenda: 'Agenda do dia',
  team: 'Carteira por consultor',
};

export const ACTIVITIES_TAB_PANEL_IDS: Record<ActivitiesTab, string> = {
  overview: 'activities-panel-overview',
  agenda: 'activities-panel-agenda',
  team: 'activities-panel-team',
};

export function activitiesTabClass(active: boolean): string {
  return [
    'relative px-4 py-2 text-sm font-semibold rounded-lg transition-colors',
    ACTIVITIES_FOCUS_RING,
    active
      ? 'bg-gray-100 text-gray-900 shadow-sm'
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
  ].join(' ');
}

export const APPOINTMENT_TYPE_CHIP_CLASS: Record<string, string> = {
  meeting: 'bg-blue-50 text-blue-800 border-blue-100',
  visit: 'bg-violet-50 text-violet-800 border-violet-100',
  follow_up: 'bg-amber-50 text-amber-900 border-amber-100',
  external: 'bg-slate-50 text-slate-700 border-slate-200',
  networking: 'bg-teal-50 text-teal-800 border-teal-100',
};

export const PRIMARY_BUTTON_CLASS = [
  'inline-flex items-center gap-2 px-4 py-2 bg-salesforce-blue text-white rounded-lg',
  'text-sm font-medium hover:bg-salesforce-hover shadow-sm transition-colors',
  ACTIVITIES_FOCUS_RING,
].join(' ');

export const COMPACT_PRIMARY_BUTTON_CLASS = [
  'inline-flex items-center gap-2 px-3 py-2 min-h-[44px] bg-salesforce-blue text-white rounded-lg',
  'text-sm font-medium hover:bg-salesforce-hover transition-colors',
  ACTIVITIES_FOCUS_RING,
].join(' ');

export const ROW_ACTION_BUTTON_CLASS = [
  'inline-flex items-center justify-center gap-1 px-2.5 py-2 min-h-[44px] text-xs font-semibold',
  'rounded-lg border transition-colors disabled:opacity-50',
  ACTIVITIES_FOCUS_RING,
].join(' ');

export const SECONDARY_BUTTON_CLASS = [
  'inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700',
  'rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors',
  ACTIVITIES_FOCUS_RING,
].join(' ');

export const TEAM_TAB_INTRO =
  'Carteira de leads por consultor — use Minhas atividades ou Agenda para compromissos e retornos da equipe.';

export const ACTIVITIES_INPUT_CLASS = [
  'rounded-lg border border-gray-300 bg-white text-sm shadow-sm transition-colors',
  'focus:outline-none focus:border-salesforce-blue focus:ring-2 focus:ring-salesforce-blue/20',
  ACTIVITIES_FOCUS_RING,
].join(' ');
