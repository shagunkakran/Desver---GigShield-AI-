import { Router } from "express";
import mongoose from "mongoose";
import { evaluateAllSignals } from "../services/signalFetchers.js";
import { predictDynamicPremium } from "../ml/dynamicPremiumModel.js";
import { predictPremiumSklearn } from "../ml/sklearnBridge.js";
import { WorkerModel, ClaimModel } from "../models/index.js";

const router = Router();

function todayIST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** Hyper-local signals + ML (sklearn via Python when available, else JS) */
router.post("/intelligence/evaluate", async (req, res) => {
  try {
    const location = String(req.body?.location ?? "Delhi");
    const bundle = await evaluateAllSignals(location);
    const { features } = bundle;

    const jsMl = predictDynamicPremium({
      location,
      rainProbabilityNext24h: features.rainProbabilityNext24h,
      aqiRisk: features.aqiRisk,
      publicHolidayIndia: features.publicHolidayIndia,
      mockTrafficDisruption: features.mockTrafficDisruption,
    });

    const sk = await predictPremiumSklearn({
      location,
      rainProbabilityNext24h: features.rainProbabilityNext24h,
      aqiRisk: features.aqiRisk,
      publicHolidayIndia: features.publicHolidayIndia,
      mockTrafficDisruption: features.mockTrafficDisruption,
    });

    const weeklyPremiumDeltaINR = sk.used ? sk.weeklyPremiumDeltaINR : jsMl.weeklyPremiumDeltaINR;
    const extendedCoverageHours = jsMl.extendedCoverageHours;
    const coverageExpl = jsMl.explanations.filter((e) => /coverage/i.test(e));
    const explanations = sk.used ? [...sk.explanations, ...coverageExpl] : jsMl.explanations;

    res.json({
      ...bundle,
      ml: {
        modelId: sk.used ? "gigshield-sklearn-linear-v1" : "gigshield-dyn-premium-v1",
        modelType: sk.used ? "sklearn_linear_regression (Python/JSON)" : "interpretable_linear_risk_pricing (JS)",
        mlSource: sk.used ? "python-sklearn" : "javascript-fallback",
        sklearnNote: sk.note ?? null,
        weeklyPremiumDeltaINR,
        extendedCoverageHours,
        featureVector: sk.used ? sk.featureVector : jsMl.featureVector,
        explanations,
      },
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.post("/workers/register", async (req, res) => {
  try {
    const { name, workerType, location, riskLevel, riskScore } = req.body ?? {};
    if (!name || !workerType || !location) {
      return res.status(400).json({ error: "name, workerType, location required" });
    }
    const doc = await WorkerModel.create({
      name,
      workerType,
      location,
      riskLevel,
      riskScore,
      walletBalance: 1250,
      activeTriggers: [],
    });
    res.json({ id: doc._id.toString(), persisted: "mongodb" });
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

/** Full session for client hydrate */
router.get("/workers/:id/state", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "invalid worker id" });
    }
    const worker = await WorkerModel.findById(id).lean();
    if (!worker) return res.status(404).json({ error: "worker not found" });

    const claims = await ClaimModel.find({ workerId: id }).sort({ triggeredAt: -1 }).limit(100).lean();

    const profile = {
      name: worker.name,
      workerType: worker.workerType,
      location: worker.location,
      riskLevel: worker.riskLevel,
      riskScore: worker.riskScore,
      registered: true,
      serverId: id,
    };

    const claimsOut = claims.map((c) => ({
      id: c.externalId,
      type: c.type,
      amount: c.amount,
      status: c.status,
      triggeredAt: c.triggeredAt ? new Date(c.triggeredAt).toLocaleTimeString() : "",
      completedAt: c.completedAt ? new Date(c.completedAt).toLocaleTimeString() : undefined,
      reason: c.reason ?? "",
      autoTriggered: Boolean(c.autoTriggered),
    }));

    res.json({
      profile,
      policy: worker.policy ?? null,
      claims: claimsOut,
      walletBalance: worker.walletBalance ?? 1250,
      activeTriggers: worker.activeTriggers ?? [],
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.put("/workers/:id/policy", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "invalid worker id" });
    }
    const policy = req.body?.policy;
    if (!policy?.plan) {
      return res.status(400).json({ error: "policy object with plan required" });
    }
    const w = await WorkerModel.findByIdAndUpdate(
      id,
      { $set: { policy } },
      { new: true }
    ).lean();
    if (!w) return res.status(404).json({ error: "worker not found" });
    res.json({ ok: true, policy: w.policy });
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.put("/workers/:id/session", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "invalid worker id" });
    }
    const { walletBalance, activeTriggers } = req.body ?? {};
    const $set = {};
    if (typeof walletBalance === "number") $set.walletBalance = walletBalance;
    if (Array.isArray(activeTriggers)) $set.activeTriggers = activeTriggers;
    if (Object.keys($set).length === 0) {
      return res.status(400).json({ error: "walletBalance and/or activeTriggers required" });
    }
    const w = await WorkerModel.findByIdAndUpdate(id, { $set }, { new: true }).lean();
    if (!w) return res.status(404).json({ error: "worker not found" });
    res.json({ ok: true, walletBalance: w.walletBalance, activeTriggers: w.activeTriggers });
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.post("/workers/:id/claims", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "invalid worker id" });
    }
    const { externalId, type, amount, status, reason, autoTriggered } = req.body ?? {};
    if (!type || amount == null) {
      return res.status(400).json({ error: "type and amount required" });
    }
    const ext = externalId ?? `CLM-${Date.now()}`;
    const dedupeDay = todayIST();
    const row = {
      workerId: id,
      externalId: ext,
      type,
      amount: Number(amount),
      status: status ?? "triggered",
      reason: reason ?? "",
      autoTriggered: Boolean(autoTriggered),
      triggeredAt: new Date(),
      dedupeDay,
    };
    const doc = await ClaimModel.create(row);
    res.json({ id: doc._id.toString(), externalId: ext, persisted: "mongodb" });
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.patch("/workers/:id/claims/external/:externalId", async (req, res) => {
  try {
    const { id, externalId } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "invalid worker id" });
    }
    const { status, completedAt, walletCredit } = req.body ?? {};
    const $set = {};
    if (status) $set.status = status;
    if (completedAt) $set.completedAt = new Date(completedAt);
    const claim = await ClaimModel.findOneAndUpdate(
      { workerId: id, externalId },
      { $set },
      { new: true }
    ).lean();
    if (!claim) return res.status(404).json({ error: "claim not found" });

    if (walletCredit && status === "completed") {
      await WorkerModel.findByIdAndUpdate(id, { $inc: { walletBalance: Number(walletCredit) } });
    }

    res.json({ ok: true, claim });
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.get("/workers", async (_req, res) => {
  try {
    const list = await WorkerModel.find().sort({ registeredAt: -1 }).limit(50).lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "gigshield-api", mongo: true });
});

export default router;
