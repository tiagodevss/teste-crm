import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, ChevronRight, Filter, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Lead, SortOrder } from '../../types';
import { DataTable } from '../../components/ui/DataTable';
import { formatDate, formatPhone } from '../../utils/formatters';
import { CadastralListSearch, CadastralListFetchError } from '../../components/cadastral';
import { useClientsStore } from './store';
import { getClientDetailPath } from '../../routes';
import { TablePageSkeleton } from '../../components/ui/Skeletons';
import { ClientsFilterSidebar } from './components/ClientsFilterSidebar';
import { ClientFormModal } from './components/ClientFormModal';
import { ClientsHelpPanel } from './components/ClientsHelpPanel';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { useUserStore } from '../Login/store/useUserStore';
import { useRestrictedAction } from '../../hooks/useRestrictedAction';
import { countActiveFilters, getActiveFilterChips } from './clientsFilterUtils';
import type { FetchClientsParams } from './store';

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_INACTIVE_DAYS = 30;

export type ClientsListMode = 'active' | 'repescagem';

export interface ClientsFilterValues {
  company: string;
  cpfCnpj: string;
  email: string;
  phone: string;
  createdAtFrom: string;
  createdAtTo: string;
  city: string;
  responsibleUserId: string;
  dateFrom: string;
  dateTo: string;
  minDaysWithoutAction: string;
  withoutActionOnly: boolean;
}

const initialFilterValues: ClientsFilterValues = {
  company: '',
  cpfCnpj: '',
  email: '',
  phone: '',
  createdAtFrom: '',
  createdAtTo: '',
  city: '',
  responsibleUserId: '',
  dateFrom: '',
  dateTo: '',
  minDaysWithoutAction: '',
  withoutActionOnly: false,
};

export const Clients: React.FC = () => {
  const navigate = useNavigate();
  const { clients, clientsPagination, clientsSort, fetchClients, isLoading, error, lastParams } =
    useClientsStore();
  const { fetchUsers, usersList } = useUserStore();
  const createClientAction = useRestrictedAction('clients.create');
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [listMode, setListMode] = useState<ClientsListMode>('active');
  const [filterValues, setFilterValues] = useState<ClientsFilterValues>(initialFilterValues);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        document.getElementById('clients-list-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    void fetchUsers({ page: 1, limit: 200 });
  }, [fetchUsers]);

  const buildParams = (overrides?: Partial<FetchClientsParams>): FetchClientsParams => {
    const minDays = filterValues.minDaysWithoutAction
      ? Number.parseInt(filterValues.minDaysWithoutAction, 10)
      : undefined;

    return {
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      search: searchTerm || undefined,
      sortBy: clientsSort.sortBy,
      sortOrder: clientsSort.sortOrder,
      company: filterValues.company || undefined,
      cpfCnpj: filterValues.cpfCnpj || undefined,
      email: filterValues.email || undefined,
      phone: filterValues.phone || undefined,
      createdAtFrom: filterValues.createdAtFrom || undefined,
      createdAtTo: filterValues.createdAtTo || undefined,
      city: filterValues.city || undefined,
      responsibleUserId: filterValues.responsibleUserId || undefined,
      dateFrom: filterValues.dateFrom || undefined,
      dateTo: filterValues.dateTo || undefined,
      minDaysWithoutAction:
        listMode === 'repescagem'
          ? minDays ?? DEFAULT_INACTIVE_DAYS
          : filterValues.withoutActionOnly
            ? minDays ?? DEFAULT_INACTIVE_DAYS
            : minDays,
      inactiveOnly: listMode === 'repescagem' || filterValues.withoutActionOnly || undefined,
      ...overrides,
    };
  };

  useEffect(() => {
    fetchClients(buildParams({ page: 1, limit: DEFAULT_PAGE_SIZE }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listMode]);

  const handleSort = (sortBy: string, sortOrder: SortOrder) => {
    fetchClients(buildParams({ page: 1, sortBy, sortOrder }));
  };

  const handlePageChange = (page: number) => {
    fetchClients(buildParams({ page, limit: clientsPagination.limit }));
  };

  const handleSearch = () => {
    setAppliedSearchTerm(searchTerm.trim());
    fetchClients(buildParams({ page: 1, search: searchTerm.trim() || undefined }));
  };

  const handleApplyFilters = (values: ClientsFilterValues) => {
    setFilterValues(values);
    fetchClients(
      buildParams({
        page: 1,
        company: values.company || undefined,
        cpfCnpj: values.cpfCnpj || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        createdAtFrom: values.createdAtFrom || undefined,
        createdAtTo: values.createdAtTo || undefined,
        city: values.city || undefined,
        responsibleUserId: values.responsibleUserId || undefined,
        dateFrom: values.dateFrom || undefined,
        dateTo: values.dateTo || undefined,
        minDaysWithoutAction:
          listMode === 'repescagem'
            ? values.minDaysWithoutAction
              ? Number.parseInt(values.minDaysWithoutAction, 10)
              : DEFAULT_INACTIVE_DAYS
            : values.withoutActionOnly
              ? Number.parseInt(values.minDaysWithoutAction, 10) || DEFAULT_INACTIVE_DAYS
              : values.minDaysWithoutAction
                ? Number.parseInt(values.minDaysWithoutAction, 10)
                : undefined,
        inactiveOnly: listMode === 'repescagem' || values.withoutActionOnly || undefined,
      }),
    );
  };

  const handleClearFilters = () => {
    setFilterValues(initialFilterValues);
    setFiltersOpen(false);
    fetchClients({
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      search: searchTerm || undefined,
      sortBy: clientsSort.sortBy,
      sortOrder: clientsSort.sortOrder,
      inactiveOnly: listMode === 'repescagem' ? true : undefined,
      minDaysWithoutAction: listMode === 'repescagem' ? DEFAULT_INACTIVE_DAYS : undefined,
    });
  };

  const usersById = useMemo(
    () => new Map(usersList.map((u) => [u.id, u.name])),
    [usersList],
  );

  const activeFilterCount = countActiveFilters(filterValues, listMode, appliedSearchTerm);
  const activeFilterChips = getActiveFilterChips(filterValues, listMode, usersById, appliedSearchTerm);

  const removeFilterChip = (key: (typeof activeFilterChips)[number]['key']) => {
    if (key === 'search') {
      setSearchTerm('');
      setAppliedSearchTerm('');
      fetchClients(buildParams({ page: 1, search: undefined }));
      return;
    }
    const next = { ...filterValues };
    if (key === 'withoutActionOnly') {
      next.withoutActionOnly = false;
    } else if (key === 'dateFrom') {
      next.dateFrom = '';
      next.dateTo = '';
    } else if (key === 'createdAtFrom') {
      next.createdAtFrom = '';
      next.createdAtTo = '';
    } else {
      next[key] = '' as never;
    }
    setFilterValues(next);
    fetchClients(
      buildParams({
        page: 1,
        search: searchTerm || undefined,
        company: next.company || undefined,
        cpfCnpj: next.cpfCnpj || undefined,
        email: next.email || undefined,
        phone: next.phone || undefined,
        createdAtFrom: next.createdAtFrom || undefined,
        createdAtTo: next.createdAtTo || undefined,
        city: next.city || undefined,
        responsibleUserId: next.responsibleUserId || undefined,
        dateFrom: next.dateFrom || undefined,
        dateTo: next.dateTo || undefined,
        minDaysWithoutAction:
          listMode === 'repescagem'
            ? DEFAULT_INACTIVE_DAYS
            : next.withoutActionOnly
              ? Number.parseInt(next.minDaysWithoutAction, 10) || DEFAULT_INACTIVE_DAYS
              : next.minDaysWithoutAction
                ? Number.parseInt(next.minDaysWithoutAction, 10)
                : undefined,
        inactiveOnly: listMode === 'repescagem' || next.withoutActionOnly || undefined,
      }),
    );
  };

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Cliente',
        sortKey: 'name',
        pin: 'left' as const,
        width: 220,
        render: (row: Lead) => (
          <div>
            <p className="font-semibold text-gray-900">{row.name}</p>
            {row.company && <p className="text-xs text-gray-500">{row.company}</p>}
          </div>
        ),
      },
      {
        key: 'cpfCnpj',
        label: 'CPF/CNPJ',
        sortKey: 'cpfCnpj',
        render: (row: Lead) => <span className="text-sm text-gray-700">{row.cpfCnpj || '-'}</span>,
      },
      {
        key: 'city',
        label: 'Cidade',
        sortKey: 'city',
        render: (row: Lead) => <span className="text-sm text-gray-600">{row.city || '-'}</span>,
      },
      {
        key: 'ramo',
        label: 'Ramo',
        sortKey: 'ramo',
        render: (row: Lead) => <span className="text-sm text-gray-600">{row.ramo || '-'}</span>,
      },
      {
        key: 'responsible',
        label: 'Responsável',
        render: (row: Lead) =>
          row.responsibleUser ? (
            <div className="flex items-center gap-2">
              <UserAvatar
                name={row.responsibleUser.name}
                initials={row.responsibleUser.avatarInitials}
                avatarUrl={row.responsibleUser.avatarUrl}
                size="xs"
              />
              <span className="text-sm text-gray-700">{row.responsibleUser.name}</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          ),
      },
      {
        key: 'lastAction',
        label: 'Última ação',
        sortKey: 'lastActionAt',
        render: (row: Lead) => (
          <span className="text-sm text-gray-500">
            {row.lastActionAt ? formatDate(row.lastActionAt) : formatDate(row.lastContactDate)}
          </span>
        ),
      },
      {
        key: 'daysWithoutAction',
        label: 'Dias s/ ação',
        render: (row: Lead) => {
          const days = row.daysWithoutAction;
          if (days == null) return <span className="text-sm text-gray-400">-</span>;
          const warn = days >= DEFAULT_INACTIVE_DAYS;
          return (
            <span
              className={`inline-flex items-center gap-1 text-sm font-medium ${warn ? 'text-amber-800' : 'text-gray-600'}`}
            >
              {warn && <span className="sr-only">Atenção: </span>}
              {days}d
              {warn && (
                <span className="text-xs font-normal text-amber-700" aria-hidden>
                  · repescagem
                </span>
              )}
            </span>
          );
        },
      },
      {
        key: 'phone',
        label: 'Telefone',
        sortKey: 'phone',
        render: (row: Lead) => <span className="text-sm text-gray-600">{formatPhone(row.phone)}</span>,
      },
      {
        key: 'actions',
        label: '',
        align: 'right' as const,
        sortable: false,
        pin: 'right' as const,
        width: 56,
        render: (row: Lead) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (row.id) navigate(getClientDetailPath(row.id));
            }}
            className="p-2 text-salesforce-blue hover:bg-salesforce-blue/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-salesforce-blue/30"
            aria-label={`Ver detalhes de ${row.name}`}
          >
            <ChevronRight size={20} aria-hidden />
          </button>
        ),
      },
    ],
    [navigate],
  );

  if (error && !isLoading && clients.length === 0) {
    const retryParams = lastParams ?? buildParams({ page: 1, limit: DEFAULT_PAGE_SIZE });
    return (
      <div className="space-y-6">
        <CadastralListFetchError
          title="Não foi possível carregar os clientes"
          message={error}
          onRetry={() => fetchClients(retryParams)}
        />
      </div>
    );
  }

  if (isLoading && clients.length === 0) {
    return <TablePageSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCheck size={28} className="text-salesforce-blue" />
            Clientes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {listMode === 'active'
              ? 'Clientes ativos com acompanhamento comercial'
              : `Repescagem — sem contato há ${DEFAULT_INACTIVE_DAYS}+ dias`}
          </p>
        </div>
        {createClientAction.allowed ? (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-salesforce-blue text-white rounded-lg text-sm font-medium hover:bg-salesforce-hover"
          >
            <Plus size={16} />
            Novo cliente
          </button>
        ) : (
          <button
            type="button"
            disabled
            title="Você não tem permissão para cadastrar clientes"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
          >
            <Plus size={16} />
            Novo cliente
          </button>
        )}
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Modo da lista de clientes">
        <button
          type="button"
          role="tab"
          aria-selected={listMode === 'active'}
          onClick={() => setListMode('active')}
          className={`px-4 py-2 text-sm font-medium rounded-lg border ${
            listMode === 'active'
              ? 'bg-salesforce-blue text-white border-salesforce-blue'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Ativos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={listMode === 'repescagem'}
          onClick={() => setListMode('repescagem')}
          className={`px-4 py-2 text-sm font-medium rounded-lg border ${
            listMode === 'repescagem'
              ? 'bg-amber-600 text-white border-amber-600'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Repescagem
        </button>
      </div>

      {listMode === 'repescagem' && (
        <p className="text-xs text-gray-500 -mt-2">
          Clientes sem contato há {DEFAULT_INACTIVE_DAYS}+ dias. Use filtros adicionais para refinar a fila.
        </p>
      )}

      <ClientsHelpPanel variant="list" />

      {error && clients.length > 0 && (
        <CadastralListFetchError
          title="Não foi possível atualizar a lista"
          message={error}
          onRetry={() => fetchClients(lastParams ?? buildParams({ page: clientsPagination.page }))}
          className="mb-0"
        />
      )}

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col gap-3 bg-gray-50/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <CadastralListSearch
              id="clients-list-search"
              value={searchTerm}
              onChange={setSearchTerm}
              onSubmitSearch={handleSearch}
              showSubmitButton
              submitButtonLabel="Buscar"
              placeholder="Buscar por nome do cliente (/)"
              aria-label="Buscar clientes"
            />
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20 transition-colors"
              aria-label={
                activeFilterCount > 0
                  ? `Abrir filtros (${activeFilterCount} ativos)`
                  : 'Abrir filtros'
              }
            >
              <Filter size={18} aria-hidden />
              Filtros
              {activeFilterCount > 0 && (
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-salesforce-blue px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Filtros ativos:</span>
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => removeFilterChip(chip.key)}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-salesforce-blue/20"
                  aria-label={`Remover filtro ${chip.label}`}
                >
                  {chip.label}
                  <X size={12} aria-hidden />
                </button>
              ))}
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-medium text-salesforce-blue hover:underline"
              >
                Limpar todos
              </button>
            </div>
          )}
        </div>

        <DataTable<Lead>
          columns={columns}
          data={clients}
          pagination={clientsPagination}
          sortBy={clientsSort.sortBy}
          sortOrder={clientsSort.sortOrder}
          onSort={handleSort}
          onPageChange={handlePageChange}
          isLoading={isLoading}
          emptyMessage={
            listMode === 'repescagem'
              ? activeFilterCount > 0
                ? 'Nenhum cliente na repescagem com os filtros aplicados. Tente limpar filtros.'
                : 'Nenhum cliente na fila de repescagem.'
              : activeFilterCount > 0
                ? 'Nenhum cliente encontrado com os filtros aplicados. Tente limpar filtros.'
                : 'Nenhum cliente encontrado.'
          }
          rowKey={(row) => row.id}
          onRowClick={(row) => row.id && navigate(getClientDetailPath(row.id))}
        />
      </div>

      <ClientsFilterSidebar
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filterValues}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        listMode={listMode}
      />

      <ClientFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          toast.success('Cliente criado.');
          fetchClients(buildParams({ page: 1 }));
        }}
      />
    </div>
  );
};
