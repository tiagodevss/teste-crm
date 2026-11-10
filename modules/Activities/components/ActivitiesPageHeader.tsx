import React from 'react';
import { CalendarClock } from 'lucide-react';
import { ACTIVITIES_INPUT_CLASS } from '../activitiesUi';

interface ActivitiesPageHeaderProps {
  canManageTeam: boolean;
  auditOwnerId: string;
  onAuditOwnerChange: (value: string) => void;
  usersList: { id: string; name: string }[];
}

export function ActivitiesPageHeader({
  canManageTeam,
  auditOwnerId,
  onAuditOwnerChange,
  usersList,
}: ActivitiesPageHeaderProps) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5 text-balance">
          <span
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-salesforce-blue/10 text-salesforce-blue shrink-0"
            aria-hidden
          >
            <CalendarClock size={22} strokeWidth={2} />
          </span>
          Atividades
        </h1>
        <p className="text-sm text-gray-600 mt-1.5 max-w-2xl leading-relaxed">
          Retornos, compromissos e carteira por consultor — mantenha o pipeline em movimento. Atalhos:{' '}
          <kbd className="px-1 py-0.5 rounded border border-gray-300 bg-white font-mono text-xs">Alt</kbd>
          {' + '}
          <kbd className="px-1 py-0.5 rounded border border-gray-300 bg-white font-mono text-xs">N</kbd>
          {' nova atividade · '}
          <kbd className="px-1 py-0.5 rounded border border-gray-300 bg-white font-mono text-xs">Alt</kbd>
          {' + '}
          <kbd className="px-1 py-0.5 rounded border border-gray-300 bg-white font-mono text-xs">1–3</kbd>
          {' trocar aba.'}
        </p>
      </div>

      {canManageTeam ? (
        <div className="flex flex-col gap-1.5 w-full sm:w-auto shrink-0">
          <label htmlFor="activities-audit-owner" className="text-xs font-semibold text-gray-700">
            Ver atividades de
          </label>
          <select
            id="activities-audit-owner"
            value={auditOwnerId}
            onChange={(e) => onAuditOwnerChange(e.target.value)}
            className={`${ACTIVITIES_INPUT_CLASS} px-3 py-2.5 min-w-[220px] min-h-[44px] sm:min-h-0`}
          >
            <option value="">Meu usuário</option>
            {usersList.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </header>
  );
}
