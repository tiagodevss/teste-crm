import React from 'react';
import { CalendarDays, UserRound } from 'lucide-react';
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
    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-salesforce-blue ring-1 ring-inset ring-blue-100"
          aria-hidden
        >
          <CalendarDays size={24} strokeWidth={2} />
        </span>
        <div className="min-w-0 pt-0.5">
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-slate-950 text-balance">
            Atividades
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Retornos, compromissos e produtividade da equipe.
          </p>
        </div>
      </div>

      {canManageTeam ? (
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-inset ring-slate-200"
            aria-hidden
          >
            <UserRound size={18} />
          </span>
          <div className="min-w-0 flex-1 sm:flex-none">
            <label htmlFor="activities-audit-owner" className="sr-only">
              Ver atividades de
            </label>
            <select
              id="activities-audit-owner"
              value={auditOwnerId}
              onChange={(e) => onAuditOwnerChange(e.target.value)}
              className={`${ACTIVITIES_INPUT_CLASS} min-h-[40px] w-full px-3 py-2 sm:min-w-[190px]`}
            >
              <option value="">Meu usuário</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </header>
  );
}
