import { isDemo, DEMO_AUTH_KEY } from '../../../config/demo';

export const AUTH_STORAGE_KEY = isDemo ? DEMO_AUTH_KEY : 'contabil-auth-storage';

// Refresh the access token before it expires to avoid 401 storms.
export const SESSION_REFRESH_BUFFER_MS = 60 * 1000; // 1 minute before expiry.

// Activity heartbeat cadence and inactivity detection threshold.
export const ACTIVITY_HEARTBEAT_INTERVAL_MS = 30 * 1000;
export const ACTIVITY_IDLE_THRESHOLD_MS = 60 * 1000;
