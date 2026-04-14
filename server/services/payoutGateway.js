function gatewayPrefix(gateway) {
  if (gateway === "stripe") return "STR";
  if (gateway === "upi") return "UPI";
  return "RZP";
}

function normalizeGateway(gateway) {
  return ["razorpay", "stripe", "upi"].includes(gateway) ? gateway : "razorpay";
}

/**
 * Simulated instant payout provider.
 * Mimics third-party response shape for demo and hackathon storytelling.
 */
export async function simulateInstantPayout({ gateway = "razorpay", claimId, workerId, amount }) {
  const provider = normalizeGateway(gateway);
  const payoutAmount = Number(amount ?? 0);
  if (!Number.isFinite(payoutAmount) || payoutAmount <= 0) {
    throw new Error("invalid payout amount");
  }
  const reference = `${gatewayPrefix(provider)}-${Date.now()}-${String(claimId).slice(-6)}`;
  const latencyMs = provider === "upi" ? 350 : provider === "stripe" ? 520 : 430;

  await new Promise((resolve) => setTimeout(resolve, latencyMs));

  return {
    ok: true,
    provider,
    reference,
    amount: payoutAmount,
    currency: "INR",
    status: "captured",
    settledAt: new Date().toISOString(),
    beneficiary: String(workerId),
    sandbox: true,
  };
}
