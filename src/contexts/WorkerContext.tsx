/**
 * WorkerContext.tsx
 * Worker profile, policy, claims — localStorage + MongoDB sync via API when serverId exists.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { calculateRiskLevel } from "@/utils/riskEngine";
import { putJson, postJson, patchJson, fetchWorkerState } from "@/lib/api";

export type WorkerType = "delivery" | "driver" | "courier" | "freelance";
export type RiskLevel = "low" | "medium" | "high";
export type ClaimStatus = "triggered" | "processing" | "completed" | "rejected";
export type PlanType = "basic" | "premium";

export interface WorkerProfile {
  name: string;
  workerType: WorkerType;
  location: string;
  riskLevel: RiskLevel;
  riskScore: number;
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
}

export interface WorkerContextValue {
  profile: WorkerProfile | null;
  policy: Policy | null;
  claims: Claim[];
  walletBalance: number;
  fraudScore: number;
  fraudLabel: "Low" | "Medium" | "High";
  activeTriggers: string[];

  register: (data: { name: string; workerType: WorkerType; location: string; serverId: string }) => void;
  selectPolicy: (plan: PlanType, premium: number) => void;
  triggerClaim: (type: string, amount: number, reason: string) => void;
  addTrigger: (trigger: string) => void;
  removeTrigger: (trigger: string) => void;
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

const STORAGE_KEY = "gigshield_worker_state";

interface StoredState {
  profile: WorkerProfile | null;
  policy: Policy | null;
  claims: Claim[];
  walletBalance: number;
  activeTriggers: string[];
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { profile: null, policy: null, claims: [], walletBalance: 1250, activeTriggers: [] };
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
                riskLevel: s.profile.riskLevel as RiskLevel,
                workerType: s.profile.workerType as WorkerType,
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
                }))
              : prev.claims,
          walletBalance: typeof s.walletBalance === "number" ? s.walletBalance : prev.walletBalance,
          activeTriggers: Array.isArray(s.activeTriggers) ? s.activeTriggers : prev.activeTriggers,
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
    (data: { name: string; workerType: WorkerType; location: string; serverId: string }) => {
      const risk = calculateRiskLevel(data.location, data.workerType);
      const profile: WorkerProfile = {
        name: data.name,
        workerType: data.workerType,
        location: data.location,
        riskLevel: risk.level,
        riskScore: risk.score,
        registered: true,
        serverId: data.serverId,
      };
      setState((prev) => ({ ...prev, profile }));
    },
    []
  );

  const selectPolicy = useCallback((plan: PlanType, premium: number) => {
    const policy: Policy = {
      ...POLICY_TEMPLATES[plan],
      weeklyPremium: premium,
      startDate: new Date().toISOString().split("T")[0],
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

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ profile: null, policy: null, claims: [], walletBalance: 1250, activeTriggers: [] });
  }, []);

  const value: WorkerContextValue = {
    ...state,
    fraudScore,
    fraudLabel: fraudLabel(fraudScore),
    register,
    selectPolicy,
    triggerClaim,
    addTrigger,
    removeTrigger,
    reset,
  };

  return <WorkerContext.Provider value={value}>{children}</WorkerContext.Provider>;
}

export function useWorker(): WorkerContextValue {
  const ctx = useContext(WorkerContext);
  if (!ctx) throw new Error("useWorker must be used inside <WorkerProvider>");
  return ctx;
}
