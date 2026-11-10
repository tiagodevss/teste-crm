import { create } from 'zustand';
import {
  LeadAppointment,
  PaginatedResponse,
  PaginationParams,
} from '../../../types';
import { api } from '../../../lib/axios';
import { getApiErrorMessage } from '../../../lib/api-error';
import { buildPaginationParams } from '../../../utils/apiParams';

export interface FetchAppointmentsParams extends PaginationParams {
  ownerUserId?: string;
  leadId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  type?: string;
}

export interface CreateAppointmentPayload {
  leadId?: string;
  prospectId?: string;
  ownerUserId: string;
  type: string;
  channel: string;
  scheduledAt: string;
  endsAt?: string;
  notes?: string;
  location?: string;
}

export interface UpdateAppointmentPayload {
  ownerUserId?: string;
  type?: string;
  channel?: string;
  scheduledAt?: string;
  endsAt?: string;
  status?: string;
  notes?: string;
  location?: string;
}

interface ActivitiesState {
  appointments: LeadAppointment[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  isLoading: boolean;
  error: string | null;
  fetchAppointments: (params?: FetchAppointmentsParams) => Promise<void>;
  createAppointment: (payload: CreateAppointmentPayload) => Promise<LeadAppointment | null>;
  updateAppointment: (id: string, payload: UpdateAppointmentPayload) => Promise<LeadAppointment | null>;
  deleteAppointment: (id: string) => Promise<boolean>;
}

function getErrorMessage(error: unknown) {
  return getApiErrorMessage(error, 'Erro ao carregar atividades.', {
    statusWhenNoMessage: {
      403: 'Você não tem permissão para visualizar atividades.',
    },
  });
}

export const useActivitiesStore = create<ActivitiesState>((set) => ({
  appointments: [],
  pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
  isLoading: false,
  error: null,

  fetchAppointments: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const paginationParams: PaginationParams = {
        page: params?.page ?? 1,
        limit: params?.limit ?? 50,
      };
      const q = new URLSearchParams(buildPaginationParams(paginationParams));
      if (params?.ownerUserId) q.set('ownerUserId', params.ownerUserId);
      if (params?.leadId) q.set('leadId', params.leadId);
      if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
      if (params?.dateTo) q.set('dateTo', params.dateTo);
      if (params?.status) q.set('status', params.status);
      if (params?.type) q.set('type', params.type);

      const response = await api.get<PaginatedResponse<LeadAppointment>>(
        `/lead-appointments?${q.toString()}`,
      );
      const { data, page, limit, total, totalPages } = response.data;
      set({
        appointments: data,
        pagination: { page, limit, total, totalPages },
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
        error: getErrorMessage(error),
        isLoading: false,
      });
    }
  },

  createAppointment: async (payload) => {
    try {
      const response = await api.post<LeadAppointment>('/lead-appointments', payload);
      set({ error: null });
      return response.data;
    } catch (error) {
      set({ error: getErrorMessage(error) });
      return null;
    }
  },

  updateAppointment: async (id, payload) => {
    try {
      const response = await api.patch<LeadAppointment>(`/lead-appointments/${id}`, payload);
      set({ error: null });
      return response.data;
    } catch (error) {
      set({ error: getErrorMessage(error) });
      return null;
    }
  },

  deleteAppointment: async (id) => {
    try {
      await api.delete(`/lead-appointments/${id}`);
      return true;
    } catch {
      return false;
    }
  },
}));
