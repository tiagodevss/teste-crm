import { create } from 'zustand';
import toast from 'react-hot-toast';
import {
  Lead,
  Campaign,
  PaginationParams,
  PaginatedResponse,
  SortOrder,
  LeadsDashboardSnapshot,
  FetchLeadsDashboardParams,
} from '../../../types';
import { buildLeadFilterQuery, type LeadFilterQuery } from '../../../lib/lead-query';
import { api } from '../../../lib/axios';
import { buildPaginationParams } from '../../../utils/apiParams';
import { getApiErrorMessage } from '../../../lib/api-error';

interface FetchLeadsParams extends PaginationParams {
  search?: string;
  pipeId?: string;
  status?: string;
  stage?: string;
  origin?: string;
  sourceSubtype?: string;
  campaignId?: string;
  partnerId?: string;
  productId?: string;
  clientWms?: 'yes' | 'no';
  dateField?: 'createdAt' | 'lastContactDate' | 'importDate';
  hasImportDate?: boolean;
  dateFrom?: string;
  dateTo?: string;
  ownerUserId?: string;
  labelId?: string;
  slaStatus?: string;
}

export type FetchLeadsForStageParams = FetchLeadsParams & { stage: string };

export interface CampaignAnalytics {
  chartData: { date: string; leads: number; sales: number }[];
  funnelData: { name: string; value: number; fill: string }[];
}

export interface CRMSummary {
  total: number;
  opportunities: number;
}

interface CRMState {
  leads: Lead[];
  leadsPagination: { page: number; limit: number; total: number; totalPages: number };
  leadsSort: { sortBy?: string; sortOrder?: SortOrder };
  lastLeadsParams: FetchLeadsParams | null;
  crmSummary: CRMSummary | null;
  campaigns: Campaign[];
  campaignsPagination: { page: number; limit: number; total: number; totalPages: number };
  campaignsSort: { sortBy?: string; sortOrder?: SortOrder };
  campaignLeads: Lead[];
  campaignLeadsPagination: { page: number; limit: number; total: number; totalPages: number };
  campaignLeadsSort: { sortBy?: string; sortOrder?: SortOrder };
  lastCampaignLeadsParams: ({ campaignId: string } & PaginationParams) | null;
  campaignAnalytics: CampaignAnalytics | null;
  leadsDashboard: LeadsDashboardSnapshot | null;
  leadsDashboardLoading: boolean;
  isLoading: boolean;
  leadsFetchError: string | null;
  campaignsLoading: boolean;
  campaignsFetchError: string | null;
  fetchLeads: (params?: FetchLeadsParams) => Promise<void>;
  fetchLeadById: (id: string) => Promise<Lead | null>;
  fetchLeadsForStage: (params: FetchLeadsForStageParams) => Promise<PaginatedResponse<Lead>>;
  fetchCRMSummary: (params: LeadFilterQuery & { pipeId: string }) => Promise<void>;
  fetchCampaigns: (
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      activeOnly?: boolean;
      sortBy?: string;
      sortOrder?: SortOrder;
    },
  ) => Promise<void>;
  fetchCampaignLeads: (campaignId: string, params?: PaginationParams & { search?: string; status?: string; pipeId?: string }) => Promise<void>;
  fetchCampaignAnalytics: (campaignId: string) => Promise<void>;
  fetchLeadsDashboard: (params: FetchLeadsDashboardParams) => Promise<void>;
  createLead: (lead: Partial<Lead>) => Promise<Lead>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<Lead>;

  createCampaign: (campaign: Partial<Campaign>) => Promise<void>;
  updateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
}

let summaryRequestId = 0;

export const useCRMStore = create<CRMState>((set, get) => ({
  leads: [],
  leadsPagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  leadsSort: { sortBy: 'id', sortOrder: SortOrder.DESC },
  lastLeadsParams: null,
  crmSummary: null,
  campaigns: [],
  campaignsPagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
  campaignsSort: { sortBy: 'createdAt', sortOrder: SortOrder.DESC },
  campaignLeads: [],
  campaignLeadsPagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  campaignLeadsSort: { sortBy: 'id', sortOrder: SortOrder.DESC },
  lastCampaignLeadsParams: null,
  campaignAnalytics: null,
  leadsDashboard: null,
  leadsDashboardLoading: false,
  isLoading: false,
  leadsFetchError: null,
  campaignsLoading: false,
  campaignsFetchError: null,

  fetchLeadById: async (id) => {
    try {
      const response = await api.get<Lead>(`/lead/${id}`);
      return response.data;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const ax = error as { response?: { status?: number } };
        if (ax.response?.status === 404) return null;
      }
      console.error('Failed to fetch lead by id', error);
      return null;
    }
  },

  fetchLeads: async (params) => {
    set({ isLoading: true, leadsFetchError: null });
    try {
      const paginationParams: PaginationParams = {
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
        sortBy: params?.sortBy ?? 'id',
        sortOrder: params?.sortOrder ?? SortOrder.DESC,
      };
      const q = new URLSearchParams(buildPaginationParams(paginationParams)).toString();
      const filters = buildLeadFilterQuery(params);
      const url = `/leads?${q}&${filters.toString()}`;
      const response = await api.get<PaginatedResponse<Lead>>(url);
      const { data, page, limit, total, totalPages } = response.data;
      set({
        leads: data,
        leadsPagination: { page, limit, total, totalPages },
        leadsSort: { sortBy: paginationParams.sortBy, sortOrder: paginationParams.sortOrder },
        lastLeadsParams: params ?? null,
        isLoading: false,
        leadsFetchError: null,
      });
    } catch (error) {
      console.error('Failed to fetch leads', error);
      set({
        isLoading: false,
        leadsFetchError: getApiErrorMessage(error, 'Erro ao carregar leads.'),
      });
    }
  },

  fetchLeadsForStage: async (params) => {
    const paginationParams: PaginationParams = {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      sortBy: params.sortBy ?? 'createdAt',
      sortOrder: params.sortOrder ?? SortOrder.DESC,
    };
    const q = new URLSearchParams(buildPaginationParams(paginationParams)).toString();
    const filters = buildLeadFilterQuery(params);
    const url = `/leads?${q}&${filters.toString()}`;
    const response = await api.get<PaginatedResponse<Lead>>(url);
    return response.data;
  },

  fetchCRMSummary: async (params) => {
    const requestId = ++summaryRequestId;
    try {
      const q = buildLeadFilterQuery(params);
      const url = `/leads/summary?${q.toString()}`;
      const response = await api.get<CRMSummary>(url);
      if (requestId === summaryRequestId) set({ crmSummary: response.data });
    } catch (error) {
      console.error('Failed to fetch CRM summary', error);
      if (requestId === summaryRequestId) set({ crmSummary: null });
    }
  },

  fetchCampaigns: async (params) => {
    set({ campaignsLoading: true, campaignsFetchError: null });
    try {
      const currentSort = get().campaignsSort;
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 12;
      const sortBy = params?.sortBy ?? currentSort.sortBy ?? 'createdAt';
      const sortOrder = params?.sortOrder ?? currentSort.sortOrder ?? SortOrder.DESC;
      const q = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });
      if (params?.search) q.set('search', params.search);
      if (params?.status) q.set('status', params.status);
      if (params?.activeOnly) q.set('activeOnly', 'true');
      const response = await api.get<PaginatedResponse<Campaign>>(`/campaigns?${q}`);
      const { data, page: pg, limit: lm, total, totalPages } = response.data;
      set({
        campaigns: data,
        campaignsPagination: { page: pg, limit: lm, total, totalPages },
        campaignsSort: { sortBy, sortOrder },
        campaignsLoading: false,
        campaignsFetchError: null,
      });
    } catch (error) {
      console.error('Failed to fetch campaigns', error);
      set({
        campaignsLoading: false,
        campaignsFetchError: getApiErrorMessage(
          error,
          'Não foi possível carregar as campanhas. Tente novamente.',
        ),
      });
    }
  },

  fetchCampaignLeads: async (campaignId, params) => {
    try {
      const paginationParams: PaginationParams = {
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
        sortBy: params?.sortBy ?? 'id',
        sortOrder: params?.sortOrder ?? SortOrder.DESC,
      };
      const q = new URLSearchParams(buildPaginationParams(paginationParams)).toString();
      const extra: string[] = [];
      if (params?.search) extra.push(`search=${encodeURIComponent(params.search)}`);
      if (params?.status) extra.push(`status=${params.status}`);
      if (params?.pipeId) extra.push(`pipeId=${params.pipeId}`);
      const url = `/campaigns/${campaignId}/leads?${q}${extra.length ? '&' + extra.join('&') : ''}`;
      const response = await api.get<PaginatedResponse<Lead>>(url);
      const { data, page, limit, total, totalPages } = response.data;
      set({
        campaignLeads: data,
        campaignLeadsPagination: { page, limit, total, totalPages },
        campaignLeadsSort: { sortBy: paginationParams.sortBy, sortOrder: paginationParams.sortOrder },
        lastCampaignLeadsParams: params ? { campaignId, ...params } : null,
      });
    } catch (error) {
      console.error('Failed to fetch campaign leads', error);
      set({ campaignLeads: [], campaignLeadsPagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
    }
  },

  fetchCampaignAnalytics: async (campaignId) => {
    set({ campaignAnalytics: null });
    try {
      const response = await api.get<CampaignAnalytics>(`/campaigns/${campaignId}/analytics`);
      set({ campaignAnalytics: response.data });
    } catch (error) {
      console.error('Failed to fetch campaign analytics', error);
      set({ campaignAnalytics: null });
    }
  },

  fetchLeadsDashboard: async (params) => {
    set({ leadsDashboardLoading: true });
    try {
      const q = new URLSearchParams();
      q.set('view', params.view);
      if (params.dateFrom) q.set('dateFrom', params.dateFrom);
      if (params.dateTo) q.set('dateTo', params.dateTo);
      if (params.pipeId) q.set('pipeId', params.pipeId);
      if (params.unitPipeId) q.set('unitPipeId', params.unitPipeId);
      if (params.funnelPipeId) q.set('funnelPipeId', params.funnelPipeId);
      if (params.unitView) q.set('unitView', params.unitView);
      if (params.businessUnit) q.set('businessUnit', params.businessUnit);
      if (params.ownerUserId) q.set('ownerUserId', params.ownerUserId);
      if (params.dashboardScope) q.set('dashboardScope', params.dashboardScope);
      if (params.serviceUnit) q.set('serviceUnit', params.serviceUnit);
      if (params.productId) q.set('productId', params.productId);
      const response = await api.get<LeadsDashboardSnapshot>(`/leads/dashboard?${q.toString()}`);
      set({ leadsDashboard: response.data });
    } catch (error) {
      console.error('Failed to fetch leads dashboard', error);
      set({ leadsDashboard: null });
    } finally {
      set({ leadsDashboardLoading: false });
    }
  },

  createLead: async (lead) => {
    try {
      const response = await api.post<Lead>('/leads', lead);
      const state = get();
      const p = state.lastLeadsParams;
      state.fetchLeads(p ?? {
        page: state.leadsPagination.page,
        limit: state.leadsPagination.limit,
        sortBy: state.leadsSort.sortBy,
        sortOrder: state.leadsSort.sortOrder,
      });
      toast.success('Lead criado e adicionado ao funil.');
      return response.data;
    } catch (error) {
      console.error('Failed to create lead', error);
      toast.error(getApiErrorMessage(error, 'Erro ao criar lead. Tente novamente.'));
      throw error;
    }
  },

  updateLead: async (id, updates) => {
    try {
      let remainingUpdates: Partial<Lead> = updates;
      if (updates.comments !== undefined) {
        const comments = Array.isArray(updates.comments) ? updates.comments : [];
        const appended = comments[comments.length - 1];
        const text = appended?.text?.trim();
        if (!text) throw new Error('Comentário inválido.');
        await api.post(`/leads/${id}/comments`, { text });
        const {
          comments: _comments,
          lastContactDate: _lastContactDate,
          ...rest
        } = updates;
        remainingUpdates = rest;
      }

      if (Object.keys(remainingUpdates).length > 0) {
        const response = await api.put<Lead>(`/leads/${id}`, remainingUpdates);
        const state = get();
        const p = state.lastLeadsParams;
        state.fetchLeads(p ?? {
          page: state.leadsPagination.page,
          limit: state.leadsPagination.limit,
          sortBy: state.leadsSort.sortBy,
          sortOrder: state.leadsSort.sortOrder,
        });
        return response.data;
      }

      const state = get();
      const p = state.lastLeadsParams;
      state.fetchLeads(p ?? {
        page: state.leadsPagination.page,
        limit: state.leadsPagination.limit,
        sortBy: state.leadsSort.sortBy,
        sortOrder: state.leadsSort.sortOrder,
      });
      return updates as Lead;
    } catch (error) {
      console.error('Failed to update lead', error);
      toast.error(getApiErrorMessage(error, 'Erro ao atualizar lead. Tente novamente.'));
      throw error;
    }
  },

  createCampaign: async (campaign) => {
      try {
          const response = await api.post('/campaigns', campaign);
          set((state) => ({ campaigns: [...state.campaigns, response.data] }));
          toast.success('Campanha criada com sucesso.');
      } catch (error) {
          console.error('Failed to create campaign', error);
          toast.error(getApiErrorMessage(error, 'Erro ao criar campanha. Tente novamente.'));
      }
  },

  updateCampaign: async (id, updates) => {
      try {
          const response = await api.put(`/campaigns/${id}`, updates);
          set((state) => ({
              campaigns: state.campaigns.map(c => c.id === id ? response.data : c)
          }));
          toast.success('Campanha atualizada com sucesso.');
      } catch (error) {
          console.error('Failed to update campaign', error);
          toast.error(getApiErrorMessage(error, 'Erro ao atualizar campanha. Tente novamente.'));
      }
  },

  deleteCampaign: async (id) => {
      try {
          await api.delete(`/campaigns/${id}`);
          set((state) => ({ campaigns: state.campaigns.filter(c => c.id !== id) }));
          toast.success('Campanha excluída com sucesso.');
      } catch (error) {
          console.error('Failed to delete campaign', error);
          toast.error(getApiErrorMessage(error, 'Erro ao excluir campanha. Tente novamente.'));
      }
  }
}));
