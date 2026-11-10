import { create } from 'zustand';
import toast from 'react-hot-toast';
import { LeadLabel } from '../../../types';
import { api } from '../../../lib/axios';

interface LeadLabelsState {
  /** Catálogo de labels por pipe (chave = pipeId) */
  labelsByPipe: Record<string, LeadLabel[]>;
  isLoading: boolean;

  fetchLabelsByPipe: (pipeId: string) => Promise<LeadLabel[]>;
  createLabel: (dto: { pipeId: string; name: string; color?: string; sortOrder?: number }) => Promise<LeadLabel>;
  updateLabel: (id: string, dto: { name?: string; color?: string; sortOrder?: number }) => Promise<LeadLabel>;
  deleteLabel: (id: string, pipeId: string) => Promise<void>;

  /** Substitui todos os labels de um lead pelo array de IDs fornecido */
  setLeadLabels: (leadId: string, labelIds: string[]) => Promise<LeadLabel[]>;
  /** Retorna os labels de um lead */
  getLeadLabels: (leadId: string) => Promise<LeadLabel[]>;

  /** Retorna labels padrão de uma etapa */
  fetchStepDefaultLabels: (pipeStepId: string) => Promise<LeadLabel[]>;
  /** Define labels padrão de uma etapa */
  setStepDefaultLabels: (pipeStepId: string, labelIds: string[]) => Promise<void>;
}

export const useLeadLabelsStore = create<LeadLabelsState>((set, get) => ({
  labelsByPipe: {},
  isLoading: false,

  fetchLabelsByPipe: async (pipeId) => {
    try {
      const res = await api.get<LeadLabel[]>('/lead-labels', { params: { pipeId } });
      set((s) => ({ labelsByPipe: { ...s.labelsByPipe, [pipeId]: res.data } }));
      return res.data;
    } catch {
      return get().labelsByPipe[pipeId] ?? [];
    }
  },

  createLabel: async (dto) => {
    const res = await api.post<LeadLabel>('/lead-labels', dto);
    set((s) => ({
      labelsByPipe: {
        ...s.labelsByPipe,
        [dto.pipeId]: [...(s.labelsByPipe[dto.pipeId] ?? []), res.data],
      },
    }));
    toast.success('Label criada');
    return res.data;
  },

  updateLabel: async (id, dto) => {
    const res = await api.put<LeadLabel>(`/lead-labels/${id}`, dto);
    set((s) => {
      const updated = res.data;
      const pipe = updated.pipeId;
      return {
        labelsByPipe: {
          ...s.labelsByPipe,
          [pipe]: (s.labelsByPipe[pipe] ?? []).map((l) => (l.id === id ? updated : l)),
        },
      };
    });
    toast.success('Label atualizada');
    return res.data;
  },

  deleteLabel: async (id, pipeId) => {
    await api.delete(`/lead-labels/${id}`);
    set((s) => ({
      labelsByPipe: {
        ...s.labelsByPipe,
        [pipeId]: (s.labelsByPipe[pipeId] ?? []).filter((l) => l.id !== id),
      },
    }));
    toast.success('Label inativada');
  },

  setLeadLabels: async (leadId, labelIds) => {
    const res = await api.put<LeadLabel[]>(`/lead-labels/lead/${leadId}`, { labelIds });
    return res.data;
  },

  getLeadLabels: async (leadId) => {
    const res = await api.get<LeadLabel[]>(`/lead-labels/lead/${leadId}`);
    return res.data;
  },

  fetchStepDefaultLabels: async (pipeStepId) => {
    const res = await api.get<LeadLabel[]>(`/lead-labels/step/${pipeStepId}/defaults`);
    return res.data;
  },

  setStepDefaultLabels: async (pipeStepId, labelIds) => {
    await api.put(`/lead-labels/step/${pipeStepId}/defaults`, { labelIds });
    toast.success('Labels padrão da etapa atualizadas');
  },
}));
