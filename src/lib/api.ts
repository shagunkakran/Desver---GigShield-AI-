/**
 * Phase 2 API client — calls Node backend when `npm run server` + Vite proxy are running.
 */

const BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ?? "";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  return handle<T>(res);
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return handle<T>(res);
}

export async function putJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return handle<T>(res);
}

export async function patchJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return handle<T>(res);
}

export type IntelligenceTrigger = {
  id: string;
  name: string;
  active: boolean;
  severity: number;
  source: string;
  detail: string;
};

export type IntelligenceResponse = {
  location: string;
  triggers: IntelligenceTrigger[];
  ml: {
    modelId: string;
    modelType: string;
    mlSource?: string;
    sklearnNote?: string | null;
    weeklyPremiumDeltaINR: number;
    extendedCoverageHours: number;
    featureVector: Record<string, number>;
    explanations: string[];
  };
  errors?: Record<string, string | null>;
};

export function evaluateIntelligence(location: string) {
  return postJson<IntelligenceResponse>("/api/intelligence/evaluate", { location });
}

export function registerWorkerApi(payload: {
  name: string;
  workerType: string;
  location: string;
  riskLevel?: string;
  riskScore?: number;
}) {
  return postJson<{ id: string; persisted: string }>("/api/workers/register", payload);
}

export type WorkerStateResponse = {
  profile: {
    name: string;
    workerType: string;
    location: string;
    riskLevel: string;
    riskScore: number;
    registered: boolean;
    serverId: string;
  };
  policy: unknown;
  claims: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    triggeredAt: string;
    completedAt?: string;
    reason: string;
    autoTriggered: boolean;
  }>;
  walletBalance: number;
  activeTriggers: string[];
};

export function fetchWorkerState(workerId: string) {
  return getJson<WorkerStateResponse>(`/api/workers/${encodeURIComponent(workerId)}/state`);
}
