import { evaluateAllSignals } from "./signalFetchers.js";
import { WorkerModel, ClaimModel } from "../models/index.js";
import { enforcePolicyLimits } from "./policyEngine.js";

function todayIST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/**
 * Auto-create claims from live signals for workers with an active policy (server-side, no UI click).
 */
async function maybeCreateClaims(worker, bundle) {
  const workerId = worker._id;
  const day = todayIST();
  const triggers = bundle.triggers ?? [];

  const tasks = [];

  const rain = triggers.find((t) => t.id === "weather_precipitation");
  if (rain?.active) {
    tasks.push({
      type: "Weather Disruption",
      amount: 300,
      reason: "Cron: precipitation signal from Open-Meteo — automated income-loss claim",
      weakSignal: Boolean(rain.weakSignal),
    });
  }

  const aqi = triggers.find((t) => t.id === "air_quality");
  if (aqi?.active) {
    tasks.push({
      type: "Pollution Spike",
      amount: 150,
      reason: "Cron: PM2.5 / AQI signal from Open-Meteo air-quality API",
      weakSignal: Boolean(aqi.weakSignal),
    });
  }

  const traffic = triggers.find((t) => t.id === "traffic_civic_mock");
  if (traffic?.active) {
    tasks.push({
      type: "Traffic Blockage",
      amount: 200,
      reason: "Cron: mock civic / corridor disruption feed",
      weakSignal: Boolean(traffic.weakSignal),
    });
  }

  for (const t of tasks) {
    const exists = await ClaimModel.findOne({
      workerId,
      type: t.type,
      dedupeDay: day,
    }).lean();
    if (exists) continue;

    // Edge Case handling: weak signal or partial disruption => partial payout.
    let requestedAmount = t.amount;
    if (t.weakSignal || bundle.weakSignalMode) {
      requestedAmount = Math.floor(requestedAmount * 0.5);
    }

    // Policy Engine Limits Check
    const limitCheck = await enforcePolicyLimits(worker, requestedAmount);
    if (!limitCheck.approved) {
      console.log(`[Cron] Skipped payout for ${workerId}: ${limitCheck.reason}`);
      continue;
    }

    const externalId = `CRON-${t.type.slice(0, 4).toUpperCase()}-${workerId}-${Date.now()}`;
    await ClaimModel.create({
      workerId,
      externalId,
      type: t.type,
      amount: limitCheck.amount,
      status: "triggered",
      reason: `${t.reason} | ${limitCheck.reason}`,
      autoTriggered: true,
      triggeredAt: new Date(),
      dedupeDay: day,
    });

    /** Fast-forward to completed + credit wallet (demo zero-touch payout) */
    setTimeout(async () => {
      await ClaimModel.findOneAndUpdate(
        { workerId, externalId },
        { $set: { status: "processing" } }
      );
    }, 1500);

    setTimeout(async () => {
      await ClaimModel.findOneAndUpdate(
        { workerId, externalId },
        { $set: { status: "completed", completedAt: new Date() } }
      );
      await WorkerModel.findByIdAndUpdate(workerId, { $inc: { walletBalance: limitCheck.amount } });
    }, 4500);
  }
}

export function startTriggerCron() {
  const ms = Number(process.env.CRON_INTERVAL_MS ?? 120000);
  if (ms <= 0) {
    console.log("[Desver CRON] disabled (CRON_INTERVAL_MS<=0)");
    return;
  }

  const tick = async () => {
    try {
      const workers = await WorkerModel.find({
        "policy.active": true,
        "policy.plan": { $exists: true },
      }).lean();

      for (const w of workers) {
        try {
          const bundle = await evaluateAllSignals(w.location);
          await maybeCreateClaims(w, bundle);
        } catch (e) {
          console.warn("[Desver CRON] worker", w._id, e.message);
        }
      }
    } catch (e) {
      console.warn("[Desver CRON] tick failed:", e.message);
    }
  };

  console.log(`[Desver CRON] interval every ${ms}ms (set CRON_INTERVAL_MS to change)`);
  setInterval(tick, ms);
  void tick();
}
