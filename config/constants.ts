import { DEMO_API_PATH, DEMO_BASE_PATH } from './demo';
/** No environment variables or production fallbacks are accepted here. */
const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
export const constants = {
  label: 'Demonstra\u00e7\u00e3o',
  api: {
    baseUrl: `${origin}${DEMO_API_PATH}`,
    authBaseUrl: `${origin}${DEMO_API_PATH}`,
    websocketBaseUrl: `${origin}${DEMO_BASE_PATH}__demo_disabled_ws__`,
  },
  uploads: { baseUrl: `${origin}${DEMO_API_PATH}/files` },
  simulation: { mode: 'mock' as const, allowCritical: true },
};
