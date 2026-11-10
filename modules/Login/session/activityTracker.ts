import { api } from '../../../lib/axios';
import { simulationPolicy } from '../../../config/simulation';
import { ACTIVITY_HEARTBEAT_INTERVAL_MS, ACTIVITY_IDLE_THRESHOLD_MS } from './sessionPolicy';

interface ActivitySessionResponse {
  id: string;
}

interface StopTrackingOptions {
  endSession?: boolean;
}

class ActivityTracker {
  private static readonly LEADER_LOCK_KEY = 'wms-activity-leader-lock';
  private static readonly LEADER_LOCK_TTL_MS = ACTIVITY_HEARTBEAT_INTERVAL_MS * 3;

  private readonly activityEvents: Array<keyof WindowEventMap> = [
    'mousemove',
    'mousedown',
    'keydown',
    'touchstart',
    'scroll',
  ];

  private currentUserId: string | null = null;
  private readonly tabId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  private sessionId: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private leadershipTimer: ReturnType<typeof setInterval> | null = null;
  private isLeaderTab = false;
  private running = false;
  private startedAtMs = 0;
  private lastHeartbeatAtMs = 0;
  private lastActivityAtMs = 0;
  private pendingActiveMs = 0;
  private pendingIdleMs = 0;

  private readonly onUserActivity = () => {
    this.lastActivityAtMs = Date.now();
  };

  private readonly onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      void this.flushHeartbeat();
    } else {
      this.lastActivityAtMs = Date.now();
      this.lastHeartbeatAtMs = Date.now();
    }
  };

  private readonly onPageHide = () => {
    void this.stop({ endSession: true });
  };

  async start(userId: string): Promise<void> {
    if (simulationPolicy.isSimulationMode || !userId) {
      return;
    }

    if (this.running && this.currentUserId === userId) {
      return;
    }

    if (this.running && this.currentUserId !== userId) {
      await this.stop({ endSession: true });
    }

    const now = Date.now();
    this.currentUserId = userId;
    this.startedAtMs = now;
    this.lastActivityAtMs = now;
    this.lastHeartbeatAtMs = now;
    this.pendingActiveMs = 0;
    this.pendingIdleMs = 0;
    this.running = true;

    this.bindListeners();
    this.ensureTimer();
    this.ensureLeadershipLoop();
    await this.ensureRemoteSession();
  }

  async stop(options: StopTrackingOptions = {}): Promise<void> {
    const { endSession = false } = options;
    if (!this.running && !this.sessionId) {
      return;
    }

    try {
      await this.flushHeartbeat();
      if (endSession && this.sessionId) {
        await api.post('/activity/session/end', { sessionId: this.sessionId });
      }
    } catch (error) {
      console.error('Falha ao encerrar rastreamento de atividade', error);
    } finally {
      this.releaseLeadership();
      this.teardown();
    }
  }

  private async ensureRemoteSession(): Promise<void> {
    if (this.sessionId || !this.running || !this.isLeader()) {
      return;
    }
    try {
      const response = await api.post<ActivitySessionResponse>('/activity/session/start', {
        source: 'web',
        metadataJson: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          startedAt: new Date(this.startedAtMs).toISOString(),
        },
      });
      this.sessionId = response.data.id;
    } catch (error) {
      console.error('Falha ao iniciar sessão de atividade', error);
    }
  }

  private async flushHeartbeat(): Promise<void> {
    if (!this.running || !this.isLeader()) {
      return;
    }

    if (!this.sessionId) {
      await this.ensureRemoteSession();
      if (!this.sessionId) {
        return;
      }
    }

    const now = Date.now();
    const elapsedMs = Math.max(0, now - this.lastHeartbeatAtMs);
    if (elapsedMs <= 0) {
      return;
    }

    const { activeMs, idleMs } = this.splitActiveAndIdleMs(this.lastHeartbeatAtMs, now);
    this.lastHeartbeatAtMs = now;
    this.pendingActiveMs += activeMs;
    this.pendingIdleMs += idleMs;

    const activeSeconds = Math.floor(this.pendingActiveMs / 1000);
    const idleSeconds = Math.floor(this.pendingIdleMs / 1000);

    if (activeSeconds === 0 && idleSeconds === 0) {
      return;
    }

    this.pendingActiveMs -= activeSeconds * 1000;
    this.pendingIdleMs -= idleSeconds * 1000;

    await api.post('/activity/heartbeat', {
      sessionId: this.sessionId,
      activeSeconds,
      idleSeconds,
    });
  }

  private splitActiveAndIdleMs(fromMs: number, toMs: number): { activeMs: number; idleMs: number } {
    const totalMs = Math.max(0, toMs - fromMs);
    if (totalMs === 0) {
      return { activeMs: 0, idleMs: 0 };
    }

    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return { activeMs: 0, idleMs: totalMs };
    }

    const idleStartMs = this.lastActivityAtMs + ACTIVITY_IDLE_THRESHOLD_MS;
    const idleMs = Math.max(0, toMs - Math.max(fromMs, idleStartMs));
    const boundedIdleMs = Math.min(totalMs, idleMs);
    return { activeMs: totalMs - boundedIdleMs, idleMs: boundedIdleMs };
  }

  private ensureTimer(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.flushHeartbeat();
    }, ACTIVITY_HEARTBEAT_INTERVAL_MS);
  }

  private ensureLeadershipLoop(): void {
    this.refreshLeadership();
    if (this.leadershipTimer) {
      return;
    }
    this.leadershipTimer = setInterval(() => {
      this.refreshLeadership();
    }, Math.max(5000, Math.floor(ACTIVITY_HEARTBEAT_INTERVAL_MS / 2)));
  }

  private refreshLeadership(): void {
    if (typeof window === 'undefined') {
      this.isLeaderTab = true;
      return;
    }

    const now = Date.now();
    const raw = window.localStorage.getItem(ActivityTracker.LEADER_LOCK_KEY);
    const parsed = this.parseLeaderLock(raw);
    const canAcquire = !parsed || parsed.expiresAt <= now || parsed.tabId === this.tabId;

    if (canAcquire) {
      const next = {
        tabId: this.tabId,
        expiresAt: now + ActivityTracker.LEADER_LOCK_TTL_MS,
      };
      window.localStorage.setItem(ActivityTracker.LEADER_LOCK_KEY, JSON.stringify(next));
      this.isLeaderTab = true;
      return;
    }

    this.isLeaderTab = false;
  }

  private isLeader(): boolean {
    this.refreshLeadership();
    return this.isLeaderTab;
  }

  private parseLeaderLock(raw: string | null): { tabId: string; expiresAt: number } | null {
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as { tabId?: string; expiresAt?: number };
      if (!parsed.tabId || typeof parsed.expiresAt !== 'number') {
        return null;
      }
      return { tabId: parsed.tabId, expiresAt: parsed.expiresAt };
    } catch {
      return null;
    }
  }

  private releaseLeadership(): void {
    if (this.leadershipTimer) {
      clearInterval(this.leadershipTimer);
      this.leadershipTimer = null;
    }
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(ActivityTracker.LEADER_LOCK_KEY);
      const parsed = this.parseLeaderLock(raw);
      if (parsed?.tabId === this.tabId) {
        window.localStorage.removeItem(ActivityTracker.LEADER_LOCK_KEY);
      }
    }
    this.isLeaderTab = false;
  }

  private bindListeners(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    for (const eventName of this.activityEvents) {
      window.addEventListener(eventName, this.onUserActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('pagehide', this.onPageHide);
  }

  private teardown(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.leadershipTimer) {
      clearInterval(this.leadershipTimer);
      this.leadershipTimer = null;
    }

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      for (const eventName of this.activityEvents) {
        window.removeEventListener(eventName, this.onUserActivity);
      }
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      window.removeEventListener('pagehide', this.onPageHide);
    }

    this.currentUserId = null;
    this.sessionId = null;
    this.running = false;
    this.startedAtMs = 0;
    this.lastHeartbeatAtMs = 0;
    this.lastActivityAtMs = 0;
    this.pendingActiveMs = 0;
    this.pendingIdleMs = 0;
  }
}

const tracker = new ActivityTracker();

export async function startActivityTracking(userId: string): Promise<void> {
  await tracker.start(userId);
}

export async function stopActivityTracking(options?: StopTrackingOptions): Promise<void> {
  await tracker.stop(options);
}
