import type { UserProfile } from './types';

export enum AppPath {
  LOGIN = '/login',
  FINANCIAL_TRACKING = '/acompanhar/:token',
  PARTNER_PORTAL = '/portal/parceiro',
  PARTNER_PROCESS = '/portal/parceiro/processos/:journeyId',
  PUBLIC_SURVEY = '/pesquisa-publica',
  FORGOT_PASSWORD = '/esqueci-senha',
  RESET_PASSWORD = '/redefinir-senha',
  DASHBOARD = '/dashboard',
  INDICADORES = '/indicadores',
  INDICADORES_GERAL = '/indicadores/geral',
  INDICADORES_CONTABILIDADE = '/indicadores/contabilidade',
  INDICADORES_FINANCEIRA = '/indicadores/financeira',
  INDICADORES_RELATORIOS = '/indicadores/relatorios',
  INDICADORES_RELATORIO = '/indicadores/relatorio-comercial',
  ACESSORIAS = '/acessorias',
  CRM = '/crm',
  ACTIVITIES = '/atividades',
  ACTIVITIES_AGENDA = '/atividades/agenda',
  ACTIVITIES_TEAM = '/atividades/equipe',
  COMMERCIAL_REPORT = '/relatorios-comerciais',
  CLIENTS = '/clientes',
  CLIENT = '/cliente',
  LEAD = '/lead',
  FINANCE = '/finance',
  FINANCE_QUEUE = '/finance/fila',
  LEGALIZATION_QUEUE = '/finance/legalizacao',
  GOALS = '/metas',
  CATEGORIES = '/categories',
  UNIDADES_ATENDIMENTO = '/unidades-atendimento',
  PRODUCTS = '/products',
  CAMPAIGNS = '/campaigns',
  USERS = '/users',
  PROFILES = '/perfis',
  HIERARCHY = '/parceiros',
  COLD_LEADS = '/prospeccao',
  PUBLIC_SURVEYS = '/pesquisas-publicas',
  PROSPECT_DETAIL = '/prospeccao/:id',
  SETTINGS = '/configuracoes',
  PROFILE = '/perfil',
  SETTINGS_PIPE = '/configuracoes/pipe',
  CRIAR_PIPE = '/criar-pipe',
}

export function isPartnerUser(user: UserProfile | null | undefined): boolean {
  return user?.profile?.code === 'IMOBILIARIA' || user?.role === 'IMOBILIARIA';
}
const LEGACY_CAMPAIGNS_PATHS = ['/desenquadramento', '/desenquadramentos'] as const;
function matchesPathSegment(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}
export function resolveLegacyCampaignsPathname(pathname: string): string | null {
  for (const legacyPath of LEGACY_CAMPAIGNS_PATHS) {
    if (!matchesPathSegment(pathname, legacyPath)) continue;
    if (pathname === legacyPath) return AppPath.CAMPAIGNS;
    return `${AppPath.CAMPAIGNS}${pathname.slice(legacyPath.length)}`;
  }
  return null;
}
export const ROUTE_PATHS: Record<string, AppPath> = {
  '/': AppPath.INDICADORES,
  [AppPath.DASHBOARD]: AppPath.INDICADORES,
  [AppPath.INDICADORES]: AppPath.INDICADORES,
  [AppPath.INDICADORES_GERAL]: AppPath.INDICADORES,
  [AppPath.INDICADORES_CONTABILIDADE]: AppPath.INDICADORES,
  [AppPath.INDICADORES_FINANCEIRA]: AppPath.INDICADORES,
  [AppPath.INDICADORES_RELATORIOS]: AppPath.INDICADORES,
  [AppPath.INDICADORES_RELATORIO]: AppPath.INDICADORES,
  [AppPath.ACESSORIAS]: AppPath.ACESSORIAS,
  [AppPath.CRM]: AppPath.CRM,
  [AppPath.ACTIVITIES]: AppPath.ACTIVITIES,
  [AppPath.ACTIVITIES_AGENDA]: AppPath.ACTIVITIES_AGENDA,
  [AppPath.ACTIVITIES_TEAM]: AppPath.ACTIVITIES_TEAM,
  [AppPath.COMMERCIAL_REPORT]: AppPath.COMMERCIAL_REPORT,
  [AppPath.CLIENTS]: AppPath.CLIENTS,
  [AppPath.FINANCE]: AppPath.FINANCE,
  [AppPath.FINANCE_QUEUE]: AppPath.FINANCE_QUEUE,
  [AppPath.LEGALIZATION_QUEUE]: AppPath.LEGALIZATION_QUEUE,
  [AppPath.GOALS]: AppPath.GOALS,
  [AppPath.CATEGORIES]: AppPath.CATEGORIES,
  [AppPath.UNIDADES_ATENDIMENTO]: AppPath.UNIDADES_ATENDIMENTO,
  [AppPath.PRODUCTS]: AppPath.PRODUCTS,
  [AppPath.CAMPAIGNS]: AppPath.CAMPAIGNS,
  [AppPath.USERS]: AppPath.USERS,
  [AppPath.PROFILES]: AppPath.PROFILES,
  [AppPath.HIERARCHY]: AppPath.HIERARCHY,
  [AppPath.COLD_LEADS]: AppPath.COLD_LEADS,
  [AppPath.PUBLIC_SURVEYS]: AppPath.PUBLIC_SURVEYS,
  [AppPath.SETTINGS]: AppPath.SETTINGS,
  [AppPath.PROFILE]: AppPath.PROFILE,
};
export type View = 'indicadores' | 'acessorias' | 'crm' | 'activities' | 'clients' | 'products' | 'categories' | 'unidades-atendimento' | 'campaigns' | 'users' | 'profiles' | 'hierarchy' | 'finance' | 'goals' | 'cold-leads' | 'public-surveys' | 'relatorios' | 'settings';
export const PATH_TO_VIEW: Record<Exclude<AppPath, AppPath.LOGIN | AppPath.FINANCIAL_TRACKING | AppPath.PARTNER_PORTAL | AppPath.PARTNER_PROCESS | AppPath.PUBLIC_SURVEY | AppPath.FORGOT_PASSWORD | AppPath.RESET_PASSWORD>, View> = {
  [AppPath.DASHBOARD]: 'indicadores',
  [AppPath.INDICADORES]: 'indicadores',
  [AppPath.INDICADORES_GERAL]: 'indicadores',
  [AppPath.INDICADORES_CONTABILIDADE]: 'indicadores',
  [AppPath.INDICADORES_FINANCEIRA]: 'indicadores',
  [AppPath.INDICADORES_RELATORIOS]: 'indicadores',
  [AppPath.INDICADORES_RELATORIO]: 'indicadores',
  [AppPath.ACESSORIAS]: 'acessorias',
  [AppPath.CRM]: 'crm',
  [AppPath.ACTIVITIES]: 'activities',
  [AppPath.ACTIVITIES_AGENDA]: 'activities',
  [AppPath.ACTIVITIES_TEAM]: 'activities',
  [AppPath.COMMERCIAL_REPORT]: 'relatorios',
  [AppPath.CLIENTS]: 'clients',
  [AppPath.CLIENT]: 'clients',
  [AppPath.LEAD]: 'crm',
  [AppPath.FINANCE]: 'finance',
  [AppPath.FINANCE_QUEUE]: 'finance',
  [AppPath.LEGALIZATION_QUEUE]: 'finance',
  [AppPath.GOALS]: 'goals',
  [AppPath.CATEGORIES]: 'categories',
  [AppPath.UNIDADES_ATENDIMENTO]: 'unidades-atendimento',
  [AppPath.PRODUCTS]: 'products',
  [AppPath.CAMPAIGNS]: 'campaigns',
  [AppPath.USERS]: 'users',
  [AppPath.PROFILES]: 'profiles',
  [AppPath.HIERARCHY]: 'hierarchy',
  [AppPath.COLD_LEADS]: 'cold-leads',
  [AppPath.PUBLIC_SURVEYS]: 'public-surveys',
  [AppPath.SETTINGS]: 'settings',
  [AppPath.PROFILE]: 'settings',
  [AppPath.SETTINGS_PIPE]: 'settings',
  [AppPath.PROSPECT_DETAIL]: 'cold-leads',
  [AppPath.CRIAR_PIPE]: 'settings',
};
export const VIEW_TO_PATH: Record<View, AppPath> = {
  indicadores: AppPath.INDICADORES, acessorias: AppPath.ACESSORIAS, crm: AppPath.CRM,
  activities: AppPath.ACTIVITIES, clients: AppPath.CLIENTS, finance: AppPath.FINANCE,
  goals: AppPath.GOALS, categories: AppPath.CATEGORIES, 'unidades-atendimento': AppPath.UNIDADES_ATENDIMENTO,
  products: AppPath.PRODUCTS, campaigns: AppPath.CAMPAIGNS, users: AppPath.USERS,
  profiles: AppPath.PROFILES, hierarchy: AppPath.HIERARCHY, 'cold-leads': AppPath.COLD_LEADS,
  'public-surveys': AppPath.PUBLIC_SURVEYS, relatorios: AppPath.COMMERCIAL_REPORT, settings: AppPath.SETTINGS,
};
export const DETAIL_PATH_PATTERNS: Record<string, View> = {
  [AppPath.HIERARCHY]: 'hierarchy', [AppPath.CAMPAIGNS]: 'campaigns', [AppPath.LEAD]: 'crm',
  [AppPath.CLIENT]: 'clients', [AppPath.COLD_LEADS]: 'cold-leads', [AppPath.SETTINGS_PIPE]: 'settings',
};
export const getPartnerDetailPath = (id: string) => `${AppPath.HIERARCHY}/${id}`;
export const getCampaignDetailPath = (id: string) => `${AppPath.CAMPAIGNS}/${id}`;
export const getLeadDetailPath = (id: string) => `${AppPath.LEAD}/${id}`;
export const getClientDetailPath = (id: string) => `${AppPath.CLIENT}/${id}`;
export const getProspectDetailPath = (id: string) => `${AppPath.COLD_LEADS}/${id}`;
export const getPipeSettingsPath = (pipeId: string) => `${AppPath.SETTINGS_PIPE}/${pipeId}`;
export const getCRMPipePath = (pipeSlug: string) => `${AppPath.CRM}/${pipeSlug}`;
export const getCRMPipeSlugFromPathname = (pathname: string): string | null => {
  if (pathname.startsWith(`${AppPath.CRM}/`)) {
    const segment = pathname.slice(AppPath.CRM.length + 1).split('/')[0];
    return segment || null;
  }
  return null;
};
export const getViewFromPathname = (pathname: string): View => {
  for (const legacyPath of LEGACY_CAMPAIGNS_PATHS) if (matchesPathSegment(pathname, legacyPath)) return 'campaigns';
  if (pathname === AppPath.CRM || pathname.startsWith(`${AppPath.CRM}/`)) return 'crm';
  if (pathname === AppPath.INDICADORES || pathname.startsWith(`${AppPath.INDICADORES}/`)) return 'indicadores';
  if (pathname === AppPath.ACTIVITIES || pathname.startsWith(`${AppPath.ACTIVITIES}/`)) return 'activities';
  if (pathname === AppPath.COMMERCIAL_REPORT) return 'relatorios';
  if (pathname === AppPath.FINANCE || pathname.startsWith(`${AppPath.FINANCE}/`)) return 'finance';
  if (pathname === AppPath.SETTINGS || pathname.startsWith(`${AppPath.SETTINGS}/`)) return 'settings';
  for (const [basePath, view] of Object.entries(DETAIL_PATH_PATTERNS)) if (pathname === basePath || pathname.startsWith(`${basePath}/`)) return view;
  const path = pathname === '/' ? AppPath.INDICADORES : (pathname as AppPath);
  return PATH_TO_VIEW[path as keyof typeof PATH_TO_VIEW] ?? 'indicadores';
};
export const getIdFromPathname = (pathname: string): string | null => {
  for (const legacyPath of LEGACY_CAMPAIGNS_PATHS) {
    if (pathname.startsWith(`${legacyPath}/`)) return pathname.slice(legacyPath.length + 1).split('/')[0] || null;
  }
  for (const basePath of Object.keys(DETAIL_PATH_PATTERNS)) {
    if (pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length + 1).split('/')[0] || null;
  }
  return null;
};
const MAX_RETURN_PATH_LENGTH = 2000;
function validateInternalReturnPath(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed || trimmed.length > MAX_RETURN_PATH_LENGTH || !trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) return null;
  if (trimmed === AppPath.LOGIN || trimmed.startsWith(`${AppPath.LOGIN}?`) || trimmed.startsWith(`${AppPath.LOGIN}/`)) return null;
  if (trimmed === AppPath.FORGOT_PASSWORD || trimmed.startsWith(`${AppPath.FORGOT_PASSWORD}?`) || trimmed.startsWith(`${AppPath.FORGOT_PASSWORD}/`)) return null;
  return trimmed;
}
export function getSafeRedirectAfterLogin(raw: string | null | undefined): string | null {
  if (raw == null || raw === '') return null;
  try { return validateInternalReturnPath(decodeURIComponent(raw)); } catch { return null; }
}
/** Login stays inside the Pages project path, including when a session expires. */
export function buildLoginUrlWithCurrentLocation(): string {
  if (typeof window === 'undefined') return AppPath.LOGIN;
  const full = window.location.hash.slice(1) || '/';
  const safe = validateInternalReturnPath(full);
  return `${window.location.pathname}#${AppPath.LOGIN}${safe ? `?redirect=${encodeURIComponent(safe)}` : ''}`;
}
export type ActivitiesTab = 'overview' | 'agenda' | 'team';
export function getActivitiesTabFromPathname(pathname: string): ActivitiesTab {
  if (pathname.startsWith(AppPath.ACTIVITIES_AGENDA)) return 'agenda';
  if (pathname.startsWith(AppPath.ACTIVITIES_TEAM)) return 'team';
  return 'overview';
}
export const ACTIVITIES_TAB_TO_PATH: Record<ActivitiesTab, AppPath> = { overview: AppPath.ACTIVITIES, agenda: AppPath.ACTIVITIES_AGENDA, team: AppPath.ACTIVITIES_TEAM };
export type IndicadoresAdminTab = 'geral' | 'contabilidade' | 'financeira' | 'relatorios';
export type IndicadoresNonAdminTab = 'dashboard' | 'report';
export function getIndicadoresAdminTabFromPathname(pathname: string): IndicadoresAdminTab {
  if (pathname.startsWith(AppPath.INDICADORES_CONTABILIDADE)) return 'contabilidade';
  if (pathname.startsWith(AppPath.INDICADORES_FINANCEIRA)) return 'financeira';
  if (pathname.startsWith(AppPath.INDICADORES_RELATORIOS)) return 'relatorios';
  return 'geral';
}
export function getIndicadoresNonAdminTabFromPathname(pathname: string): IndicadoresNonAdminTab {
  return pathname.startsWith(AppPath.INDICADORES_RELATORIO) ? 'report' : 'dashboard';
}
export const INDICADORES_ADMIN_TAB_TO_PATH: Record<IndicadoresAdminTab, AppPath> = { geral: AppPath.INDICADORES_GERAL, contabilidade: AppPath.INDICADORES_CONTABILIDADE, financeira: AppPath.INDICADORES_FINANCEIRA, relatorios: AppPath.INDICADORES_RELATORIOS };
export const INDICADORES_NON_ADMIN_TAB_TO_PATH: Record<IndicadoresNonAdminTab, AppPath> = { dashboard: AppPath.INDICADORES, report: AppPath.INDICADORES_RELATORIO };
