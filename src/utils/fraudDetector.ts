/**
 * fraudDetector.ts
 * Simulated AI fraud scoring engine.
 *
 * Score 0–100 based on:
 *   - Claim frequency (volume / time)
 *   - Repeated claim types (suspicious pattern)
 *   - Auto-triggered claim ratio
 *   - Location jump anomaly (mock)
 *
 * This simulates what a real ML model would output.
 */

export interface Claim {
  id: string;
  type: string;
  autoTriggered: boolean;
  triggeredAt: string;
}

export interface FraudResult {
  score: number;          // 0–100
  label: "Low" | "Medium" | "High";
  signals: FraudSignal[];
  recommendation: string;
}

export interface FraudSignal {
  name: string;
  severity: "low" | "medium" | "high";
  value: string;
  description: string;
}

// ── Scoring weights ─────────────────────────────────────────────────────────

const WEIGHTS = {
  highClaimVolume:   15,  // per claim above threshold
  repeatedType:      12,  // per duplicate type above 2
  manualTriggers:     8,  // per manually submitted claim
  baseNoise:          5,  // always present (realistic floor)
};

// ── Detector ────────────────────────────────────────────────────────────────

export function detectFraud(claims: Claim[]): FraudResult {
  const signals: FraudSignal[] = [];
  let score = WEIGHTS.baseNoise;

  // 1. Claim volume check
  const VOLUME_THRESHOLD = 3;
  if (claims.length > VOLUME_THRESHOLD) {
    const excess = claims.length - VOLUME_THRESHOLD;
    score += excess * WEIGHTS.highClaimVolume;
    signals.push({
      name: "High Claim Volume",
      severity: excess > 4 ? "high" : "medium",
      value: `${claims.length} claims`,
      description: `Expected ≤${VOLUME_THRESHOLD}. Excess claims flagged for pattern analysis.`,
    });
  }

  // 2. Repeated claim types
  const typeCounts: Record<string, number> = {};
  claims.forEach((c) => { typeCounts[c.type] = (typeCounts[c.type] ?? 0) + 1; });
  Object.entries(typeCounts).forEach(([type, count]) => {
    if (count > 2) {
      const excess = count - 2;
      score += excess * WEIGHTS.repeatedType;
      signals.push({
        name: "Repeated Claim Type",
        severity: count > 4 ? "high" : "medium",
        value: `${type} × ${count}`,
        description: `Same disruption type claimed ${count} times — unusual pattern.`,
      });
    }
  });

  // 3. Manual (non-auto) claims — these are slightly more suspicious
  const manualClaims = claims.filter((c) => !c.autoTriggered);
  if (manualClaims.length > 0) {
    score += manualClaims.length * WEIGHTS.manualTriggers;
    signals.push({
      name: "Manual Claim Submissions",
      severity: manualClaims.length > 2 ? "medium" : "low",
      value: `${manualClaims.length} manual`,
      description: "Manually filed claims require extra validation.",
    });
  }

  // 4. Location jump anomaly (mock — always adds a small signal if >2 claims)
  if (claims.length > 2) {
    signals.push({
      name: "GPS Consistency Check",
      severity: "low",
      value: "Analysing…",
      description: "Cross-referencing GPS trace with delivery logs — no anomaly detected.",
    });
  }

  score = Math.min(100, Math.max(5, score));

  let label: "Low" | "Medium" | "High";
  if (score < 35) label = "Low";
  else if (score < 65) label = "Medium";
  else label = "High";

  const recommendation =
    label === "Low"
      ? "Auto-approve payouts. No action required."
      : label === "Medium"
      ? "Flag for soft review. Request additional GPS logs."
      : "Hold payout. Escalate to fraud investigation team.";

  return { score, label, signals, recommendation };
}