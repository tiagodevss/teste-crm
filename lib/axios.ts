import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useUserStore } from '../modules/Login/store/useUserStore';
import { buildLoginUrlWithCurrentLocation } from '../routes';
import { constants } from '../config/constants';

export const API_BASE_URL = constants.api.baseUrl;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const { refreshToken, setTokens, logout } = useUserStore.getState();
  if (!refreshToken) {
    await logout();
    if (typeof window !== 'undefined') {
      window.location.href = buildLoginUrlWithCurrentLocation();
    }
    return false;
  }
  try {
    const response = await axios.post<{ accessToken: string; refreshToken: string; expiresIn: number }>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } }
    );
    const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;
    setTokens(accessToken, newRefreshToken, expiresIn);
    return true;
  } catch {
    await logout();
    if (typeof window !== 'undefined') {
      window.location.href = buildLoginUrlWithCurrentLocation();
    }
    return false;
  }
}

function getOrRunRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshTokens().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = useUserStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry) {
      const isAuthEndpoint =
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/logout');
      if (isAuthEndpoint) {
        return Promise.reject(error);
      }
      originalRequest._retry = true;
      const refreshed = await getOrRunRefresh();
      if (refreshed) {
        const newToken = useUserStore.getState().accessToken;
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      }
    }
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export function requestTokenRefresh(): Promise<boolean> {
  return getOrRunRefresh();
}

export function cancelPendingRefresh(): void {
  refreshPromise = null;
}
