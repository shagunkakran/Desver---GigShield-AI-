/**
 * WorkerContext.tsx
 * Worker profile, policy, claims — localStorage + MongoDB sync via API when serverId exists.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { calculateRiskLevel } from "@/utils/riskEngine";
import { putJson, postJson, patchJson, fetchWorkerState, triggerInstantPayout } from "@/lib/api";

export type WorkerType = "delivery" | "driver" | "courier" | "freelance";
export type RiskLevel = "low" | "medium" | "high";
export type ClaimStatus = "triggered" | "processing" | "completed" | "rejected";
export type PlanType = "basic" | "premium";

export interface WorkerProfile {
  name: string;
  email?: string;
  workerType: WorkerType;
  location: string;
  riskLevel: RiskLevel;
  riskScore: number;
  role: "worker" | "admin";
  registered: boolean;
  /** MongoDB worker _id — required for API sync after registration */
  serverId?: string;
}

export interface Policy {
  plan: PlanType;
  weeklyPremium: number;
  active: boolean;
  startDate: string;
  coverages: string[];
  exclusions: string[];
  maxWeeklyPayout?: number;
  perClaimLimit?: number;
  smartCapFactor?: number;
}

export interface Claim {
  id: string;
  type: string;
  amount: number;
  status: ClaimStatus;
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
}

export interface WorkerContextValue {
  profile: WorkerProfile | null;
  policy: Policy | null;
  claims: Claim[];
  walletBalance: number;
  fraudScore: number;
  fraudLabel: "Low" | "Medium" | "High";
  serverFraudState?: {
    fraudScore: number;
    riskCategory: string;
    anomalies: any[];
  } | null;
  tomorrowRisk?: {
    probabilityPct: number;
    confidence: number;
    recommendation: string;
  } | null;
  activeTriggers: string[];

  authToken: string | null;
  register: (data: {
    name: string;
    email: string;
    workerType: WorkerType;
    location: string;
    serverId: string;
    role?: "worker" | "admin";
    authToken?: string;
  }) => void;
  login: (data: {
    name: string;
    email?: string;
    workerType: WorkerType;
    location: string;
    riskLevel: RiskLevel;
    riskScore: number;
    serverId: string;
    role: "worker" | "admin";
    authToken?: string;
  }) => void;
  selectPolicy: (plan: PlanType, premium: number) => void;
  triggerClaim: (type: string, amount: number, reason: string) => void;
  addTrigger: (trigger: string) => void;
  removeTrigger: (trigger: string) => void;
  instantPayout: (claimId: string, gateway: "razorpay" | "stripe" | "upi") => Promise<void>;
  reset: () => void;
}

function computeFraudScore(claims: Claim[]): number {
  if (claims.length === 0) return 8;
  let score = 0;
  if (claims.length > 3) score += (claims.length - 3) * 8;
  const typeCounts: Record<string, number> = {};
  claims.forEach((c) => {
    typeCounts[c.type] = (typeCounts[c.type] ?? 0) + 1;
  });
  const maxSameType = Math.max(...Object.values(typeCounts));
  if (maxSameType > 2) score += (maxSameType - 2) * 12;
  const autoCount = claims.filter((c) => c.autoTriggered).length;
  score += autoCount * 3;
  return Math.min(100, Math.max(5, score));
}

function fraudLabel(score: number): "Low" | "Medium" | "High" {
  if (score < 35) return "Low";
  if (score < 65) return "Medium";
  return "High";
}

const POLICY_TEMPLATES: Record<PlanType, Omit<Policy, "weeklyPremium" | "startDate">> = {
  basic: {
    plan: "basic",
    active: true,
    coverages: ["Weather Disruption", "Pollution Spike", "Standard Payout"],
    exclusions: ["War / Civil Unrest", "Pandemic Events", "Fraud / Misrepresentation"],
  },
  premium: {
    plan: "premium",
    active: true,
    coverages: [
      "Weather Disruption",
      "Pollution Spike",
      "Traffic & Road Blockage",
      "Accident Coverage",
      "Income Loss Protection",
      "Priority Payout",
      "AI Route Suggestions",
    ],
    exclusions: ["War / Civil Unrest", "Pandemic Events", "Fraud / Misrepresentation"],
  },
};

const WorkerContext = createContext<WorkerContextValue | null>(null);

const STORAGE_KEY = "desver_worker_state";

interface StoredState {
  profile: WorkerProfile | null;
  authToken: string | null;
  policy: Policy | null;
  claims: Claim[];
  walletBalance: number;
  serverFraudState?: any;
  tomorrowRisk?: {
    probabilityPct: number;
    confidence: number;
    recommendation: string;
  } | null;
  activeTriggers: string[];
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {
    profile: null,
    authToken: null,
    policy: null,
    claims: [],
    walletBalance: 1250,
    activeTriggers: [],
    serverFraudState: null,
    tomorrowRisk: null,
  };
}

function isClaimStatus(s: string): s is ClaimStatus {
  return ["triggered", "processing", "completed", "rejected"].includes(s);
}

export function WorkerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  /** Hydrate from Mongo when we have a server worker id */
  useEffect(() => {
    const sid = state.profile?.serverId;
    if (!sid) return;
    let cancelled = false;
    void (async () => {
      try {
        const s = await fetchWorkerState(sid);
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          profile: s.profile
            ? {
                ...s.profile,
                email: s.profile.email ?? prev.profile?.email,
                riskLevel: s.profile.riskLevel as RiskLevel,
                workerType: s.profile.workerType as WorkerType,
                role: (s.profile.role as "worker" | "admin") ?? prev.profile?.role ?? "worker",
                serverId: s.profile.serverId ?? sid,
              }
            : prev.profile,
          policy: (s.policy as Policy | null) ?? prev.policy,
          claims:
            s.claims?.length > 0
              ? s.claims.map((c) => ({
                  id: c.id,
                  type: c.type,
                  amount: c.amount,
                  status: isClaimStatus(c.status) ? c.status : "triggered",
                  triggeredAt: c.triggeredAt,
                  completedAt: c.completedAt,
                  reason: c.reason,
                  autoTriggered: c.autoTriggered,
                  payout: c.payout ?? null,
                }))
              : prev.claims,
          walletBalance: typeof s.walletBalance === "number" ? s.walletBalance : prev.walletBalance,
          activeTriggers: Array.isArray(s.activeTriggers) ? s.activeTriggers : prev.activeTriggers,
          serverFraudState: s.fraudState ?? prev.serverFraudState,
          tomorrowRisk: s.tomorrowRisk ?? prev.tomorrowRisk,
        }));
      } catch {
        /* API down — keep local state */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.profile?.serverId]);

  const fraudScore = computeFraudScore(state.claims);

  const register = useCallback(
    (data: {
      name: string;
      email: string;
      workerType: WorkerType;
      location: string;
      serverId: string;
      role?: "worker" | "admin";
      authToken?: string;
    }) => {
      const risk =
        data.role === "admin"
          ? { level: "low" as RiskLevel, score: 20 }
          : calculateRiskLevel(data.location, data.workerType);
      const profile: WorkerProfile = {
        name: data.name,
        email: data.email,
        workerType: data.workerType,
        location: data.location,
        riskLevel: risk.level,
        riskScore: risk.score,
        role: data.role ?? "worker",
        registered: true,
        serverId: data.serverId,
      };
      setState((prev) => ({ ...prev, profile, authToken: data.authToken ?? prev.authToken }));
    },
    []
  );

  const login = useCallback((data: {
    name: string;
    email?: string;
    workerType: WorkerType;
    location: string;
    riskLevel: RiskLevel;
    riskScore: number;
    serverId: string;
    role: "worker" | "admin";
    authToken?: string;
  }) => {
    const profile: WorkerProfile = {
      name: data.name,
      email: data.email,
      workerType: data.workerType,
      location: data.location,
      riskLevel: data.riskLevel,
      riskScore: data.riskScore,
      role: data.role,
      registered: true,
      serverId: data.serverId,
    };
    setState((prev) => ({ ...prev, profile, authToken: data.authToken ?? prev.authToken }));
  }, []);

  const selectPolicy = useCallback((plan: PlanType, premium: number) => {
    const policy: Policy = {
      ...POLICY_TEMPLATES[plan],
      weeklyPremium: premium,
      startDate: new Date().toISOString().split("T")[0],
      maxWeeklyPayout: plan === "premium" ? 3500 : 2000,
      perClaimLimit: plan === "premium" ? 900 : 500,
      smartCapFactor: plan === "premium" ? 1 : 0.9,
    };
    setState((prev) => {
      const sid = prev.profile?.serverId;
      if (sid) {
        void putJson(`/api/workers/${sid}/policy`, { policy }).catch(() => {});
      }
      return { ...prev, policy };
    });
  }, []);

  const triggerClaim = useCallback((type: string, amount: number, reason: string) => {
    const externalId = `CLM-${Date.now()}`;
    const claim: Claim = {
      id: externalId,
      type,
      amount,
      status: "triggered",
      triggeredAt: new Date().toLocaleTimeString(),
      reason,
      autoTriggered: true,
    };

    setState((prev) => {
      const sid = prev.profile?.serverId;
      if (sid) {
        void postJson(`/api/workers/${sid}/claims`, {
          externalId,
          type,
          amount,
          status: "triggered",
          reason,
          autoTriggered: true,
        }).catch(() => {});
      }
      return { ...prev, claims: [claim, ...prev.claims] };
    });

    setTimeout(() => {
      setState((prev) => {
        const sid = prev.profile?.serverId;
        if (sid) {
          void patchJson(`/api/workers/${sid}/claims/external/${encodeURIComponent(externalId)}`, {
            status: "processing",
          }).catch(() => {});
        }
        return {
          ...prev,
          claims: prev.claims.map((c) =>
            c.id === externalId ? { ...c, status: "processing" as const } : c
          ),
        };
      });
    }, 1500);

    setTimeout(() => {
      setState((prev) => {
        const sid = prev.profile?.serverId;
        if (sid) {
          void patchJson(`/api/workers/${sid}/claims/external/${encodeURIComponent(externalId)}`, {
            status: "completed",
            completedAt: new Date().toISOString(),
            walletCredit: amount,
          }).catch(() => {});
        }
        return {
          ...prev,
          walletBalance: prev.walletBalance + amount,
          claims: prev.claims.map((c) =>
            c.id === externalId
              ? {
                  ...c,
                  status: "completed" as const,
                  completedAt: new Date().toLocaleTimeString(),
                }
              : c
          ),
        };
      });
    }, 4000);
  }, []);

  const addTrigger = useCallback((trigger: string) => {
    setState((prev) => {
      const activeTriggers = prev.activeTriggers.includes(trigger)
        ? prev.activeTriggers
        : [...prev.activeTriggers, trigger];
      const sid = prev.profile?.serverId;
      if (sid) {
        void putJson(`/api/workers/${sid}/session`, { activeTriggers }).catch(() => {});
      }
      return { ...prev, activeTriggers };
    });
  }, []);

  const removeTrigger = useCallback((trigger: string) => {
    setState((prev) => {
      const activeTriggers = prev.activeTriggers.filter((t) => t !== trigger);
      const sid = prev.profile?.serverId;
      if (sid) {
        void putJson(`/api/workers/${sid}/session`, { activeTriggers }).catch(() => {});
      }
      return { ...prev, activeTriggers };
    });
  }, []);

  const instantPayout = useCallback(async (claimId: string, gateway: "razorpay" | "stripe" | "upi") => {
    const sid = state.profile?.serverId;
    if (!sid) return;

    const idempotencyKey = `payout-${sid}-${claimId}-${gateway}`;
    const res = await triggerInstantPayout(sid, claimId, gateway, idempotencyKey);
    setState((prev) => ({
      ...prev,
      walletBalance: res.idempotentReplay
        ? prev.walletBalance
        : prev.walletBalance + Number(res.payout.amount ?? 0),
      claims: prev.claims.map((c) =>
        c.id === claimId
          ? {
              ...c,
              status: "completed",
              completedAt: new Date(res.payout.settledAt).toLocaleTimeString(),
              reason:
                c.reason.includes(String(res.payout.reference))
                  ? c.reason
                  : `${c.reason} | ${res.payout.provider.toUpperCase()} ref: ${res.payout.reference}`,
              payout: {
                provider: res.payout.provider,
                reference: res.payout.reference,
                status: res.payout.status,
                settledAt: res.payout.settledAt,
                amount: Number(res.payout.amount ?? c.amount),
                currency: res.payout.currency ?? "INR",
                sandbox: Boolean(res.payout.sandbox),
              },
            }
          : c
      ),
    }));
  }, [state.profile?.serverId]);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      profile: null,
      authToken: null,
      policy: null,
      claims: [],
      walletBalance: 1250,
      activeTriggers: [],
      serverFraudState: null,
      tomorrowRisk: null,
    });
  }, []);

  const value: WorkerContextValue = {
    ...state,
    fraudScore,
    fraudLabel: fraudLabel(fraudScore),
    register,
    login,
    selectPolicy,
    triggerClaim,
    addTrigger,
    removeTrigger,
    instantPayout,
    reset,
  };

  return <WorkerContext.Provider value={value}>{children}</WorkerContext.Provider>;
}

export function useWorker(): WorkerContextValue {
  const ctx = useContext(WorkerContext);
  if (!ctx) throw new Error("useWorker must be used inside <WorkerProvider>");
  return ctx;
}
