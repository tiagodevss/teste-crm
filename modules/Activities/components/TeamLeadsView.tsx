import React, { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { Lead, LeadStatus } from '../../../types';
import { useCRMStore } from '../../CRM/store/useCRMStore';
import { useUserStore } from '../../Login/store/useUserStore';
import { DataTable } from '../../../components/ui/DataTable';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { TableBodySkeleton } from '../../../components/ui/Skeletons';
import { getLeadDetailPath } from '../../../routes';
import { useNavigate } from 'react-router-dom';
import { ActivitiesFetchError } from './ActivitiesFetchError';
import { ACTIVITIES_INPUT_CLASS, TEAM_TAB_INTRO } from '../activitiesUi';

const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  [LeadStatus.LEAD]: 'Lead',
  [LeadStatus.OPORTUNIDADE]: 'Oportunidade',
  [LeadStatus.CLIENTE]: 'Cliente',
  [LeadStatus.PERDIDO]: 'Perdido',
};

export const TeamLeadsView: React.FC = () => {
  const navigate = useNavigate();
  const { usersList, fetchUsers } = useUserStore();
  const { leads, fetchLeads, isLoading, leadsFetchError } = useCRMStore();
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    void fetchUsers({ page: 1, limit: 200 });
  }, [fetchUsers]);

  useEffect(() => {
    void fetchLeads({
      page: 1,
      limit: 500,
      ownerUserId: selectedUserId || undefined,
    });
  }, [selectedUserId, fetchLeads]);

  const grouped = useMemo(() => {
    const map = new Map<string, { userName: string; leads: Lead[] }>();
    for (const lead of leads) {
      const ownerId = lead.ownerUserId ?? 'sem-responsavel';
      const ownerName = lead.owner?.name ?? 'Sem responsável';
      const entry = map.get(ownerId) ?? { userName: ownerName, leads: [] };
      entry.leads.push(lead);
      map.set(ownerId, entry);
    }
    return [...map.entries()].sort((a, b) => a[1].userName.localeCompare(b[1].userName));
  }, [leads]);

  const filteredGroup = selectedUserId
    ? grouped.filter(([id]) => id === selectedUserId)
    : grouped;

  const filterToolbar = (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
      <div className="inline-flex items-center gap-2 text-gray-700">
        <Users size={18} className="text-salesforce-blue shrink-0" aria-hidden />
        <label htmlFor="team-user-filter" className="text-sm font-semibold">
          Consultor
        </label>
      </div>
      <select
        id="team-user-filter"
        value={selectedUserId}
        onChange={(e) => setSelectedUserId(e.target.value)}
        disabled={isLoading && leads.length === 0}
        className={`${ACTIVITIES_INPUT_CLASS} px-3 py-2 min-w-[220px] min-h-[44px] sm:min-h-0`}
      >
        <option value="">Todos os consultores</option>
        {usersList.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <span className="text-sm text-gray-600 sm:ml-auto tabular-nums" role="status">
        <span className="font-semibold text-gray-900">{leads.length}</span> lead
        {leads.length !== 1 ? 's' : ''}
        <span className="text-gray-300 mx-2" aria-hidden>
          ·
        </span>
        <span className="font-semibold text-gray-900">{filteredGroup.length}</span> consultor
        {filteredGroup.length !== 1 ? 'es' : ''}
      </span>
    </div>
  );

  const retryFetch = () => {
    void fetchLeads({
      page: 1,
      limit: 500,
      ownerUserId: selectedUserId || undefined,
    });
  };

  const teamIntro = (
    <p className="text-xs text-gray-600 px-1 leading-relaxed">{TEAM_TAB_INTRO}</p>
  );

  if (leadsFetchError && leads.length === 0) {
    return (
      <div className="space-y-4">
        {filterToolbar}
        {teamIntro}
        <ActivitiesFetchError
          message={leadsFetchError}
          onRetry={retryFetch}
          isRetrying={isLoading}
          staleData={leads.length > 0}
        />
      </div>
    );
  }

  if (isLoading && leads.length === 0) {
    return (
      <div className="space-y-4">
        {filterToolbar}
        {teamIntro}
        <div
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          aria-busy="true"
          aria-label="Carregando leads da equipe"
        >
          <table className="w-full">
            <tbody>
              <TableBodySkeleton columns={4} rows={6} />
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (filteredGroup.length === 0 && !isLoading) {
    return (
      <div className="space-y-4">
        {filterToolbar}
        {teamIntro}
        <EmptyState
          icon={Users}
          title="Nenhum lead encontrado"
          description="Ajuste o filtro de consultor ou aguarde novos leads serem atribuídos à equipe."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4" aria-busy={isLoading && leads.length > 0 ? true : undefined}>
      {filterToolbar}
      {leadsFetchError ? (
        <ActivitiesFetchError
          message={leadsFetchError}
          onRetry={retryFetch}
          isRetrying={isLoading}
          staleData={leads.length > 0}
        />
      ) : null}
      {teamIntro}

      {filteredGroup.map(([ownerId, group]) => (
        <div
          key={ownerId}
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80 flex items-center gap-3">
            <UserAvatar
              name={group.userName}
              initials={group.leads[0]?.owner?.avatarInitials}
              avatarUrl={group.leads[0]?.owner?.avatarUrl}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 truncate">{group.userName}</h3>
              <p className="text-xs text-gray-500 tabular-nums">
                {group.leads.length} lead{group.leads.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <DataTable<Lead>
            columns={[
              {
                key: 'name',
                label: 'Lead',
                render: (row) => (
                  <div>
                    <p className="font-medium text-gray-900">{row.name}</p>
                    {row.company ? <p className="text-xs text-gray-500">{row.company}</p> : null}
                  </div>
                ),
              },
              {
                key: 'stage',
                label: 'Etapa',
                render: (row) => <span className="text-sm text-gray-600">{row.stage || '—'}</span>,
              },
              {
                key: 'status',
                label: 'Status',
                render: (row) => (
                  <span className="text-sm text-gray-600">
                    {LEAD_STATUS_LABEL[row.status as LeadStatus] ?? row.status}
                  </span>
                ),
              },
              {
                key: 'lastContact',
                label: 'Último contato',
                render: (row) => (
                  <span className="text-sm text-gray-500 tabular-nums">
                    {row.lastContactDate ?? '—'}
                  </span>
                ),
              },
            ]}
            data={group.leads}
            pagination={{
              page: 1,
              limit: group.leads.length || 1,
              total: group.leads.length,
              totalPages: 1,
            }}
            isLoading={isLoading}
            emptyMessage="Nenhum lead atribuído."
            rowKey={(row) => row.id}
            onRowClick={(row) => row.id && navigate(getLeadDetailPath(row.id))}
          />
        </div>
      ))}
    </div>
  );
};
