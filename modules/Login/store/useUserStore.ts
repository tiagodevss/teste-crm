import axios from 'axios';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import toast from 'react-hot-toast';
import { UserProfile, PaginationParams, PaginatedResponse, SortOrder } from '../../../types';
import { api, API_BASE_URL, cancelPendingRefresh, requestTokenRefresh } from '../../../lib/axios';
import { getApiErrorMessage } from '../../../lib/api-error';
import { buildPaginationParams } from '../../../utils/apiParams';
import {
  buildAccessMessageForClient,
  type CreatedAccessCredentials,
} from '../../../lib/access-credentials-message';
import { AUTH_STORAGE_KEY, SESSION_REFRESH_BUFFER_MS } from '../session/sessionPolicy';
import { stopActivityTracking } from '../session/activityTracker';

export type { CreatedAccessCredentials };
export type CreateUserResult =
  | { success: true; credentials: CreatedAccessCredentials | null }
  | { success: false };

export type FetchUsersParams = PaginationParams & { search?: string; excludeRoles?: string; staffOnly?: boolean; includeInactive?: boolean };

export interface LoginResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface UserState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  isLoading: boolean;
  loginError: string | null;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string, expiresIn: number) => void;
  clearLoginError: () => void;
  refreshCurrentUser: () => Promise<void>;

  usersList: UserProfile[];
  usersPagination: { page: number; limit: number; total: number; totalPages: number };
  usersSort: { sortBy?: string; sortOrder?: SortOrder };
  usersLastParams: FetchUsersParams | null;
  usersMutating: boolean;
  usersListLoading: boolean;
  usersFetchError: string | null;
  fetchUsers: (params?: FetchUsersParams) => Promise<void>;
  createUser: (
    user: Partial<UserProfile> & Record<string, unknown>,
  ) => Promise<CreateUserResult>;
  updateUser: (id: string, user: Partial<UserProfile>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  updateMyProfile: (payload: Partial<Pick<UserProfile, 'name' | 'email' | 'avatarInitials' | 'avatarUrl'>> & { password?: string }) => Promise<boolean>;
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

const clearRefreshTimer = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
};

const scheduleRefresh = (expiresAt: number) => {
  clearRefreshTimer();
  const bufferTarget = expiresAt - SESSION_REFRESH_BUFFER_MS;
  const delay = Math.max(bufferTarget - Date.now(), 0);
  if (delay === 0) {
    requestTokenRefresh().catch(() => {});
    return;
  }
  refreshTimer = setTimeout(() => {
    requestTokenRefresh().catch(() => {});
  }, delay);
};

const removeStoredSession = () => {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      isLoading: false,
      loginError: null,
      usersList: [],
      usersPagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      usersSort: { sortBy: 'id', sortOrder: SortOrder.DESC },
      usersLastParams: null,
      usersMutating: false,
      usersListLoading: false,
      usersFetchError: null,

      setTokens: (accessToken, refreshToken, expiresIn) => {
        set({
          accessToken,
          refreshToken,
          expiresAt: Date.now() + expiresIn * 1000,
        });
      },

      clearLoginError: () => set({ loginError: null }),

      refreshCurrentUser: async () => {
        const { accessToken, logout } = get();
        if (!accessToken) return;
        try {
          const response = await api.get<UserProfile>('/auth/me');
          set({ user: response.data });
        } catch (error) {
          console.error('Error refreshing current user', error);
          if (axios.isAxiosError(error) && error.response?.status === 401) {
            await logout();
          }
        }
      },

      login: async (login, password) => {
        set({ isLoading: true, loginError: null });
        try {
          const response = await api.post<LoginResponse>('/auth/login', { login, password });
          const { user, accessToken, refreshToken, expiresIn } = response.data;
          set({
            user,
            accessToken,
            refreshToken,
            expiresAt: Date.now() + expiresIn * 1000,
            isLoading: false,
            loginError: null,
          });
        } catch (error: unknown) {
          console.error(error);
          set({
            isLoading: false,
            loginError: getApiErrorMessage(
              error,
              'Erro ao realizar login. Verifique suas credenciais e tente novamente.',
            ),
          });
        }
      },
      logout: async () => {
        const { refreshToken } = get();
        clearRefreshTimer();
        cancelPendingRefresh();
        await stopActivityTracking({ endSession: true });
        if (refreshToken) {
          try {
            await axios.post(
              `${API_BASE_URL}/auth/logout`,
              { refreshToken },
              { headers: { 'Content-Type': 'application/json' } },
            );
          } catch (error) {
            console.error('Falha ao notificar backend sobre logout', error);
          }
        }
        removeStoredSession();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
        });
      },

      fetchUsers: async (params) => {
        set({ usersListLoading: true, usersFetchError: null });
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
          if (params?.excludeRoles) extra.push(`excludeRoles=${encodeURIComponent(params.excludeRoles)}`);
          if (typeof params?.staffOnly === 'boolean') extra.push(`staffOnly=${params.staffOnly}`);
          if (params?.includeInactive) extra.push('includeInactive=true');
          const extraStr = extra.length ? '&' + extra.join('&') : '';
          const response = await api.get<PaginatedResponse<UserProfile>>(`/users?${q}${extraStr}`);
          const { data, page, limit, total, totalPages } = response.data;
          const lastParams = params ? { ...paginationParams, search: params.search, excludeRoles: params.excludeRoles, staffOnly: params.staffOnly, includeInactive: params.includeInactive } : null;
          set({
            usersList: data,
            usersPagination: { page, limit, total, totalPages },
            usersSort: { sortBy: paginationParams.sortBy, sortOrder: paginationParams.sortOrder },
            usersLastParams: lastParams,
            usersListLoading: false,
            usersFetchError: null,
          });
        } catch (error) {
          console.error('Error fetching users list', error);
          set({
            usersListLoading: false,
            usersFetchError: getApiErrorMessage(error, 'Não foi possível carregar os usuários. Tente novamente.'),
          });
        }
      },

      createUser: async (user) => {
        set({ usersMutating: true });
        try {
          const response = await api.post<
            UserProfile & { generatedPassword?: string }
          >('/users', user);
          const state = get();
          const p = state.usersLastParams;
          await state.fetchUsers(p ?? {
            page: state.usersPagination.page,
            limit: state.usersPagination.limit,
            sortBy: state.usersSort.sortBy,
            sortOrder: state.usersSort.sortOrder,
            search: p?.search,
            excludeRoles: p?.excludeRoles,
            staffOnly: p?.staffOnly,
            includeInactive: p?.includeInactive,
          });
          const gp = response.data.generatedPassword;
          const platformUrl =
            typeof window !== 'undefined' ? window.location.origin : '';
          const credentials: CreatedAccessCredentials | null =
            gp && response.data.email
              ? {
                  email: response.data.email,
                  generatedPassword: gp,
                  platformUrl,
                  messageForClient: buildAccessMessageForClient(
                    platformUrl,
                    response.data.email,
                    gp,
                  ),
                }
              : null;
          toast.success('Usuário criado com sucesso');
          set({ usersMutating: false });
          return { success: true, credentials };
        } catch (error: unknown) {
          set({ usersMutating: false });
          toast.error(getApiErrorMessage(error, 'Erro ao criar usuário. Tente novamente.'));
          return { success: false };
        }
      },

      updateUser: async (id, user) => {
        set({ usersMutating: true });
        try {
          await api.put(`/users/${id}`, user);
          const state = get();
          const p = state.usersLastParams;
          await state.fetchUsers(p ?? {
            page: state.usersPagination.page,
            limit: state.usersPagination.limit,
            sortBy: state.usersSort.sortBy,
            sortOrder: state.usersSort.sortOrder,
            search: p?.search,
            excludeRoles: p?.excludeRoles,
            staffOnly: p?.staffOnly,
            includeInactive: p?.includeInactive,
          });
          toast.success('Usuário atualizado com sucesso');
          set({ usersMutating: false });
          return true;
        } catch (error: unknown) {
          set({ usersMutating: false });
          toast.error(getApiErrorMessage(error, 'Erro ao atualizar usuário. Tente novamente.'));
          return false;
        }
      },

      deleteUser: async (id) => {
        set({ usersMutating: true });
        try {
          await api.delete(`/users/${id}`);
          const state = get();
          const p = state.usersLastParams;
          await state.fetchUsers(p ?? {
            page: state.usersPagination.page,
            limit: state.usersPagination.limit,
            sortBy: state.usersSort.sortBy,
            sortOrder: state.usersSort.sortOrder,
            search: p?.search,
            excludeRoles: p?.excludeRoles,
            staffOnly: p?.staffOnly,
            includeInactive: p?.includeInactive,
          });
          toast.success('Usuário desativado com sucesso');
          set({ usersMutating: false });
          return true;
        } catch (error: unknown) {
          set({ usersMutating: false });
          toast.error(getApiErrorMessage(error, 'Erro ao desativar usuário. Tente novamente.'));
          return false;
        }
      },

      updateMyProfile: async (payload) => {
        set({ usersMutating: true });
        try {
          const response = await api.patch<UserProfile>('/auth/me', payload);
          set({ user: response.data, usersMutating: false });
          toast.success('Perfil atualizado com sucesso');
          return true;
        } catch (error: unknown) {
          set({ usersMutating: false });
          toast.error(getApiErrorMessage(error, 'Não foi possível atualizar o perfil.'));
          return false;
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => window.sessionStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
      }),
    }
  )
);

useUserStore.subscribe(
  (state) => {
    const expiresAt = state.expiresAt;
    if (!expiresAt) {
      clearRefreshTimer();
      return;
    }
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      clearRefreshTimer();
      requestTokenRefresh().catch(() => {});
      return;
    }
    if (remaining <= SESSION_REFRESH_BUFFER_MS) {
      requestTokenRefresh().catch(() => {});
      return;
    }
    scheduleRefresh(expiresAt);
  },
);
