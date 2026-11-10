/**
 * Identidade dos funis financeiros (2. CRÉDITO / 3. REPASSE).
 *
 * Os IDs vêm do servidor (`GET /financeira/settings`), nunca de heurística por nome ou ordem.
 * Enquanto não carregar (ou se o ambiente não estiver parametrizado) nenhum pipe é tratado como
 * financeiro, preservando o comportamento original dos demais funis.
 */
import { create } from 'zustand';
import { useEffect } from 'react';
import { api } from './axios';

export interface FinanceiraSettings {
  creditoPipeId: string;
  repassePipeId: string;
  creditoDefaultProductId: string;
  automaticSiopiRoutingEnabled: boolean;
  whatsappConfigured: boolean;
}

interface FinanceiraSettingsState {
  settings: FinanceiraSettings | null;
  status: 'idle' | 'loading' | 'ready' | 'unavailable';
  load: (force?: boolean) => Promise<void>;
  invalidate: () => void;
}

export const useFinanceiraSettingsStore = create<FinanceiraSettingsState>((set, get) => ({
  settings: null,
  status: 'idle',
  load: async (force = false) => {
    const { status } = get();
    if (!force && (status === 'loading' || status === 'ready' || status === 'unavailable')) return;
    set({ status: 'loading' });
    try {
      const { data } = await api.get<FinanceiraSettings>('/financeira/settings');
      set({ settings: data, status: 'ready' });
    } catch {
      // 403/409/404: usuário sem acesso ou ambiente não parametrizado → comportamento padrão dos pipes.
      set({ settings: null, status: 'unavailable' });
    }
  },
  invalidate: () => set({ status: 'idle' }),
}));

export interface FinanceiraPipeInfo {
  settings: FinanceiraSettings | null;
  isCredito: boolean;
  isRepasse: boolean;
  /** Crédito ou Repasse. */
  isFinanceira: boolean;
}

export function resolveFinanceiraPipeInfo(
  settings: FinanceiraSettings | null,
  pipeId: string | null | undefined,
): FinanceiraPipeInfo {
  const isCredito = Boolean(settings && pipeId && settings.creditoPipeId === pipeId);
  const isRepasse = Boolean(settings && pipeId && settings.repassePipeId === pipeId);
  return { settings, isCredito, isRepasse, isFinanceira: isCredito || isRepasse };
}

/** Carrega (uma vez) as configurações financeiras e informa se o pipe é Crédito/Repasse. */
export function useFinanceiraPipe(pipeId: string | null | undefined): FinanceiraPipeInfo {
  const settings = useFinanceiraSettingsStore((s) => s.settings);
  const load = useFinanceiraSettingsStore((s) => s.load);
  useEffect(() => {
    void load();
  }, [load]);
  return resolveFinanceiraPipeInfo(settings, pipeId);
}

/** Leitura síncrona (fora de componentes). */
export function isFinanceiraOperationalPipe(pipeId: string | null | undefined): boolean {
  return resolveFinanceiraPipeInfo(useFinanceiraSettingsStore.getState().settings, pipeId).isFinanceira;
}
