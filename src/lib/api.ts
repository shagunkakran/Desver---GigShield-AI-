/**
 * Desver API client — calls Node backend when `npm run server` + Vite proxy are running.
 */

const BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ?? "";
const AUTH_STORAGE_KEY = "desver_worker_state";
const SESSION_EXPIRED_TOAST_KEY = "desver_session_expired_toast";

function handleUnauthorizedRedirect() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.setItem(SESSION_EXPIRED_TOAST_KEY, "1");
  } catch {
    /* ignore */
  }
  if (!window.location.pathname.startsWith("/login")) {
    window.location.assign("/login");
  }
}

export function consumeSessionExpiredToastFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const value = sessionStorage.getItem(SESSION_EXPIRED_TOAST_KEY);
    if (value === "1") {
      sessionStorage.removeItem(SESSION_EXPIRED_TOAST_KEY);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function getAuthTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { authToken?: string | null };
    return parsed.authToken ?? null;
  } catch {
    return null;
  }
}

function withAuthHeaders(existing?: HeadersInit): HeadersInit {
  const token = getAuthTokenFromStorage();
  if (!token) return existing ?? {};
  return {
    ...(existing ?? {}),
    Authorization: `Bearer ${token}`,
  };
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    handleUnauthorizedRedirect();
    throw new Error("Session expired. Please login again.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: withAuthHeaders() });
  return handle<T>(res);
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body ?? {}),
  });
  return handle<T>(res);
}

export async function putJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body ?? {}),
  });
  return handle<T>(res);
}

export async function patchJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
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
  email: string;
  password: string;
  workerType: string;
  location: string;
  riskLevel?: string;
  riskScore?: number;
  role?: "worker" | "admin";
}) {
  return postJson<{ id: string; persisted: string; token: string }>("/api/workers/register", payload);
}

export function registerAdminApi(payload: { name: string; email: string; password: string; location: string }) {
  return postJson<{ id: string; persisted: string; role: "admin"; token: string }>("/api/admins/register", payload);
}

export function loginApi(payload: { email: string; password: string; role?: "worker" | "admin" }) {
  return postJson<{
    id: string;
    name: string;
    email: string;
    role: "worker" | "admin";
    workerType: string;
    location: string;
    riskLevel: string;
    riskScore: number;
    token: string;
  }>("/api/auth/login", payload);
}

export type WorkerStateResponse = {
  profile: {
    name: string;
    email?: string;
    workerType: string;
    location: string;
    riskLevel: string;
    riskScore: number;
    role?: "worker" | "admin";
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
    payout?: {
      provider: string | null;
      reference: string | null;
      status: string | null;
      settledAt: string | null;
      amount: number;
      currency: string;
      sandbox: boolean;
    } | null;
  }>;
  walletBalance: number;
  activeTriggers: string[];
  fraudState?: {
    fraudScore: number;
    riskCategory: string;
    anomalies: Array<{ type: string; severity: string; detail: string }>;
    components?: {
      locationAnomaly: number;
      activityMismatch: number;
      patternSimilarity: number;
    };
  };
  tomorrowRisk?: {
    probabilityPct: number;
    confidence: number;
    recommendation: string;
  };
};

export function fetchWorkerState(workerId: string) {
  return getJson<WorkerStateResponse>(`/api/workers/${encodeURIComponent(workerId)}/state`);
}

export type WorkerStatisticsResponse = {
  riskVsPremium: Array<{ week: string; riskLevel: number; premiumPaid: number }>;
  claimsOverTime: Array<{ week: string; claimsCount: number; claimsAmount: number }>;
  fraudStats: Array<{
    week: string;
    gpsSpoofing: number;
    fakeInactivity: number;
    fakeWeatherClaims?: number;
    clusterFraud: number;
    fraudScore: number;
  }>;
  tomorrowRisk: { probabilityPct: number; confidence: number; recommendation: string };
  workerSummary?: {
    earningsProtectedINR: number;
    activeWeeklyCoverageHours: number;
    coverageRemainingHours: number;
    weekResetAt: string;
    weeklyClaimsSettled: number;
    reliabilityScore: number;
    activePolicyLabel: string;
  };
};

export function fetchWorkerStatistics(workerId: string) {
  return getJson<WorkerStatisticsResponse>(`/api/workers/${encodeURIComponent(workerId)}/statistics`);
}

export type InstantPayoutResponse = {
  ok: boolean;
  payout: {
    provider: string;
    reference: string;
    amount: number;
    currency: string;
    status: string;
    settledAt: string;
    sandbox: boolean;
  };
  claim: {
    externalId: string;
    status: string;
    completedAt?: string;
    amount: number;
    reason: string;
  };
  idempotentReplay?: boolean;
};

export function triggerInstantPayout(
  workerId: string,
  externalId: string,
  gateway: "razorpay" | "stripe" | "upi",
  idempotencyKey?: string
) {
  return postJson<InstantPayoutResponse>(
    `/api/workers/${encodeURIComponent(workerId)}/claims/external/${encodeURIComponent(externalId)}/instant-payout`,
    { gateway, idempotencyKey }
  );
}

export type AdminAnalyticsResponse = {
  totals: {
    workers: number;
    claims: number;
    completedClaims: number;
    totalPremiumWeekly: number;
    totalPayout: number;
    lossRatio: number;
  };
  lossByType: Array<{ type: string; amount: number }>;
  nextWeekPrediction: { score: number; likelyClaims: number; likelyPayout: number };
  weeklyTrend: Array<{ week: string; expectedClaims: number; expectedPayout: number }>;
  workers: Array<{
    workerId: string;
    name: string;
    workerType: string;
    location: string;
    plan: string;
    weeklyPremium: number;
    claimsTotal: number;
    claimsCompleted: number;
    totalPayout: number;
    fraudScore: number;
    lastClaimAt?: string | null;
  }>;
};

export function fetchAdminAnalytics() {
  return getJson<AdminAnalyticsResponse>("/api/admin/analytics");
}

export type AdminDashboardResponse = {
  totals: {
    totalUsers: number;
    totalPolicies: number;
    totalClaims: number;
    totalPayout: number;
    totalProfit: number;
  };
  fraudSignals?: {
    weatherClaimRatio: number;
    expectedWeatherRatio: number;
    weatherAbuseDelta: number;
    weatherAlertLabel: "Low" | "Medium" | "High";
    autoTuned?: boolean;
  };
  insurerIntelligence?: {
    currentLossRatio: number;
    projectedLossRatioBase: number;
    likelyWeatherClaims: number;
    likelyDisruptionClaims: number;
    predictedNextWeekPayout: number;
    predictedNextWeekPremium: number;
    confidenceScore: number;
    weatherPayoutShare: number;
    disruptionPayoutShare: number;
    scenarios: Array<{
      name: "optimistic" | "base" | "stress" | string;
      likelyClaims: number;
      likelyPayout: number;
      projectedLossRatio: number;
    }>;
    recommendation: string;
    governance?: {
      reserveAdequacyRatio: number;
      reserveStatus: "healthy" | "watch" | "critical";
      avgClaimSettlementHours: number;
      tatBreaches24h: number;
    };
  };
  usersTable: Array<{
    id: string;
    name: string;
    role: "worker" | "admin";
    zone: string;
    riskLevel: string;
    riskScore: number;
    policyActive: boolean;
    weeklyPremium: number;
    fraudScore: number;
    fraudLabel: "Safe" | "Suspicious" | "Risky";
  }>;
  claimsTable: Array<{
    id: string;
    user: string;
    amount: number;
    status: string;
    decisionSource: string;
    adminReviewRequired: boolean;
    reviewFlags: string[];
    reason: string;
    date: string | null;
  }>;
  payoutsTable: Array<{
    claimId: string;
    externalId: string;
    user: string;
    amount: number;
    gateway: string;
    reference: string;
    status: string;
    settledAt: string | null;
    attempts: number;
    failureReason: string;
    sandbox: boolean;
  }>;
  policiesTable: Array<{
    plan: string;
    premium: number;
    coverage: string;
    activeUsers: number;
  }>;
};

export function fetchAdminDashboard() {
  return getJson<AdminDashboardResponse>("/api/admin/dashboard");
}

export function adminUpdateClaimStatus(
  claimId: string,
  payload: { status: "pending" | "processing" | "completed" | "rejected"; adminNote?: string; payoutAmount?: number }
) {
  return patchJson<{ ok: boolean }>(`/api/admin/claims/${encodeURIComponent(claimId)}/status`, payload);
}

export function adminSetClaimReviewFlag(
  claimId: string,
  payload: { reviewRequired: boolean; adminNote?: string }
) {
  return patchJson<{ ok: boolean; adminReviewRequired: boolean }>(
    `/api/admin/claims/${encodeURIComponent(claimId)}/review-flag`,
    payload
  );
}

export function adminUpdateUserPolicy(
  userId: string,
  payload: { active?: boolean; weeklyPremium?: number }
) {
  return patchJson<{ ok: boolean }>(`/api/admin/users/${encodeURIComponent(userId)}/policy`, payload);
}

export function adminUpdateUserRisk(
  userId: string,
  payload: { riskLevel: "low" | "medium" | "high"; riskScore: number }
) {
  return patchJson<{ ok: boolean }>(`/api/admin/users/${encodeURIComponent(userId)}/risk`, payload);
}

export type AdminAuditLogItem = {
  id: string;
  adminEmail: string;
  actionType: string;
  targetType: string;
  targetId: string;
  note: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AdminAuditLogsResponse = {
  items: AdminAuditLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AdminAuditLogsQuery = {
  page?: number;
  limit?: number;
  actionType?: string;
  adminEmail?: string;
  from?: string;
  to?: string;
};

export function fetchAdminAuditLogs(query: AdminAuditLogsQuery = {}) {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 100));
  if (query.actionType && query.actionType !== "all") params.set("actionType", query.actionType);
  if (query.adminEmail && query.adminEmail !== "all") params.set("adminEmail", query.adminEmail);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  return getJson<AdminAuditLogsResponse>(`/api/admin/audit-logs?${params.toString()}`);
}

export type AutoFlagConfig = {
  fraudScoreThreshold: number;
  nearLimitRatio: number;
  claims24hThreshold: number;
  repeatType7dThreshold: number;
  weakSignalEnabled: boolean;
  canEdit?: boolean;
};

export function fetchAutoFlagConfig() {
  return getJson<AutoFlagConfig>("/api/admin/auto-flag-config");
}

export function updateAutoFlagConfig(payload: Partial<AutoFlagConfig>) {
  return patchJson<{ ok: boolean; config: AutoFlagConfig }>("/api/admin/auto-flag-config", payload);
}

export function resetAutoFlagConfig() {
  return postJson<{ ok: boolean; config: AutoFlagConfig }>("/api/admin/auto-flag-config/reset", {});
}

export type WorkerListItem = {
  _id: string;
  name: string;
  workerType: string;
  location: string;
  policy?: {
    plan?: string;
    weeklyPremium?: number;
  };
  fraudScore?: number;
};

export function fetchWorkers() {
  return getJson<WorkerListItem[]>("/api/workers");
}
