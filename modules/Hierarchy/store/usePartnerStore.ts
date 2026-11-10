import { create } from 'zustand';
import toast from 'react-hot-toast';
import { Imobiliaria, Lead, PaginationParams, PaginatedResponse, SortOrder } from '../../../types';
import { api } from '../../../lib/axios';
import { buildPaginationParams } from '../../../utils/apiParams';
import { getApiErrorMessage } from '../../../lib/api-error';
import type { CreatedAccessCredentials } from '../../../lib/access-credentials-message';

export type CreatePartnerResult =
  | { success: true; portalAccess: CreatedAccessCredentials | null }
  | { success: false };

export interface PartnerPerformancePoint {
  month: string;
  deals: number;
  revenue: number;
}

export interface PartnerSummary {
  totalClients: number;
  totalDeals: number;
  totalRevenue: number;
  commissionRate?: number;
  estimatedCommission?: number;
}

interface PartnerState {
  partners: Imobiliaria[];
  isLoading: boolean;
  partnersFetchError: string | null;
  partnerClients: Lead[];
  partnerClientsPagination: { page: number; limit: number; total: number; totalPages: number };
  partnerClientsSort: { sortBy?: string; sortOrder?: SortOrder };
  partnerPerformance: PartnerPerformancePoint[];
  partnerSummary: PartnerSummary | null;
  currentPartnerId: string | null;
  fetchPartners: () => Promise<void>;
  fetchPartnerClients: (partnerId: string, params?: PaginationParams & { dateFrom?: string; dateTo?: string }) => Promise<void>;
  fetchPartnerPerformance: (partnerId: string, params?: { dateFrom?: string; dateTo?: string }) => Promise<void>;
  fetchPartnerSummary: (partnerId: string, params?: { dateFrom?: string; dateTo?: string }) => Promise<void>;
  createPartner: (partner: Partial<Imobiliaria>) => Promise<CreatePartnerResult>;
  updatePartner: (id: string, partner: Partial<Imobiliaria>) => Promise<void>;
  setPartnerActive: (id: string, active: boolean) => Promise<boolean>;
  updatePartnerPortalPassword: (id: string, password: string) => Promise<boolean>;
  deletePartner: (id: string) => Promise<void>;
}

export const usePartnerStore = create<PartnerState>((set) => ({
  partners: [],
  isLoading: false,
  partnersFetchError: null,
  partnerClients: [],
  partnerClientsPagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  partnerClientsSort: { sortBy: 'id', sortOrder: SortOrder.DESC },
  partnerPerformance: [],
  partnerSummary: null,
  currentPartnerId: null,

  fetchPartners: async () => {
    set({ isLoading: true, partnersFetchError: null });
    try {
      const response = await api.get('/partners');
      set({ partners: response.data, isLoading: false, partnersFetchError: null });
    } catch (error) {
      console.error('Error fetching partners', error);
      set({
        isLoading: false,
        partnersFetchError: getApiErrorMessage(error, 'Não foi possível carregar os parceiros. Tente novamente.'),
      });
    }
  },

  fetchPartnerClients: async (partnerId, params) => {
    try {
      const paginationParams: PaginationParams = {
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
        sortBy: params?.sortBy ?? 'id',
        sortOrder: params?.sortOrder ?? SortOrder.DESC,
      };
      const q = new URLSearchParams(buildPaginationParams(paginationParams)).toString();
      const extra: string[] = [];
      if (params?.dateFrom) extra.push(`dateFrom=${params.dateFrom}`);
      if (params?.dateTo) extra.push(`dateTo=${params.dateTo}`);
      const url = `/partners/${partnerId}/clients?${q}${extra.length ? '&' + extra.join('&') : ''}`;
      const response = await api.get<PaginatedResponse<Lead>>(url);
      const { data, page, limit, total, totalPages } = response.data;
      set({
        partnerClients: data,
        partnerClientsPagination: { page, limit, total, totalPages },
        partnerClientsSort: { sortBy: paginationParams.sortBy, sortOrder: paginationParams.sortOrder },
        currentPartnerId: partnerId,
      });
    } catch (error) {
      console.error('Error fetching partner clients', error);
      set({ partnerClients: [], partnerClientsPagination: { page: 1, limit: 10, total: 0, totalPages: 0 }, currentPartnerId: partnerId });
    }
  },

  fetchPartnerPerformance: async (partnerId, params) => {
    try {
      const query = new URLSearchParams();
      if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
      if (params?.dateTo) query.set('dateTo', params.dateTo);
      const qs = query.toString();
      const url = qs ? `/partners/${partnerId}/performance?${qs}` : `/partners/${partnerId}/performance`;
      const response = await api.get<PartnerPerformancePoint[]>(url);
      set({ partnerPerformance: response.data });
    } catch (error) {
      console.error('Error fetching partner performance', error);
      set({ partnerPerformance: [] });
    }
  },

  fetchPartnerSummary: async (partnerId, params) => {
    try {
      const query = new URLSearchParams();
      if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
      if (params?.dateTo) query.set('dateTo', params.dateTo);
      const qs = query.toString();
      const url = qs ? `/partners/${partnerId}/summary?${qs}` : `/partners/${partnerId}/summary`;
      const response = await api.get<PartnerSummary>(url);
      set({ partnerSummary: response.data });
    } catch (error) {
      console.error('Error fetching partner summary', error);
      set({ partnerSummary: null });
    }
  },

  createPartner: async (partner) => {
    try {
      const response = await api.post<
        Imobiliaria & {
          portalAccess?: CreatedAccessCredentials;
        }
      >('/partners', partner);
      const { portalAccess, ...rest } = response.data;
      set((state) => ({ partners: [...state.partners, rest as Imobiliaria] }));
      toast.success('Parceiro cadastrado com sucesso');
      return { success: true, portalAccess: portalAccess ?? null };
    } catch (error) {
      console.error('Error creating partner', error);
      toast.error(
        getApiErrorMessage(error, 'Erro ao cadastrar parceiro. Tente novamente.'),
      );
      return { success: false };
    }
  },

  updatePartner: async (id, partner) => {
    try {
      const response = await api.put(`/partners/${id}`, partner);
      set((state) => ({
        partners: state.partners.map(p => p.id === id ? response.data : p)
      }));
      toast.success('Parceiro atualizado com sucesso');
    } catch (error) {
      console.error('Error updating partner', error);
      toast.error(getApiErrorMessage(error, 'Erro ao atualizar parceiro. Tente novamente.'));
    }
  },

  setPartnerActive: async (id, active) => {
    try {
      const response = await api.put(`/partners/${id}`, { active });
      set((state) => ({
        partners: state.partners.map(p => p.id === id ? response.data : p)
      }));
      toast.success(active ? 'Parceiro ativado com sucesso' : 'Parceiro inativado com sucesso');
      return true;
    } catch (error) {
      console.error('Error updating partner active status', error);
      toast.error(getApiErrorMessage(error, 'Erro ao atualizar status do parceiro. Tente novamente.'));
      return false;
    }
  },

  updatePartnerPortalPassword: async (id, password) => {
    try {
      await api.put(`/partners/${id}/portal-password`, { password });
      toast.success('Senha do portal do parceiro alterada com sucesso');
      return true;
    } catch (error) {
      console.error('Error updating partner portal password', error);
      toast.error(
        getApiErrorMessage(error, 'Não foi possível alterar a senha. Tente novamente.'),
      );
      return false;
    }
  },

  deletePartner: async (id) => {
    try {
        await api.delete(`/partners/${id}`);
        set((state) => ({
          partners: state.partners.filter(p => p.id !== id),
          ...(state.currentPartnerId === id
            ? { partnerClients: [], partnerPerformance: [], partnerSummary: null, currentPartnerId: null }
            : {}),
        }));
    } catch (error) {
        console.error('Error deleting partner', error);
    }
  }
}));
