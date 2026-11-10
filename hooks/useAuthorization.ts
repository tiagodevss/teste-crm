import { isDemo, DEMO_VIEWS, isDemoActionAllowed } from '../config/demo';
import { useCallback, useMemo } from 'react';
import { PermissionAction, UserProfile } from '../types';
import { useUserStore } from '../modules/Login/store/useUserStore';
import { AppPath, View, VIEW_TO_PATH } from '../routes';

/** Mesma regra de `AuthorizationService.buildMatrixFromProfile` (perfil privilegiado). */
function normalizeProfileCodeForPrivilege(code: string): string {
  return code
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, '_');
}

function isBackendPrivilegedProfile(user: UserProfile | null): boolean {
  const p = user?.profile;
  if (p?.isAdmin) return true;
  const raw = (p?.code ?? user?.role ?? '').trim();
  if (!raw) return false;
  const normalized = normalizeProfileCodeForPrivilege(raw);
  return normalized === 'ADMIN' || normalized === 'ADMINISTRADOR';
}

const VIEW_PRIORITY: View[] = [
  'indicadores',
  'crm',
  'activities',
  'acessorias',
  'clients',
  'relatorios',
  'campaigns',
  'products',
  'unidades-atendimento',
  'categories',
  'hierarchy',
  'cold-leads',
  'goals',
  'users',
  'profiles',
  'settings',
];

export const useAuthorization = () => {
  const user = useUserStore((state) => state.user);
  const permissions = user?.permissions;
  const isPrivileged = useMemo(() => isBackendPrivilegedProfile(user), [user]);
  const navigation = permissions?.navigation ?? ({} as Record<View, boolean>);
  const actions = permissions?.actions ?? ({} as Record<PermissionAction, boolean>);
  const pipeAccess = permissions?.pipeAccess;

  const hasViewPermission = useCallback(
    (view: View) => (!isDemo || DEMO_VIEWS.has(view)) && (isPrivileged || Boolean(navigation[view])),
    [isPrivileged, navigation],
  );

  const hasActionPermission = useCallback(
    (action: PermissionAction) => (!isDemo || isDemoActionAllowed(action)) && (isPrivileged || Boolean(actions[action])),
    [isPrivileged, actions],
  );

  const firstAllowedView = useMemo(() => {
    for (const candidate of VIEW_PRIORITY) {
      if (navigation[candidate]) {
        return candidate;
      }
    }
    return 'indicadores';
  }, [navigation]);

  const defaultAuthorizedPath = VIEW_TO_PATH[firstAllowedView] ?? AppPath.INDICADORES;

  const canViewPipe = useCallback(
    (pipeId: string | null | undefined) => {
      if (!pipeId) return true;
      if (isPrivileged) return true;
      if (!pipeAccess) return true;
      const lvl = pipeAccess[pipeId];
      return lvl === 'read' || lvl === 'edit';
    },
    [isPrivileged, pipeAccess],
  );

  const canEditPipe = useCallback(
    (pipeId: string | null | undefined) => {
      if (!pipeId) return true;
      if (isPrivileged) return true;
      if (!pipeAccess) return true;
      return pipeAccess[pipeId] === 'edit';
    },
    [isPrivileged, pipeAccess],
  );

  return {
    hasViewPermission,
    hasActionPermission,
    firstAllowedView,
    defaultAuthorizedPath,
    navigation,
    canViewPipe,
    canEditPipe,
  };
};
