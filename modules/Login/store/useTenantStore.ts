/**
 * Store de configurações públicas do tenant (branding, lista de pipes).
 * Usado antes e após login — GET /settings/public não requer autenticação.
 */
import { create } from 'zustand';
import { api } from '../../../lib/axios';
import { Pipe } from '../../../types';

export interface BrandingConfig {
  appName: string;
  appNameShort: string;
  copyright: string;
  logoUrl?: string;
}

export interface PublicSettingsResponse {
  pipes: Pipe[];
  branding: BrandingConfig;
}

const DEFAULT_BRANDING: BrandingConfig = {
  appName: 'WMS Empresarial',
  appNameShort: 'WMS Admin',
  copyright: 'Tecnologia para Gestão.',
};

interface TenantState {
  pipes: Pipe[];
  branding: BrandingConfig;
  isLoading: boolean;
  loaded: boolean;
  fetchPublicSettings: () => Promise<void>;
}

export const useTenantStore = create<TenantState>((set) => ({
  pipes: [],
  branding: DEFAULT_BRANDING,
  isLoading: false,
  loaded: false,

  fetchPublicSettings: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get<PublicSettingsResponse>('/settings/public');
      set({
        pipes: response.data.pipes ?? [],
        branding: response.data.branding ?? DEFAULT_BRANDING,
        loaded: true,
      });
    } catch (error) {
      console.error('Error fetching public settings', error);
      set({
        pipes: [],
        branding: DEFAULT_BRANDING,
        loaded: true,
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));
