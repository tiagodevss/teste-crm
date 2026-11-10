import type { UserProfile } from '../types';

/** Mesma regra do backend: admin no perfil ou código ADMIN / ADMINISTRADOR. */
export function canViewCommissionData(user: UserProfile | null | undefined): boolean {
  const p = user?.profile;
  if (!p) return false;
  if (p.isAdmin) return true;
  const code = (p.code ?? '').trim().toUpperCase();
  return code === 'ADMIN' || code === 'ADMINISTRADOR';
}
