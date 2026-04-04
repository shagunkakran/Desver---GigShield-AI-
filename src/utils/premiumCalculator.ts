/**
 * premiumCalculator.ts
 * Formula: Premium = Base + Risk Factor + Location Risk - Safety Discount + Weather + Hours
 *
 * All amounts in ₹/week.
 */

import { getLocationPremium } from "./riskEngine";

export type PlanType = "basic" | "premium";
export type RiskLevel = "low" | "medium" | "high";

export interface PremiumFactors {
  plan: PlanType;
  riskLevel: RiskLevel;
  location: string;
  isRaining: boolean;      // weather trigger
  isSafeZone: boolean;     // safe delivery zone
  hoursPerDay: number;     // daily working hours
  /** ML / hyper-local pricing delta from API (₹/week); can be negative (e.g. −2 safe zone) */
  mlAdjustment?: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const BASE: Record<PlanType, number> = { basic: 50, premium: 80 };
const RISK_FACTOR: Record<RiskLevel, number> = { low: 0, medium: 15, high: 30 };
const RAIN_SURCHARGE = 12;   // ₹ extra when raining
const SAFE_ZONE_DISCOUNT = 10; // ₹ discount in safe zone
const EXTRA_HOUR_RATE = 2;    // ₹ per hour above 8h/day

// ── Types ───────────────────────────────────────────────────────────────────

export interface PremiumLineItem {
  label: string;
  amount: number;
  type: "add" | "subtract";
}

export interface PremiumResult {
  total: number;
  breakdown: PremiumLineItem[];
}

// ── Calculator ───────────────────────────────────────────────────────────────

/**
 * Calculate weekly premium from dynamic factors.
 * Minimum premium is always ₹30.
 */
export function calculatePremium(factors: PremiumFactors): PremiumResult {
  const base        = BASE[factors.plan];
  const riskFactor  = RISK_FACTOR[factors.riskLevel];
  const locRisk     = getLocationPremium(factors.location);
  const rainCharge  = factors.isRaining ? RAIN_SURCHARGE : 0;
  const safeDisc    = factors.isSafeZone ? SAFE_ZONE_DISCOUNT : 0;
  const extraHours  = Math.max(0, factors.hoursPerDay - 8);
  const hourCharge  = extraHours * EXTRA_HOUR_RATE;
  const mlAdj       = factors.mlAdjustment ?? 0;
  const mlAdd       = mlAdj > 0 ? mlAdj : 0;
  const mlSub       = mlAdj < 0 ? -mlAdj : 0;

  const total = Math.max(30, base + riskFactor + locRisk + rainCharge - safeDisc + hourCharge + mlAdd - mlSub);

  const breakdown: PremiumLineItem[] = [
    { label: `Base Premium (${factors.plan})`, amount: base, type: "add" },
    { label: `Risk Factor (${factors.riskLevel})`, amount: riskFactor, type: "add" },
    { label: `Location Risk (${factors.location})`, amount: locRisk, type: "add" },
    ...(rainCharge > 0 ? [{ label: "🌧 Rain Surcharge", amount: rainCharge, type: "add" as const }] : []),
    ...(safeDisc > 0  ? [{ label: "✅ Safe Zone Discount", amount: safeDisc, type: "subtract" as const }] : []),
    ...(hourCharge > 0 ? [{ label: `⏱ Extra Hours (${extraHours}h × ₹${EXTRA_HOUR_RATE})`, amount: hourCharge, type: "add" as const }] : []),
    ...(mlAdd > 0 ? [{ label: "🤖 ML risk-weighted add-on", amount: mlAdd, type: "add" as const }] : []),
    ...(mlSub > 0 ? [{ label: "🤖 ML hyper-local discount", amount: mlSub, type: "subtract" as const }] : []),
  ];

  return { total, breakdown };
}