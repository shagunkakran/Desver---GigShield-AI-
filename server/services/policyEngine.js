import { ClaimModel } from "../models/index.js";

/**
 * Coverage & Policy Engine (Phase 3)
 * Implements Smart Caps: Prevents over-compensation and limits payouts.
 */

export async function getWeeklyPayoutSum(workerId) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const claims = await ClaimModel.find({
    workerId,
    status: { $in: ["completed", "processing"] },
    triggeredAt: { $gte: oneWeekAgo }
  }).lean();

  return claims.reduce((acc, c) => acc + (c.amount || 0), 0);
}

export async function enforcePolicyLimits(worker, requestedAmount) {
  const policy = worker.policy || {};
  const maxWeeklyPayout = policy.maxWeeklyPayout || 2000; // default cap ₹2000
  const perClaimLimit = policy.perClaimLimit || 500; // default cap ₹500
  const smartCapFactor = typeof policy.smartCapFactor === "number" ? policy.smartCapFactor : 1;

  // 1. Per Claim Limit
  const cappedPerClaim = Math.min(requestedAmount, perClaimLimit);
  let approvedAmount = Math.floor(cappedPerClaim * smartCapFactor);
  approvedAmount = Math.max(0, approvedAmount);
  let rationale = `Base approval: ₹${approvedAmount} (Limit: ₹${perClaimLimit}/claim, smartCap x${smartCapFactor}).`;

  // 2. Weekly Cap Limit
  const weeklySum = await getWeeklyPayoutSum(worker._id);
  const availableBalance = Math.max(0, maxWeeklyPayout - weeklySum);

  if (availableBalance <= 0) {
    return {
      approved: false,
      amount: 0,
      reason: `Claim denied: Weekly payout cap of ₹${maxWeeklyPayout} reached.`
    };
  }

  if (approvedAmount > availableBalance) {
    // Smart Cap: Partial Payout Remaining Balance
    rationale += ` Smart cap applied: Only ₹${availableBalance} remaining for the week.`;
    approvedAmount = availableBalance;
  }

  return {
    approved: true,
    amount: approvedAmount,
    reason: rationale
  };
}
