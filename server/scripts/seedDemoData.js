import "dotenv/config";
import mongoose from "mongoose";
import { connectMongo } from "../db.js";
import { ClaimModel, WorkerModel } from "../models/index.js";
import { calculateFraudScore } from "../services/fraudDetection.js";

const MONGODB_URI = process.env.MONGODB_URI ?? "";

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function dedupeDay(date) {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

const workerSeeds = [
  {
    name: "Aarav Singh",
    workerType: "delivery",
    location: "Delhi",
    riskLevel: "high",
    riskScore: 82,
    walletBalance: 2780,
    activeTriggers: ["weather_precipitation", "air_quality", "traffic_civic_mock"],
    policy: {
      plan: "premium",
      weeklyPremium: 190,
      active: true,
      startDate: new Date().toISOString().slice(0, 10),
      coverages: ["Weather Disruption", "Pollution Spike", "Traffic Blockage"],
      exclusions: ["War / Civil Unrest", "Fraud / Misrepresentation"],
      maxWeeklyPayout: 3500,
      perClaimLimit: 900,
      smartCapFactor: 1,
    },
    claims: [
      { type: "Weather Disruption", amount: 620, status: "completed", days: 1, reason: "Seeded: heavy rain corridor closure", autoTriggered: true },
      { type: "Traffic Blockage", amount: 410, status: "completed", days: 3, reason: "Seeded: civic diversion pattern", autoTriggered: true },
      { type: "Pollution Spike", amount: 280, status: "processing", days: 0, reason: "Seeded: AQI disruption", autoTriggered: true },
    ],
  },
  {
    name: "Meera Nair",
    workerType: "driver",
    location: "Mumbai",
    riskLevel: "medium",
    riskScore: 61,
    walletBalance: 1980,
    activeTriggers: ["weather_precipitation", "water_logging_hyperlocal"],
    policy: {
      plan: "basic",
      weeklyPremium: 110,
      active: true,
      startDate: new Date().toISOString().slice(0, 10),
      coverages: ["Weather Disruption", "Standard Payout"],
      exclusions: ["War / Civil Unrest", "Fraud / Misrepresentation"],
      maxWeeklyPayout: 2000,
      perClaimLimit: 500,
      smartCapFactor: 0.9,
    },
    claims: [
      { type: "Weather Disruption", amount: 260, status: "completed", days: 2, reason: "Seeded: urban flood impact", autoTriggered: true },
      { type: "Weather Disruption", amount: 190, status: "completed", days: 5, reason: "Seeded: partial disruption payout", autoTriggered: true },
    ],
  },
  {
    name: "Rohan Das",
    workerType: "courier",
    location: "Delhi",
    riskLevel: "high",
    riskScore: 74,
    walletBalance: 3120,
    activeTriggers: ["traffic_civic_mock", "air_quality"],
    policy: {
      plan: "premium",
      weeklyPremium: 175,
      active: true,
      startDate: new Date().toISOString().slice(0, 10),
      coverages: ["Traffic Blockage", "Pollution Spike", "Income Loss Protection"],
      exclusions: ["War / Civil Unrest", "Fraud / Misrepresentation"],
      maxWeeklyPayout: 3500,
      perClaimLimit: 900,
      smartCapFactor: 1,
    },
    claims: [
      { type: "Traffic Blockage", amount: 520, status: "completed", days: 1, reason: "Seeded: high-density corridor disruption", autoTriggered: false },
      { type: "Traffic Blockage", amount: 480, status: "completed", days: 2, reason: "Seeded: repeated claim pattern", autoTriggered: false },
      { type: "Traffic Blockage", amount: 460, status: "completed", days: 4, reason: "Seeded: repeated claim pattern", autoTriggered: false },
      { type: "Pollution Spike", amount: 340, status: "triggered", days: 0, reason: "Seeded: pending settlement", autoTriggered: true },
    ],
  },
  {
    name: "Kabir Chauhan",
    workerType: "delivery",
    location: "Delhi",
    riskLevel: "high",
    riskScore: 88,
    walletBalance: 3560,
    activeTriggers: [],
    policy: {
      plan: "premium",
      weeklyPremium: 220,
      active: true,
      startDate: new Date().toISOString().slice(0, 10),
      coverages: ["Weather Disruption", "Traffic Blockage", "Income Loss Protection"],
      exclusions: ["War / Civil Unrest", "Fraud / Misrepresentation"],
      maxWeeklyPayout: 3500,
      perClaimLimit: 900,
      smartCapFactor: 1,
    },
    claims: [
      { type: "Weather Disruption", amount: 780, status: "completed", days: 1, reason: "Seeded suspicious: weather loss claim", autoTriggered: false },
      { type: "Weather Disruption", amount: 760, status: "completed", days: 2, reason: "Seeded suspicious: weather loss claim", autoTriggered: false },
      { type: "Weather Disruption", amount: 740, status: "processing", days: 3, reason: "Seeded suspicious: weather loss claim", autoTriggered: false },
      { type: "Weather Disruption", amount: 700, status: "triggered", days: 0, reason: "Seeded suspicious: weather loss claim", autoTriggered: false },
    ],
  },
  {
    name: "Nisha Verma",
    workerType: "delivery",
    location: "Delhi",
    riskLevel: "high",
    riskScore: 84,
    walletBalance: 2890,
    activeTriggers: ["traffic_civic_mock", "weather_precipitation"],
    policy: {
      plan: "premium",
      weeklyPremium: 210,
      active: true,
      startDate: new Date().toISOString().slice(0, 10),
      coverages: ["Weather Disruption", "Traffic Blockage"],
      exclusions: ["War / Civil Unrest", "Fraud / Misrepresentation"],
      maxWeeklyPayout: 3500,
      perClaimLimit: 900,
      smartCapFactor: 1,
    },
    claims: [
      { type: "Traffic Blockage", amount: 620, status: "completed", days: 1, reason: "Seeded suspicious: synchronized urban route outage", autoTriggered: false },
      { type: "Traffic Blockage", amount: 600, status: "completed", days: 2, reason: "Seeded suspicious: synchronized urban route outage", autoTriggered: false },
      { type: "Weather Disruption", amount: 690, status: "processing", days: 0, reason: "Seeded suspicious: rapid claim follow-up", autoTriggered: false },
    ],
  },
];

async function createSeedData() {
  if (!MONGODB_URI.trim()) {
    throw new Error("MONGODB_URI is required in .env to run seed script.");
  }
  await connectMongo(MONGODB_URI);

  console.log("[Seed] Connected to MongoDB");

  const workerNames = workerSeeds.map((w) => w.name);
  const existingWorkers = await WorkerModel.find({ name: { $in: workerNames } }, { _id: 1 }).lean();
  const existingIds = existingWorkers.map((w) => w._id);

  if (existingIds.length > 0) {
    await ClaimModel.deleteMany({ workerId: { $in: existingIds } });
    await WorkerModel.deleteMany({ _id: { $in: existingIds } });
    console.log(`[Seed] Removed existing demo records for ${existingIds.length} workers`);
  }

  for (const workerSeed of workerSeeds) {
    const worker = await WorkerModel.create({
      name: workerSeed.name,
      workerType: workerSeed.workerType,
      location: workerSeed.location,
      riskLevel: workerSeed.riskLevel,
      riskScore: workerSeed.riskScore,
      walletBalance: workerSeed.walletBalance,
      activeTriggers: workerSeed.activeTriggers,
      policy: workerSeed.policy,
    });

    for (const [idx, claimSeed] of workerSeed.claims.entries()) {
      const triggeredAt = daysAgo(claimSeed.days);
      const completedAt = claimSeed.status === "completed" ? new Date(triggeredAt.getTime() + 45 * 60 * 1000) : undefined;
      await ClaimModel.create({
        workerId: worker._id,
        externalId: `SEED-${worker.name.split(" ")[0].toUpperCase()}-${idx + 1}-${Date.now()}`,
        type: claimSeed.type,
        amount: claimSeed.amount,
        status: claimSeed.status,
        reason: claimSeed.reason,
        autoTriggered: claimSeed.autoTriggered,
        triggeredAt,
        completedAt,
        dedupeDay: dedupeDay(triggeredAt),
      });
    }

    const fraudState = await calculateFraudScore(worker.toObject());
    await WorkerModel.findByIdAndUpdate(worker._id, {
      $set: { fraudScore: fraudState.fraudScore, fraudMetadata: fraudState.anomalies },
    });
  }

  const seededWorkers = await WorkerModel.find({ name: { $in: workerNames } }, { name: 1, fraudScore: 1 }).lean();
  console.log("[Seed] Demo workers ready:");
  for (const w of seededWorkers) {
    console.log(` - ${w.name} | fraudScore=${Math.round((w.fraudScore ?? 0) * 100)}/100`);
  }
}

createSeedData()
  .then(async () => {
    await mongoose.disconnect();
    console.log("[Seed] Completed.");
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[Seed] Failed:", err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
