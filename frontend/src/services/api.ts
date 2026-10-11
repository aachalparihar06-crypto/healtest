import type { TestRun, TestIntent, DomInspectionResult } from '../types';
import { classifyTestRun } from '../types';

const DEFAULT_API_BASE = 'http://localhost:3001/api';
const SETTINGS_KEY = 'healtest_settings';

export interface BackendHealthResponse {
  online: boolean;
  stage: string;
  version: string;
  message: string;
  engineStatus?: string;
  artifactsDir?: string;
  totalExecutedRuns?: number;
}

export function getApiBaseUrl(): string {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.apiBaseUrl) return parsed.apiBaseUrl;
    }
  } catch {
    // fallback to default
  }
  return DEFAULT_API_BASE;
}

export function setApiBaseUrl(url: string): void {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed.apiBaseUrl = url.trim();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

export const apiService = {
  /**
   * Health check against live backend Express server
   */
  async checkHealth(): Promise<BackendHealthResponse> {
    const baseUrl = getApiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        return {
          online: true,
          stage: data.stage || 'Stage 4 Integrated',
          version: data.version || '1.2.0',
          message: data.message || 'Connected to HealTest Backend and Playwright Engine',
          engineStatus: data.engineStatus || 'ready',
          artifactsDir: data.artifactsDir,
          totalExecutedRuns: data.totalExecutedRuns,
        };
      }
    } catch {
      // Backend not reached
    }
    return {
      online: false,
      stage: 'Backend Offline',
      version: 'N/A',
      message: `Backend API unreachable on ${baseUrl}. Start it with 'npm.cmd run dev'`,
      engineStatus: 'offline',
    };
  },

  /**
   * Fetch all real test runs recorded on the backend
   */
  async getAllRuns(): Promise<TestRun[]> {
    const baseUrl = getApiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/runs`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const runs: TestRun[] = await res.json();
        return runs.map((run) => ({
          ...run,
          errorClassification: run.errorClassification || classifyTestRun(run),
        }));
      }
    } catch (err: any) {
      console.warn('[HealTest API] Failed to fetch runs from backend:', err.message);
    }
    return [];
  },

  /**
   * Fetch single test run by ID
   */
  async getRunById(id: string): Promise<TestRun | null> {
    const baseUrl = getApiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/runs/${id}`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const run: TestRun = await res.json();
        run.errorClassification = run.errorClassification || classifyTestRun(run);
        return run;
      }
    } catch (err: any) {
      console.warn('[HealTest API] Failed to fetch run by id:', err.message);
    }
    return null;
  },

  /**
   * Dispatch a real Playwright execution to the backend API.
   * Never fabricates fake runs or simulated statuses.
   */
  async createRun(intent: TestIntent): Promise<TestRun> {
    const baseUrl = getApiBaseUrl();
    const timeoutDuration = Math.max(35000, (intent.timeoutMs || 15000) + 15000);

    const res = await fetch(`${baseUrl}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intent),
      signal: AbortSignal.timeout(timeoutDuration),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with HTTP ${res.status}: ${res.statusText}`);
    }

    const realRun: TestRun = await res.json();
    realRun.errorClassification = realRun.errorClassification || classifyTestRun(realRun);
    return realRun;
  },

  /**
   * Inspect a live target URL using Playwright without running tests
   */
  async inspectUrl(url: string, allowLocalhost: boolean = true, timeoutMs: number = 15000): Promise<DomInspectionResult> {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, allowLocalhost, timeoutMs }),
      signal: AbortSignal.timeout(timeoutMs + 5000),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Inspection failed with status ${res.status}`);
    }

    return await res.json();
  },

  /**
   * Get safe proxy URL for embedded iframe preview
   */
  getProxyPreviewUrl(targetUrl: string): string {
    const baseUrl = getApiBaseUrl();
    const rootOrigin = baseUrl.replace(/\/api$/, '');
    return `${rootOrigin}/api/preview/proxy?url=${encodeURIComponent(targetUrl)}`;
  },

  /**
   * Clear test runs history on the backend
   */
  async clearHistory(): Promise<boolean> {
    const baseUrl = getApiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/runs`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  },
};

