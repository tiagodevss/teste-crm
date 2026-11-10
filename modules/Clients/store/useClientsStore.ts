import { create } from 'zustand';
import { Lead, PaginationParams, PaginatedResponse, SortOrder } from '../../../types';
import { api } from '../../../lib/axios';
import { getApiErrorMessage } from '../../../lib/api-error';
import { buildPaginationParams } from '../../../utils/apiParams';
import {
  DEFAULT_CLIENTS_LIST_SORT,
  getInitialClientsListSort,
  persistClientsListSort,
} from '../clientsListSortStorage';

export interface FetchClientsParams extends PaginationParams {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  company?: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  city?: string;
  responsibleUserId?: string;
  minDaysWithoutAction?: number;
  inactiveOnly?: boolean;
}

export interface CreateClientPayload {
  name: string;
  company?: string;
  cpfCnpj?: string;
  address?: string;
  phone?: string;
  email?: string;
  city?: string;
  ramo?: string;
  responsibleUserId?: string;
  lastActionAt?: string;
}

export interface UpdateClientPayload extends Partial<CreateClientPayload> {}

interface ClientsState {
  clients: Lead[];
  clientDetail: Lead | null;
  clientsPagination: { page: number; limit: number; total: number; totalPages: number };
  clientsSort: { sortBy?: string; sortOrder?: SortOrder };
  lastParams: FetchClientsParams | null;
  isLoading: boolean;
  isDetailLoading: boolean;
  error: string | null;
  detailError: string | null;
  fetchClients: (params?: FetchClientsParams) => Promise<void>;
  fetchClientById: (id: string) => Promise<Lead | null>;
  createClient: (payload: CreateClientPayload) => Promise<Lead | null>;
  updateClient: (id: string, payload: UpdateClientPayload) => Promise<Lead | null>;
  clearClientDetail: () => void;
}

function getClientsErrorMessage(error: unknown) {
  return getApiErrorMessage(error, 'Erro ao carregar clientes. Tente novamente.', {
    statusWhenNoMessage: {
      401: 'Sessão expirada.',
      403: 'Você não tem permissão para visualizar clientes.',
    },
  });
}

export const useClientsStore = create<ClientsState>((set, get) => ({
  clients: [],
  clientDetail: null,
  clientsPagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  clientsSort: getInitialClientsListSort(),
  lastParams: null,
  isLoading: false,
  isDetailLoading: false,
  error: null,
  detailError: null as string | null,

  fetchClientById: async (id) => {
    set({ isDetailLoading: true, clientDetail: null, detailError: null });
    try {
      const response = await api.get<Lead>(`/clients/${id}`);
      set({ clientDetail: response.data, isDetailLoading: false, detailError: null });
      return response.data;
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        set({ clientDetail: null, isDetailLoading: false, detailError: null });
      } else {
        set({
          clientDetail: null,
          isDetailLoading: false,
          detailError: getClientsErrorMessage(error),
        });
      }
      return null;
    }
  },

  clearClientDetail: () => set({ clientDetail: null, detailError: null }),

  createClient: async (payload) => {
    try {
      const response = await api.post<Lead>('/clients', payload);
      return response.data;
    } catch {
      return null;
    }
  },

  updateClient: async (id, payload) => {
    try {
      const response = await api.patch<Lead>(`/clients/${id}`, payload);
      return response.data;
    } catch {
      return null;
    }
  },

  fetchClients: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const persisted = get().clientsSort;
      const paginationParams: PaginationParams = {
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
        sortBy: params?.sortBy ?? persisted.sortBy ?? DEFAULT_CLIENTS_LIST_SORT.sortBy,
        sortOrder:
          params?.sortOrder ?? persisted.sortOrder ?? DEFAULT_CLIENTS_LIST_SORT.sortOrder,
      };
      const q = new URLSearchParams(buildPaginationParams(paginationParams)).toString();
      const extra: string[] = [];
      if (params?.search) extra.push(`search=${encodeURIComponent(params.search)}`);
      if (params?.dateFrom) extra.push(`dateFrom=${params.dateFrom}`);
      if (params?.dateTo) extra.push(`dateTo=${params.dateTo}`);
      if (params?.company) extra.push(`company=${encodeURIComponent(params.company)}`);
      if (params?.cpfCnpj) extra.push(`cpfCnpj=${encodeURIComponent(params.cpfCnpj)}`);
      if (params?.email) extra.push(`email=${encodeURIComponent(params.email)}`);
      if (params?.phone) extra.push(`phone=${encodeURIComponent(params.phone)}`);
      if (params?.createdAtFrom) extra.push(`createdAtFrom=${params.createdAtFrom}`);
      if (params?.createdAtTo) extra.push(`createdAtTo=${params.createdAtTo}`);
      if (params?.city) extra.push(`city=${encodeURIComponent(params.city)}`);
      if (params?.responsibleUserId) extra.push(`responsibleUserId=${params.responsibleUserId}`);
      if (params?.minDaysWithoutAction != null) {
        extra.push(`minDaysWithoutAction=${params.minDaysWithoutAction}`);
      }
      if (params?.inactiveOnly) extra.push('inactiveOnly=true');
      const url = `/clients?${q}${extra.length ? '&' + extra.join('&') : ''}`;
      const response = await api.get<PaginatedResponse<Lead>>(url);
      const { data, page, limit, total, totalPages } = response.data;
      set({
        clients: data,
        clientsPagination: { page, limit, total, totalPages },
        clientsSort: { sortBy: paginationParams.sortBy, sortOrder: paginationParams.sortOrder },
        lastParams: params ?? null,
        error: null,
        isLoading: false,
      });
      if (paginationParams.sortBy && paginationParams.sortOrder) {
        persistClientsListSort(paginationParams.sortBy, paginationParams.sortOrder);
      }
    } catch (error) {
      console.error('Failed to fetch clients', error);
      const previous = get();
      set({
        clients: previous.clients.length > 0 ? previous.clients : [],
        clientsPagination:
          previous.clients.length > 0
            ? previous.clientsPagination
            : { page: 1, limit: 10, total: 0, totalPages: 0 },
        lastParams: params ?? null,
        error: getClientsErrorMessage(error),
        isLoading: false,
      });
    }
  },
}));
