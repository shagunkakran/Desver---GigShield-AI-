/**
 * riskEngine.ts
 * Calculates worker risk level based on city and worker type.
 * Risk score 0–100; level = low (<45) | medium (<65) | high (65+).
 */

export type RiskLevel = "low" | "medium" | "high";

// Per-city risk: historical disruption frequency + traffic density
const LOCATION_RISK: Record<string, { score: number; locationPremium: number }> = {
  Delhi:     { score: 85, locationPremium: 30 },
  Gurugram:  { score: 68, locationPremium: 22 },
  Noida:     { score: 72, locationPremium: 25 },
  Mumbai:    { score: 78, locationPremium: 28 },
  Bengaluru: { score: 55, locationPremium: 15 },
  Hyderabad: { score: 50, locationPremium: 12 },
  Chennai:   { score: 60, locationPremium: 18 },
  Kolkata:   { score: 74, locationPremium: 24 },
  Pune:      { score: 45, locationPremium: 10 },
  Jaipur:    { score: 58, locationPremium: 16 },
  Ahmedabad: { score: 52, locationPremium: 13 },
  Lucknow:   { score: 62, locationPremium: 19 },
};

// Per worker-type risk: exposure level on the road
const WORKER_TYPE_RISK: Record<string, { score: number; label: string }> = {
  delivery:  { score: 80, label: "Delivery Rider" },
  driver:    { score: 62, label: "Cab Driver" },
  courier:   { score: 70, label: "Courier Agent" },
  freelance: { score: 38, label: "Freelancer" },
};

export interface RiskResult {
  level: RiskLevel;
  score: number;            // 0–100 combined
  locationScore: number;
  workerTypeScore: number;
  locationPremium: number;  // extra ₹ for location
  breakdown: { label: string; score: number }[];
}

/**
 * Calculate combined risk level.
 * Weights: location 50%, worker type 50%.
 */
export function calculateRiskLevel(location: string, workerType: string): RiskResult {
  const loc = LOCATION_RISK[location] ?? { score: 55, locationPremium: 15 };
  const wt  = WORKER_TYPE_RISK[workerType] ?? { score: 55, label: "Worker" };

  const score = Math.round(loc.score * 0.5 + wt.score * 0.5);

  let level: RiskLevel;
  if (score < 45) level = "low";
  else if (score < 65) level = "medium";
  else level = "high";

  return {
    level,
    score,
    locationScore: loc.score,
    workerTypeScore: wt.score,
    locationPremium: loc.locationPremium,
    breakdown: [
      { label: `Location (${location})`, score: loc.score },
      { label: `Worker Type (${wt.label})`, score: wt.score },
      { label: "Combined Risk Score", score },
    ],
  };
}

export function getLocations(): string[] {
  return Object.keys(LOCATION_RISK);
}

export function getWorkerTypes(): { value: string; label: string }[] {
  return Object.entries(WORKER_TYPE_RISK).map(([value, { label }]) => ({ value, label }));
}

export function getLocationPremium(location: string): number {
  return (LOCATION_RISK[location] ?? { locationPremium: 15 }).locationPremium;
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  low:    "text-success",
  medium: "text-accent",
  high:   "text-destructive",
};

export const RISK_BG: Record<RiskLevel, string> = {
  low:    "bg-success/10",
  medium: "bg-accent/10",
  high:   "bg-destructive/10",
};
