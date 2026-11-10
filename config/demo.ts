import { normalizeDemoBase, demoRoute } from '../lib/demoPaths';
/** This repository only runs the demonstration, in every build mode. */
export const isDemo = true;
export const DEMO_BASE_PATH = normalizeDemoBase(import.meta.env?.BASE_URL || '/');
export const DEMO_API_PATH = `${DEMO_BASE_PATH}__demo_api__/v1`;
export const demoRouteUrl = (route: string) => demoRoute(DEMO_BASE_PATH, route);
export const DEMO_STORAGE_KEY = 'teste-crm:database:v1';
export const DEMO_AUTH_KEY = 'teste-crm:auth:v1';
export const DEMO_VIEWS = new Set(['indicadores', 'crm', 'activities', 'clients']);
const DEMO_ACTIONS = new Set([
  'indicadores.read', 'crm.read', 'crm.create', 'crm.edit', 'crm.manage',
  'clients.read', 'clients.edit', 'activities.read',
  'lead-stage-move.execute', 'lead-appointments.read', 'lead-appointments.create',
  'lead-appointments.edit', 'lead-appointments.delete', 'lead-appointments.manage',
]);
export const isDemoActionAllowed = (action: string) => DEMO_ACTIONS.has(action);
