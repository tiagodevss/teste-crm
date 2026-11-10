import { useMemo } from 'react';
import { PermissionAction } from '../types';
import { useAuthorization } from './useAuthorization';

type RestrictionStrategy = 'hide' | 'disable';

interface ActionPolicy {
  permissions: readonly PermissionAction[];
  strategy: RestrictionStrategy;
  label: string;
  hint: string;
}

const ACTION_POLICIES = {
  'users.create': {
    permissions: ['users.admin'],
    strategy: 'hide',
    label: 'Criar usuários',
    hint: 'Permissão users.admin necessária para criar novos usuários.',
  },
  'users.modify': {
    permissions: ['users.admin'],
    strategy: 'disable',
    label: 'Editar e excluir usuários',
    hint: 'Permissão users.admin necessária para alterar ou remover usuários.',
  },
  'profiles.create': {
    permissions: ['profiles.admin'],
    strategy: 'hide',
    label: 'Criar perfis',
    hint: 'Permissão profiles.admin necessária para criar novos perfis.',
  },
  'profiles.modify': {
    permissions: ['profiles.admin'],
    strategy: 'disable',
    label: 'Editar e excluir perfis',
    hint: 'Permissão profiles.admin necessária para editar ou remover perfis.',
  },
  'profiles.permissions': {
    permissions: ['profiles.admin'],
    strategy: 'disable',
    label: 'Gerenciar permissões de perfis',
    hint: 'Permissão profiles.admin necessária para alterar a matriz de permissões.',
  },
  'crm.createLead': {
    permissions: ['crm.create', 'crm.manage'],
    strategy: 'hide',
    label: 'Criar leads',
    hint: 'Permissão crm.create ou crm.manage necessária para criar novos leads.',
  },
  'crm.stageChange': {
    permissions: ['lead-stage-move.execute', 'crm.edit', 'crm.manage'],
    strategy: 'disable',
    label: 'Mover leads e conversões',
    hint: 'Permissão lead-stage-move.execute, crm.edit ou crm.manage necessária para avançar etapas, converter ou atualizar leads.',
  },
  'proposals.create': {
    permissions: ['proposals.create', 'proposals.manage'],
    strategy: 'hide',
    label: 'Criar propostas',
    hint: 'Permissão proposals.create ou proposals.manage necessária para criar propostas/contratos.',
  },
  'proposals.modify': {
    permissions: ['proposals.edit', 'proposals.manage'],
    strategy: 'disable',
    label: 'Editar propostas',
    hint: 'Permissão proposals.edit ou proposals.manage necessária para editar/suspender/cancelar propostas.',
  },
  'campaigns.create': {
    permissions: ['campaigns.create', 'campaigns.manage'],
    strategy: 'hide',
    label: 'Criar campanhas',
    hint: 'Permissão campaigns.create ou campaigns.manage necessária para criar campanhas.',
  },
  'campaigns.modify': {
    permissions: ['campaigns.manage'],
    strategy: 'disable',
    label: 'Editar e excluir campanhas',
    hint: 'Permissão campaigns.manage necessária para alterar ou remover campanhas.',
  },
  'campaigns.export': {
    permissions: ['campaigns.export', 'campaigns.manage'],
    strategy: 'disable',
    label: 'Exportar campanhas',
    hint: 'Permissão campaigns.export ou campaigns.manage necessária para exportar listas de leads.',
  },
  'settings.save': {
    permissions: ['settings.manage'],
    strategy: 'disable',
    label: 'Salvar configurações',
    hint: 'Permissão settings.manage necessária para salvar ajustes do sistema.',
  },
  'goals.create': {
    permissions: ['goals.create', 'goals.manage'],
    strategy: 'hide',
    label: 'Criar metas',
    hint: 'Permissão goals.create ou goals.manage necessária para criar metas internas.',
  },
  'goals.export': {
    permissions: ['goals.export', 'goals.manage'],
    strategy: 'disable',
    label: 'Exportar metas',
    hint: 'Permissão goals.export ou goals.manage necessária para exportar relatórios de metas.',
  },
  'products.create': {
    permissions: ['products.create', 'products.manage'],
    strategy: 'hide',
    label: 'Criar produtos',
    hint: 'Permissão products.create ou products.manage necessária para cadastrar produtos.',
  },
  'products.modify': {
    permissions: ['products.edit', 'products.manage'],
    strategy: 'disable',
    label: 'Editar produtos',
    hint: 'Permissão products.edit ou products.manage necessária para alterar produtos.',
  },
  'categories.create': {
    permissions: ['categories.create', 'categories.manage'],
    strategy: 'hide',
    label: 'Criar grupos',
    hint: 'Permissão categories.create ou categories.manage necessária para cadastrar grupos de produtos.',
  },
  'categories.modify': {
    permissions: ['categories.edit', 'categories.manage'],
    strategy: 'disable',
    label: 'Editar grupos',
    hint: 'Permissão categories.edit ou categories.manage necessária para alterar grupos e subgrupos.',
  },
  'categories.delete': {
    permissions: ['categories.delete', 'categories.manage'],
    strategy: 'disable',
    label: 'Excluir grupos',
    hint: 'Permissão categories.delete ou categories.manage necessária para excluir grupos e subgrupos.',
  },
  'serviceUnits.create': {
    permissions: ['unidades-atendimento.create', 'unidades-atendimento.manage'],
    strategy: 'hide',
    label: 'Criar unidades',
    hint: 'Permissão unidades-atendimento.create ou unidades-atendimento.manage necessária para cadastrar unidades.',
  },
  'serviceUnits.modify': {
    permissions: ['unidades-atendimento.edit', 'unidades-atendimento.manage'],
    strategy: 'disable',
    label: 'Editar unidades',
    hint: 'Permissão unidades-atendimento.edit ou unidades-atendimento.manage necessária para alterar unidades.',
  },
  'serviceUnits.delete': {
    permissions: ['unidades-atendimento.delete', 'unidades-atendimento.manage'],
    strategy: 'disable',
    label: 'Excluir unidades',
    hint: 'Permissão unidades-atendimento.delete ou unidades-atendimento.manage necessária para excluir unidades.',
  },
  'hierarchy.create': {
    permissions: ['hierarchy.create', 'hierarchy.manage'],
    strategy: 'hide',
    label: 'Criar parceiros',
    hint: 'Permissão hierarchy.create ou hierarchy.manage necessária para cadastrar parceiros.',
  },
  'hierarchy.modify': {
    permissions: ['hierarchy.edit', 'hierarchy.manage'],
    strategy: 'disable',
    label: 'Editar parceiros',
    hint: 'Permissão hierarchy.edit ou hierarchy.manage necessária para alterar dados dos parceiros.',
  },
  'hierarchy.delete': {
    permissions: ['hierarchy.delete', 'hierarchy.manage'],
    strategy: 'disable',
    label: 'Excluir parceiros',
    hint: 'Permissão hierarchy.delete ou hierarchy.manage necessária para remover parceiros.',
  },
  'clients.create': {
    permissions: ['clients.create', 'clients.manage'],
    strategy: 'hide',
    label: 'Criar clientes',
    hint: 'Permissão clients.create ou clients.manage necessária para cadastrar clientes.',
  },
} as const;

export type ActionContext = keyof typeof ACTION_POLICIES;

export interface RestrictedActionState extends ActionPolicy {
  context: ActionContext;
  allowed: boolean;
}

export const useRestrictedAction = (context: ActionContext): RestrictedActionState => {
  const { hasActionPermission } = useAuthorization();
  const policy = ACTION_POLICIES[context];
  const allowed = useMemo(
    () => policy.permissions.some((permission) => hasActionPermission(permission)),
    [hasActionPermission, policy.permissions],
  );
  return {
    ...policy,
    context,
    allowed,
  };
};
