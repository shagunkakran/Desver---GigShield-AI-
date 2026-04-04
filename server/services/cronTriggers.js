import { evaluateAllSignals } from "./signalFetchers.js";
import { WorkerModel, ClaimModel } from "../models/index.js";

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
    });
  }

  const aqi = triggers.find((t) => t.id === "air_quality");
  if (aqi?.active) {
    tasks.push({
      type: "Pollution Spike",
      amount: 150,
      reason: "Cron: PM2.5 / AQI signal from Open-Meteo air-quality API",
    });
  }

  const traffic = triggers.find((t) => t.id === "traffic_civic_mock");
  if (traffic?.active) {
    tasks.push({
      type: "Traffic Blockage",
      amount: 200,
      reason: "Cron: mock civic / corridor disruption feed",
    });
  }

  for (const t of tasks) {
    const exists = await ClaimModel.findOne({
      workerId,
      type: t.type,
      dedupeDay: day,
    }).lean();
    if (exists) continue;

    const externalId = `CRON-${t.type.slice(0, 4).toUpperCase()}-${workerId}-${Date.now()}`;
    await ClaimModel.create({
      workerId,
      externalId,
      type: t.type,
      amount: t.amount,
      status: "triggered",
      reason: t.reason,
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
      await WorkerModel.findByIdAndUpdate(workerId, { $inc: { walletBalance: t.amount } });
    }, 4500);
  }
}

export function startTriggerCron() {
  const ms = Number(process.env.CRON_INTERVAL_MS ?? 120000);
  if (ms <= 0) {
    console.log("[GigShield CRON] disabled (CRON_INTERVAL_MS<=0)");
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
          console.warn("[GigShield CRON] worker", w._id, e.message);
        }
      }
    } catch (e) {
      console.warn("[GigShield CRON] tick failed:", e.message);
    }
  };

  console.log(`[GigShield CRON] interval every ${ms}ms (set CRON_INTERVAL_MS to change)`);
  setInterval(tick, ms);
  void tick();
}
