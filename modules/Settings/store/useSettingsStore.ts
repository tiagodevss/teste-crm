/**
 * Store de configurações do sistema e fluxo por pipe (Zustand).
 *
 * CONTRATO API:
 * - GET /settings → slaDays, fieldTypes (não persiste mais pipelineFlow/fields/stageFields)
 * - GET /pipes/:id → pipe com steps, actions, fields (fluxo do pipe)
 * - GET /leads/count-by-stage?pipeId=:id → { [stageName]: number }
 */
import { create } from 'zustand';
import { api } from '../../../lib/axios';
import { parseActiveApiFields, parseInactiveApiFields } from '../../../lib/pipe-field-parser';
import {
  PipeId,
  PipelineFlow,
  PipelineFlowByUnit,
  PipelineStageKind,
  PipeDetail,
  PipelineNodeData,
  PipelineEdgeData,
  FieldConfig,
} from '../../../types';

export type LeadCountByStage = Record<string, number>;

interface SettingsState {
  slaDays: number;
  leadCountByStage: Record<string, LeadCountByStage>;
  /** Fluxo (nodes/edges) por pipeId, preenchido por GET /pipes/:id. */
  pipeFlowByPipeId: PipelineFlowByUnit;
  /** Detalhe completo do pipe (steps, actions, fields) para config e formulários. */
  pipeDetailByPipeId: Record<string, PipeDetail>;
  isLoading: boolean;
  settingsLoaded: boolean;
  fetchSettings: () => Promise<void>;
  /** GET /pipes/:id — carrega fluxo e detalhe do pipe e guarda em cache. */
  fetchPipeFlow: (pipeId: PipeId) => Promise<void>;
  /** GET /leads/count-by-stage?pipeId= */
  fetchLeadCountByStage: (pipeId: PipeId) => Promise<void>;
  saveSettings: (data: { slaDays?: number }) => Promise<void>;
  getPipelineStagesOrdered: (pipeId: PipeId) => string[];
  getNextStages: (pipeId: PipeId, currentStageName: string) => string[];
  getNextStageOptions: (pipeId: PipeId, currentStageName: string) => { stageName: string; actionLabel: string; kind?: string; autoExecute?: boolean; actionId?: string }[];
  getStageKind: (pipeId: PipeId, stageName: string) => PipelineStageKind | undefined;
  /** Retorna o PipeDetail em cache (ou undefined se ainda não carregou). */
  getPipeDetail: (pipeId: PipeId) => PipeDetail | undefined;
  /** Campos da etapa (do step) para formulário ao avançar lead. */
  getStageFields: (pipeId: PipeId, stageName: string) => FieldConfig[];
  /** Campos fixos no nível do pipe (cadastro inicial / conversão prospecção). */
  getPipeLevelFields: (pipeId: PipeId) => FieldConfig[];
  /** Definições aposentadas da etapa (somente leitura histórica). */
  getInactiveStageFields: (pipeId: PipeId, stageName: string) => FieldConfig[];
}

function pipeDetailToFlow(detail: PipeDetail): PipelineFlow {
  const nodes: PipelineNodeData[] = detail.steps.map((s) => ({
    id: s.id,
    name: s.name,
    position: { x: s.positionX, y: s.positionY },
    stageKind: (s.stageKind as PipelineStageKind) ?? 'default',
    allowReturnAction: s.allowReturnAction ?? false,
    isActive: s.isActive !== false,
  }));
  const edges: PipelineEdgeData[] = detail.actions.map((a) => {
    const toStep = detail.steps.find((st) => st.id === a.toStepId);
    return {
      id: a.id,
      source: a.fromStepId,
      target: a.toStepId,
      label: a.label ?? toStep?.name,
      kind: a.kind ?? 'manual',
      conditions: a.conditions,
      validators: a.validators,
      autoExecute: a.autoExecute ?? false,
      permissionRules: a.permissionRules,
    };
  });
  return { nodes, edges };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  slaDays: 5,
  leadCountByStage: {},
  pipeFlowByPipeId: {},
  pipeDetailByPipeId: {},
  isLoading: false,
  settingsLoaded: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get<{ slaDays?: number }>('/settings');
      set({
        slaDays: response.data.slaDays ?? 5,
        settingsLoaded: true,
      });
    } catch (error) {
      console.error('Error fetching settings', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPipeFlow: async (pipeId: PipeId) => {
    try {
      const response = await api.get<PipeDetail>(`/pipes/${pipeId}`);
      const detail = response.data;
      const flow = pipeDetailToFlow(detail);
      set((s) => ({
        pipeFlowByPipeId: { ...s.pipeFlowByPipeId, [pipeId]: flow },
        pipeDetailByPipeId: { ...s.pipeDetailByPipeId, [pipeId]: detail },
      }));
    } catch (error) {
      console.error('Error fetching pipe flow', error);
    }
  },

  fetchLeadCountByStage: async (pipeId: PipeId) => {
    try {
      const response = await api.get<LeadCountByStage>(`/leads/count-by-stage?pipeId=${pipeId}`);
      set((s) => ({
        leadCountByStage: {
          ...s.leadCountByStage,
          [pipeId]: response.data ?? {},
        },
      }));
    } catch (error) {
      console.error('Error fetching lead count by stage', error);
    }
  },

  saveSettings: async (data) => {
    try {
      const { slaDays } = get();
      const payload = { slaDays: data.slaDays ?? slaDays };
      const response = await api.put<{ slaDays: number }>('/settings', payload);
      set({ slaDays: response.data.slaDays });
    } catch (error) {
      console.error('Error saving settings', error);
      throw error;
    }
  },

  getPipelineStagesOrdered: (pipeId: PipeId) => {
    const flow = get().pipeFlowByPipeId[pipeId];
    if (flow?.nodes?.length) {
      const sorted = [...flow.nodes].sort(
        (a, b) => a.position.x - b.position.x || a.position.y - b.position.y
      );
      const counts = get().leadCountByStage[pipeId];
      // Etapa descontinuada só aparece enquanto ainda tiver cards (histórico preservado).
      return sorted
        .filter((n) => n.isActive !== false || (counts?.[n.name] ?? 0) > 0)
        .map((n) => n.name);
    }
    return [];
  },

  getNextStages: (pipeId: PipeId, currentStageName: string) => {
    const flow = get().pipeFlowByPipeId[pipeId];
    if (!flow?.nodes?.length || !flow?.edges?.length) return [];
    const node = flow.nodes.find((n) => n.name === currentStageName);
    if (!node) return [];
    const targetIds = flow.edges.filter((e) => e.source === node.id).map((e) => e.target);
    return flow.nodes.filter((n) => targetIds.includes(n.id)).map((n) => n.name);
  },

  getNextStageOptions: (pipeId: PipeId, currentStageName: string) => {
    const flow = get().pipeFlowByPipeId[pipeId];
    if (!flow?.nodes?.length || !flow?.edges?.length) return [];
    const node = flow.nodes.find((n) => n.name === currentStageName);
    if (!node) return [];
    const outEdges = flow.edges.filter((e) => e.source === node.id);
    return outEdges
      .filter((e) => !(e.autoExecute || e.kind === 'automatic'))
      .map((e) => {
        const targetNode = flow.nodes.find((n) => n.id === e.target);
        return {
          stageName: targetNode?.name ?? '',
          actionLabel: (e.label && e.label.trim()) ? e.label.trim() : (targetNode?.name ?? 'Avançar'),
          kind: e.kind,
          autoExecute: e.autoExecute,
          actionId: e.id,
        };
      })
      .filter((o) => o.stageName);
  },

  getStageKind: (pipeId: PipeId, stageName: string): PipelineStageKind | undefined => {
    const flow = get().pipeFlowByPipeId[pipeId];
    const node = flow?.nodes?.find((n) => n.name === stageName);
    return node?.stageKind;
  },

  getPipeDetail: (pipeId: PipeId) => get().pipeDetailByPipeId[pipeId],

  getStageFields: (pipeId: PipeId, stageName: string): FieldConfig[] => {
    const detail = get().pipeDetailByPipeId[pipeId];
    if (!detail) return [];
    const step = detail.steps.find((s) => s.name === stageName);
    return parseActiveApiFields(step?.fields);
  },

  getInactiveStageFields: (pipeId: PipeId, stageName: string): FieldConfig[] => {
    const detail = get().pipeDetailByPipeId[pipeId];
    const step = detail?.steps.find((s) => s.name === stageName);
    return parseInactiveApiFields(step?.fields);
  },

  getPipeLevelFields: (pipeId: PipeId): FieldConfig[] => {
    const detail = get().pipeDetailByPipeId[pipeId];
    return parseActiveApiFields(detail?.fields);
  },
}));
