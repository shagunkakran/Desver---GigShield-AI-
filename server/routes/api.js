import { Router } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { evaluateAllSignals } from "../services/signalFetchers.js";
import { predictDynamicPremium } from "../ml/dynamicPremiumModel.js";
import { predictPremiumSklearn } from "../ml/sklearnBridge.js";
import { WorkerModel, ClaimModel, AdminActionModel, SystemConfigModel } from "../models/index.js";
import { calculateFraudScore } from "../services/fraudDetection.js";
import { enforcePolicyLimits } from "../services/policyEngine.js";
import { simulateInstantPayout } from "../services/payoutGateway.js";

const router = Router();
const AUTH_SECRET = process.env.AUTH_JWT_SECRET || "desver-dev-secret-change-me";
const AUTO_FLAG_FRAUD_SCORE_THRESHOLD = Number(process.env.AUTO_FLAG_FRAUD_SCORE_THRESHOLD ?? 0.65);
const AUTO_FLAG_NEAR_LIMIT_RATIO = Number(process.env.AUTO_FLAG_NEAR_LIMIT_RATIO ?? 0.9);
const AUTO_FLAG_CLAIMS_24H_THRESHOLD = Number(process.env.AUTO_FLAG_CLAIMS_24H_THRESHOLD ?? 3);
const AUTO_FLAG_REPEAT_TYPE_7D_THRESHOLD = Number(process.env.AUTO_FLAG_REPEAT_TYPE_7D_THRESHOLD ?? 4);
const AUTO_FLAG_WEAK_SIGNAL_ENABLED = String(process.env.AUTO_FLAG_WEAK_SIGNAL_ENABLED ?? "1") !== "0";
const AUTO_FLAG_CONFIG_KEY = "auto_flag_rules";
const AUTO_FLAG_LAST_AUTOTUNE_KEY = "auto_flag_last_autotune";
const SUPER_ADMIN_EMAILS = String(process.env.SUPER_ADMIN_EMAILS ?? "")
  .split(",")
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);

function createAuthToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role ?? "worker",
      email: user.email,
      name: user.name,
    },
    AUTH_SECRET,
    { expiresIn: "7d" }
  );
}

function requireAuth(req, res, next) {
  try {
    const raw = String(req.headers.authorization ?? "");
    const token = raw.startsWith("Bearer ") ? raw.slice(7) : "";
    if (!token) return res.status(401).json({ error: "missing auth token" });
    const payload = jwt.verify(token, AUTH_SECRET);
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "invalid or expired auth token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.auth?.role !== "admin") {
    return res.status(403).json({ error: "admin access required" });
  }
  return next();
}

function isSuperAdminAuth(req) {
  const email = String(req.auth?.email ?? "").toLowerCase();
  return email.length > 0 && SUPER_ADMIN_EMAILS.includes(email);
}

function requireSuperAdmin(req, res, next) {
  if (!isSuperAdminAuth(req)) {
    return res.status(403).json({ error: "super-admin access required" });
  }
  return next();
}

async function logAdminAction(req, action) {
  try {
    const adminId = req.auth?.sub;
    const adminEmail = req.auth?.email ?? "unknown-admin";
    if (!adminId) return;
    await AdminActionModel.create({
      adminId,
      adminEmail,
      actionType: action.actionType,
      targetType: action.targetType,
      targetId: action.targetId,
      note: action.note ?? "",
      metadata: action.metadata ?? {},
    });
  } catch {
    /* non-blocking log write */
  }
}

function todayIST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function computeTomorrowRiskPrediction(worker, fraudState) {
  const riskScore = Number(worker.riskScore ?? 50) / 100;
  const anomalyPressure = Number(fraudState?.fraudScore ?? 0);
  const base = Math.min(0.95, (riskScore * 0.6) + (anomalyPressure * 0.4));
  const probability = Math.round(base * 100);
  const recommendation =
    probability >= 70
      ? "High disruption probability. Keep premium coverage active and avoid high-risk zones."
      : probability >= 45
        ? "Moderate risk outlook. Keep fallback payout protection enabled."
        : "Low disruption probability. Continue normal operations with monitoring.";

  return {
    probabilityPct: probability,
    confidence: Math.max(55, Math.round((1 - Math.abs(0.5 - base)) * 100)),
    recommendation,
  };
}

function cityExpectedWeatherRatio(location) {
  const city = String(location ?? "").trim().toLowerCase();
  const map = {
    delhi: 0.22,
    mumbai: 0.31,
    bangalore: 0.19,
    bengaluru: 0.19,
    kolkata: 0.28,
    chennai: 0.24,
    pune: 0.18,
    hyderabad: 0.2,
    noida: 0.21,
    gurgaon: 0.21,
  };
  return map[city] ?? 0.2;
}

function getNextWeekResetAt() {
  const now = new Date();
  const reset = new Date(now);
  const day = now.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const daysUntilMonday = (8 - day) % 7 || 7;
  reset.setDate(now.getDate() + daysUntilMonday);
  reset.setHours(0, 0, 0, 0);
  return reset;
}

async function evaluateAutoReviewFlag({ worker, type, finalAmount, weakSignal }) {
  const config = await getAutoFlagConfig();
  const reasons = [];
  const fraudScore = Number(worker.fraudScore ?? 0);
  const perClaimLimit = Number(worker.policy?.perClaimLimit ?? 500);

  if (fraudScore >= config.fraudScoreThreshold) {
    reasons.push(`high_fraud_score:${fraudScore.toFixed(2)}`);
  }
  if (perClaimLimit > 0 && finalAmount >= perClaimLimit * config.nearLimitRatio) {
    reasons.push("high_payout_near_policy_limit");
  }
  if (config.weakSignalEnabled && weakSignal) {
    reasons.push("weak_signal_claim");
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [recentClaimCount, repeatedTypeCount] = await Promise.all([
    ClaimModel.countDocuments({ workerId: worker._id, triggeredAt: { $gte: oneDayAgo } }),
    ClaimModel.countDocuments({ workerId: worker._id, type, triggeredAt: { $gte: oneWeekAgo } }),
  ]);

  if (recentClaimCount >= config.claims24hThreshold) {
    reasons.push(`high_claim_velocity_24h:${recentClaimCount}`);
  }
  if (repeatedTypeCount >= config.repeatType7dThreshold) {
    reasons.push(`repeated_claim_type_7d:${repeatedTypeCount}`);
  }

  return {
    reviewRequired: reasons.length > 0,
    reasons,
  };
}

function sanitizeAutoFlagConfig(input = {}) {
  const fraudScoreThreshold = Number(input.fraudScoreThreshold ?? AUTO_FLAG_FRAUD_SCORE_THRESHOLD);
  const nearLimitRatio = Number(input.nearLimitRatio ?? AUTO_FLAG_NEAR_LIMIT_RATIO);
  const claims24hThreshold = Number(input.claims24hThreshold ?? AUTO_FLAG_CLAIMS_24H_THRESHOLD);
  const repeatType7dThreshold = Number(input.repeatType7dThreshold ?? AUTO_FLAG_REPEAT_TYPE_7D_THRESHOLD);
  const weakSignalEnabled = typeof input.weakSignalEnabled === "boolean"
    ? input.weakSignalEnabled
    : AUTO_FLAG_WEAK_SIGNAL_ENABLED;

  return {
    fraudScoreThreshold: Math.min(1, Math.max(0, fraudScoreThreshold)),
    nearLimitRatio: Math.min(1, Math.max(0.5, nearLimitRatio)),
    claims24hThreshold: Math.min(20, Math.max(1, Math.round(claims24hThreshold))),
    repeatType7dThreshold: Math.min(30, Math.max(1, Math.round(repeatType7dThreshold))),
    weakSignalEnabled: Boolean(weakSignalEnabled),
  };
}

async function getAutoFlagConfig() {
  const doc = await SystemConfigModel.findOne({ key: AUTO_FLAG_CONFIG_KEY }).lean();
  if (!doc?.value) return sanitizeAutoFlagConfig({});
  return sanitizeAutoFlagConfig(doc.value);
}

async function maybeAutoTightenForWeatherAbuse({
  weatherAlertLabel,
  weatherAbuseDelta,
  actorAuth,
}) {
  if (weatherAlertLabel !== "High") return null;
  const todayKey = new Date().toISOString().slice(0, 10);
  const marker = await SystemConfigModel.findOne({ key: AUTO_FLAG_LAST_AUTOTUNE_KEY }).lean();
  if (marker?.value?.day === todayKey) return null;

  const current = await getAutoFlagConfig();
  const tightened = sanitizeAutoFlagConfig({
    ...current,
    fraudScoreThreshold: Math.max(0.45, current.fraudScoreThreshold - 0.05),
    nearLimitRatio: Math.max(0.8, current.nearLimitRatio - 0.03),
    claims24hThreshold: Math.max(2, current.claims24hThreshold - 1),
    repeatType7dThreshold: Math.max(3, current.repeatType7dThreshold - 1),
    weakSignalEnabled: true,
  });

  await Promise.all([
    SystemConfigModel.findOneAndUpdate(
      { key: AUTO_FLAG_CONFIG_KEY },
      { $set: { value: tightened, updatedAt: new Date() } },
      { upsert: true }
    ),
    SystemConfigModel.findOneAndUpdate(
      { key: AUTO_FLAG_LAST_AUTOTUNE_KEY },
      { $set: { value: { day: todayKey, weatherAbuseDelta, tightenedAt: new Date().toISOString() }, updatedAt: new Date() } },
      { upsert: true }
    ),
  ]);

  if (actorAuth?.sub) {
    await AdminActionModel.create({
      adminId: actorAuth.sub,
      adminEmail: actorAuth.email ?? "system-autotune",
      actionType: "auto_flag_autotune_weather_abuse",
      targetType: "system_config",
      targetId: AUTO_FLAG_CONFIG_KEY,
      note: "Auto-tightened thresholds due to high weather abuse signal.",
      metadata: {
        weatherAbuseDelta,
        previous: current,
        updated: tightened,
      },
    });
  }
  return tightened;
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
        modelId: sk.used ? "desver-sklearn-linear-v1" : "desver-dyn-premium-v1",
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
    const { name, email, password, workerType, location, riskLevel, riskScore, role = "worker" } = req.body ?? {};
    if (!name || !email || !password || !workerType || !location) {
      return res.status(400).json({ error: "name, email, password, workerType, location required" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "password must be at least 6 characters" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const exists = await WorkerModel.findOne({ email: normalizedEmail }).lean();
    if (exists) {
      return res.status(409).json({ error: "email already registered" });
    }
    const passwordHash = await bcrypt.hash(String(password), 10);
    const doc = await WorkerModel.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role: role === "admin" ? "admin" : "worker",
      workerType,
      location,
      riskLevel,
      riskScore,
      walletBalance: 1250,
      activeTriggers: [],
    });
    const token = createAuthToken(doc);
    res.json({ id: doc._id.toString(), persisted: "mongodb", token });
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.post("/admins/register", async (req, res) => {
  try {
    const { name, email, password, location } = req.body ?? {};
    if (!name || !email || !password || !location) {
      return res.status(400).json({ error: "name, email, password and location required" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "password must be at least 6 characters" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const exists = await WorkerModel.findOne({ email: normalizedEmail }).lean();
    if (exists) {
      return res.status(409).json({ error: "email already registered" });
    }
    const passwordHash = await bcrypt.hash(String(password), 10);
    const doc = await WorkerModel.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role: "admin",
      workerType: "freelance",
      location,
      riskLevel: "low",
      riskScore: 20,
      walletBalance: 0,
      activeTriggers: [],
    });
    const token = createAuthToken(doc);
    res.json({ id: doc._id.toString(), persisted: "mongodb", role: "admin", token });
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password, role } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedRole = role === "admin" ? "admin" : role === "worker" ? "worker" : undefined;
    const doc = await WorkerModel.findOne({
      email: normalizedEmail,
      ...(normalizedRole ? { role: normalizedRole } : {}),
    });

    if (!doc) {
      return res.status(404).json({ error: "account not found. please register first." });
    }
    const ok = await bcrypt.compare(String(password), doc.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const token = createAuthToken(doc);
    res.json({
      id: String(doc._id),
      name: doc.name,
      email: doc.email,
      role: doc.role ?? "worker",
      workerType: doc.workerType,
      location: doc.location,
      riskLevel: doc.riskLevel,
      riskScore: Number(doc.riskScore ?? 50),
      token,
    });
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
      email: worker.email,
      workerType: worker.workerType,
      location: worker.location,
      riskLevel: worker.riskLevel,
      riskScore: worker.riskScore,
      role: worker.role ?? "worker",
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
      payout: c.payout
        ? {
            provider: c.payout.provider ?? null,
            reference: c.payout.reference ?? null,
            status: c.payout.status ?? null,
            settledAt: c.payout.settledAt ?? null,
            amount: Number(c.payout.amount ?? 0),
            currency: c.payout.currency ?? "INR",
            sandbox: Boolean(c.payout.sandbox),
          }
        : null,
    }));

    // Generate Fraud Score dynamically for demo
    const fraudState = await calculateFraudScore(worker);
    await WorkerModel.findByIdAndUpdate(id, {
      $set: { fraudScore: fraudState.fraudScore, fraudMetadata: fraudState.anomalies }
    });

    const tomorrowRisk = computeTomorrowRiskPrediction(worker, fraudState);

    res.json({
      profile: { ...profile, fraudScore: fraudState.fraudScore },
      policy: worker.policy ?? null,
      claims: claimsOut,
      walletBalance: worker.walletBalance ?? 1250,
      activeTriggers: worker.activeTriggers ?? [],
      fraudState,
      tomorrowRisk,
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
    const { externalId, type, amount, status, reason, autoTriggered, weakSignal = false, reviewRequired = false } = req.body ?? {};
    if (!type || amount == null) {
      return res.status(400).json({ error: "type and amount required" });
    }

    const worker = await WorkerModel.findById(id).lean();
    if (!worker) return res.status(404).json({ error: "worker not found" });

    let requestedAmount = Number(amount);
    if (weakSignal) {
      requestedAmount = Math.floor(requestedAmount * 0.5);
    }

    // Enforce Policy Limits & Smart Caps
    const limitCheck = await enforcePolicyLimits(worker, requestedAmount);
    if (!limitCheck.approved) {
       return res.status(400).json({ error: limitCheck.reason });
    }

    const finalAmount = limitCheck.amount;
    const approvalReason = reason
      ? `${reason}${weakSignal ? " | weak signal partial payout (50%)" : ""} | ${limitCheck.reason}`
      : `${weakSignal ? "weak signal partial payout (50%) | " : ""}${limitCheck.reason}`;

    const ext = externalId ?? `CLM-${Date.now()}`;
    const dedupeDay = todayIST();
    const autoReview = await evaluateAutoReviewFlag({
      worker,
      type,
      finalAmount,
      weakSignal: Boolean(weakSignal),
    });
    const adminReviewRequired = Boolean(reviewRequired) || autoReview.reviewRequired;
    const allReviewFlags = [
      ...autoReview.reasons,
      ...(Boolean(reviewRequired) ? ["manual_review_requested"] : []),
    ];
    const reasonWithFlags =
      allReviewFlags.length > 0 ? `${approvalReason} | review flags: ${allReviewFlags.join(", ")}` : approvalReason;

    const row = {
      workerId: id,
      externalId: ext,
      type,
      amount: finalAmount,
      status: status ?? "triggered",
      decisionSource: "ai",
      adminReviewRequired,
      reviewFlags: allReviewFlags,
      reason: reasonWithFlags,
      autoTriggered: Boolean(autoTriggered),
      triggeredAt: new Date(),
      dedupeDay,
    };
    const doc = await ClaimModel.create(row);
    res.json({
      id: doc._id.toString(),
      externalId: ext,
      persisted: "mongodb",
      amount: finalAmount,
      limitReason: limitCheck.reason,
      adminReviewRequired,
      reviewFlags: allReviewFlags,
    });
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

router.post("/workers/:id/claims/external/:externalId/instant-payout", async (req, res) => {
  try {
    const { id, externalId } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "invalid worker id" });
    }

    const claim = await ClaimModel.findOne({ workerId: id, externalId }).lean();
    if (!claim) return res.status(404).json({ error: "claim not found" });
    const idempotencyKey = String(req.body?.idempotencyKey ?? req.headers["x-idempotency-key"] ?? "").trim();

    if (claim.status === "completed") {
      if (idempotencyKey && claim.payout?.idempotencyKey === idempotencyKey) {
        return res.json({
          ok: true,
          payout: claim.payout,
          claim: {
            externalId: claim.externalId,
            status: claim.status,
            completedAt: claim.completedAt,
            amount: claim.amount,
            reason: claim.reason ?? "",
          },
          idempotentReplay: true,
        });
      }
      return res.status(400).json({ error: "claim already completed" });
    }
    if (claim.payout?.processing) {
      return res.status(409).json({ error: "instant payout already in progress for this claim" });
    }

    const gateway = String(req.body?.gateway ?? "razorpay").toLowerCase();
    const claimedForPayout = await ClaimModel.findOneAndUpdate(
      {
        workerId: id,
        externalId,
        status: { $ne: "completed" },
        "payout.processing": { $ne: true },
      },
      {
        $set: {
          "payout.processing": true,
          "payout.requestedAt": new Date(),
          ...(idempotencyKey ? { "payout.idempotencyKey": idempotencyKey } : {}),
        },
        $inc: { payoutAttempts: 1 },
      },
      { new: true }
    ).lean();

    if (!claimedForPayout) {
      return res.status(409).json({ error: "claim payout lock failed. please retry shortly." });
    }

    try {
      const payout = await simulateInstantPayout({
        gateway,
        claimId: externalId,
        workerId: id,
        amount: Number(claimedForPayout.amount ?? 0),
      });

      await ClaimModel.findOneAndUpdate(
        { workerId: id, externalId },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
            reason: `${claimedForPayout.reason ?? ""} | instant payout via ${payout.provider} (${payout.reference})`,
            payout: {
              provider: payout.provider,
              reference: payout.reference,
              status: payout.status,
              settledAt: payout.settledAt,
              amount: Number(payout.amount ?? 0),
              currency: payout.currency ?? "INR",
              sandbox: Boolean(payout.sandbox),
              idempotencyKey: idempotencyKey || undefined,
              processing: false,
            },
          },
        }
      );

      await WorkerModel.findByIdAndUpdate(id, { $inc: { walletBalance: Number(claimedForPayout.amount ?? 0) } });
      const latest = await ClaimModel.findOne({ workerId: id, externalId }).lean();
      res.json({
        ok: true,
        payout,
        claim: {
          externalId: latest?.externalId ?? externalId,
          status: latest?.status ?? "completed",
          completedAt: latest?.completedAt,
          amount: Number(latest?.amount ?? claimedForPayout.amount ?? 0),
          reason: latest?.reason ?? "",
        },
      });
    } catch (error) {
      await ClaimModel.findOneAndUpdate(
        { workerId: id, externalId },
        {
          $set: {
            "payout.processing": false,
            "payout.errorMessage": String(error instanceof Error ? error.message : error),
          },
        }
      );
      throw error;
    }
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.get("/workers", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const list = await WorkerModel.find().sort({ registeredAt: -1 }).limit(50).lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.get("/workers/:id/fraud", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "invalid worker id" });
    }
    const worker = await WorkerModel.findById(id).lean();
    if (!worker) return res.status(404).json({ error: "worker not found" });

    const fraudState = await calculateFraudScore(worker);
    await WorkerModel.findByIdAndUpdate(id, {
      $set: { fraudScore: fraudState.fraudScore, fraudMetadata: fraudState.anomalies },
    });

    res.json(fraudState);
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.get("/admin/analytics", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const workers = await WorkerModel.find().lean();
    const claims = await ClaimModel.find().sort({ triggeredAt: -1 }).lean();

    const totalPremiumWeekly = workers.reduce((s, w) => s + Number(w.policy?.weeklyPremium ?? 0), 0);
    const totalPayout = claims
      .filter((c) => c.status === "completed")
      .reduce((s, c) => s + Number(c.amount ?? 0), 0);
    const lossRatio = totalPremiumWeekly > 0 ? Number((totalPayout / totalPremiumWeekly).toFixed(2)) : 0;

    const byType = {};
    for (const c of claims) {
      byType[c.type] = (byType[c.type] ?? 0) + Number(c.amount ?? 0);
    }
    const lossByType = Object.entries(byType).map(([type, amount]) => ({ type, amount }));

    const avgRisk = workers.length
      ? workers.reduce((s, w) => s + Number(w.riskScore ?? 50), 0) / workers.length
      : 50;
    const recentClaims = claims.filter((c) => new Date(c.triggeredAt).getTime() >= (Date.now() - (7 * 24 * 60 * 60 * 1000)));
    const weatherClaims = recentClaims.filter((c) => /weather|rain|flood/i.test(String(c.type) + String(c.reason))).length;
    const disruptionPressure = Math.min(1, (recentClaims.length / Math.max(1, workers.length * 2)));
    const predictionScore = Math.min(100, Math.round((avgRisk * 0.55) + (weatherClaims * 7) + (disruptionPressure * 25)));

    const weeklyTrend = ["W-5", "W-4", "W-3", "W-2", "W-1", "Current"].map((week, i) => ({
      week,
      expectedClaims: Math.max(1, Math.round((predictionScore / 22) + i * 0.8)),
      expectedPayout: Math.round((predictionScore * 12) + (i * 220)),
    }));

    const workerRows = workers.map((w) => {
      const wClaims = claims.filter((c) => String(c.workerId) === String(w._id));
      const completed = wClaims.filter((c) => c.status === "completed");
      const totalPayoutByWorker = completed.reduce((sum, c) => sum + Number(c.amount ?? 0), 0);
      const latestClaim = wClaims.length > 0 ? wClaims[0] : null;
      return {
        workerId: String(w._id),
        name: w.name,
        workerType: w.workerType,
        location: w.location,
        plan: w.policy?.plan ?? "none",
        weeklyPremium: Number(w.policy?.weeklyPremium ?? 0),
        claimsTotal: wClaims.length,
        claimsCompleted: completed.length,
        totalPayout: totalPayoutByWorker,
        fraudScore: Math.round(Number(w.fraudScore ?? 0) * 100),
        lastClaimAt: latestClaim?.triggeredAt ?? null,
      };
    }).sort((a, b) => b.totalPayout - a.totalPayout);

    res.json({
      totals: {
        workers: workers.length,
        claims: claims.length,
        completedClaims: claims.filter((c) => c.status === "completed").length,
        totalPremiumWeekly,
        totalPayout,
        lossRatio,
      },
      lossByType,
      nextWeekPrediction: {
        score: predictionScore,
        likelyClaims: Math.max(2, Math.round(predictionScore / 18)),
        likelyPayout: Math.round(predictionScore * 15),
      },
      weeklyTrend,
      workers: workerRows,
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.get("/admin/dashboard", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const workers = await WorkerModel.find().lean();
    const claims = await ClaimModel.find().sort({ triggeredAt: -1 }).lean();

    const workerById = new Map(workers.map((w) => [String(w._id), w]));
    const policiesActive = workers.filter((w) => Boolean(w.policy?.active));
    const totalPolicies = policiesActive.length;
    const totalPremium = policiesActive.reduce((sum, w) => sum + Number(w.policy?.weeklyPremium ?? 0), 0);
    const totalPayout = claims
      .filter((c) => c.status === "completed")
      .reduce((sum, c) => sum + Number(c.amount ?? 0), 0);
    const totalProfit = totalPremium - totalPayout;
    const weatherClaims = claims.filter((c) =>
      /weather|rain|flood|storm|heatwave|hail/i.test(String(c.type) + String(c.reason))
    );
    const disruptionClaims = claims.filter((c) =>
      /traffic|block|pollution|disruption|strike|inactivity/i.test(String(c.type) + String(c.reason))
    );
    const weatherClaimRatio = claims.length > 0 ? weatherClaims.length / claims.length : 0;
    const expectedWeatherRatio =
      workers.length > 0
        ? workers.reduce((sum, w) => sum + cityExpectedWeatherRatio(w.location), 0) / workers.length
        : 0.2;
    const weatherAbuseDelta = Math.max(0, weatherClaimRatio - expectedWeatherRatio);
    const weatherAlertLabel =
      weatherAbuseDelta >= 0.2 ? "High"
      : weatherAbuseDelta >= 0.1 ? "Medium"
      : "Low";
    const autoTunedConfig = await maybeAutoTightenForWeatherAbuse({
      weatherAlertLabel,
      weatherAbuseDelta: Number(weatherAbuseDelta.toFixed(3)),
      actorAuth: _req.auth,
    });

    const usersTable = workers
      .map((w) => ({
        id: String(w._id),
        name: w.name,
        role: w.role ?? "worker",
        zone: w.location,
        riskLevel: w.riskLevel ?? "medium",
        riskScore: Number(w.riskScore ?? 50),
        policyActive: Boolean(w.policy?.active),
        weeklyPremium: Number(w.policy?.weeklyPremium ?? 0),
        fraudScore: Math.round(Number(w.fraudScore ?? 0) * 100),
        fraudLabel:
          Number(w.fraudScore ?? 0) < 0.3
            ? "Safe"
            : Number(w.fraudScore ?? 0) < 0.7
              ? "Suspicious"
              : "Risky",
      }))
      .sort((a, b) => b.fraudScore - a.fraudScore);

    const claimsTable = claims.slice(0, 200).map((c) => {
      const w = workerById.get(String(c.workerId));
      return {
        id: String(c._id),
        user: w?.name ?? "Unknown",
        amount: Number(c.amount ?? 0),
        status: c.status ?? "pending",
        decisionSource: c.decisionSource ?? "ai",
        adminReviewRequired: Boolean(c.adminReviewRequired),
        reviewFlags: Array.isArray(c.reviewFlags) ? c.reviewFlags : [],
        reason: c.reason ?? "",
        date: c.triggeredAt ?? null,
      };
    });

    const payoutsTable = claims
      .filter((c) => c.payout && (c.payout.reference || c.payout.processing || c.payout.errorMessage))
      .slice(0, 200)
      .map((c) => {
        const w = workerById.get(String(c.workerId));
        return {
          claimId: String(c._id),
          externalId: c.externalId ?? "",
          user: w?.name ?? "Unknown",
          amount: Number(c.payout?.amount ?? c.amount ?? 0),
          gateway: String(c.payout?.provider ?? "-"),
          reference: String(c.payout?.reference ?? "-"),
          status: c.payout?.processing
            ? "processing"
            : String(c.payout?.status ?? (c.status === "completed" ? "captured" : "pending")),
          settledAt: c.payout?.settledAt ?? c.completedAt ?? null,
          attempts: Number(c.payoutAttempts ?? 0),
          failureReason: c.payout?.errorMessage ?? "",
          sandbox: Boolean(c.payout?.sandbox),
        };
      });

    const completedClaims = claims.filter((c) => c.status === "completed");
    const projectedWeeklyPremium = Math.round(totalPremium * (workers.length > 0 ? 1.04 : 1));
    const currentLossRatio = totalPremium > 0 ? totalPayout / totalPremium : 0;
    const weatherPayout = weatherClaims.reduce((sum, c) => sum + Number(c.amount ?? 0), 0);
    const disruptionPayout = disruptionClaims.reduce((sum, c) => sum + Number(c.amount ?? 0), 0);
    const avgClaimPayout =
      completedClaims.length > 0
        ? completedClaims.reduce((sum, c) => sum + Number(c.amount ?? 0), 0) / completedClaims.length
        : 250;
    const likelyWeatherClaims = Math.max(1, Math.round((weatherClaims.length / 4) * (1 + weatherAbuseDelta)));
    const likelyDisruptionClaims = Math.max(1, Math.round((disruptionClaims.length / 4) * (1 + weatherAbuseDelta * 0.6)));
    const baseLikelyClaims = likelyWeatherClaims + likelyDisruptionClaims;
    const baseLikelyPayout = Math.round(baseLikelyClaims * avgClaimPayout);
    const projectedLossRatioBase = projectedWeeklyPremium > 0 ? baseLikelyPayout / projectedWeeklyPremium : 0;
    const confidenceScore = Math.max(
      55,
      Math.min(
        95,
        Math.round(
          62 +
          Math.min(18, claims.length / 6) +
          Math.min(10, workers.length / 10) -
          (weatherAlertLabel === "High" ? 8 : weatherAlertLabel === "Medium" ? 4 : 0)
        )
      )
    );

    const scenario = (name, multiplier) => {
      const claimsCount = Math.max(1, Math.round(baseLikelyClaims * multiplier));
      const payout = Math.round(baseLikelyPayout * multiplier);
      return {
        name,
        likelyClaims: claimsCount,
        likelyPayout: payout,
        projectedLossRatio: projectedWeeklyPremium > 0 ? Number((payout / projectedWeeklyPremium).toFixed(2)) : 0,
      };
    };
    const scenarios = [scenario("optimistic", 0.8), scenario("base", 1), scenario("stress", 1.3)];
    const avgClaimSettlementHours = completedClaims.length
      ? Number(
          (
            completedClaims.reduce((sum, claim) => {
              const start = claim.triggeredAt ? new Date(claim.triggeredAt).getTime() : NaN;
              const end = claim.completedAt ? new Date(claim.completedAt).getTime() : NaN;
              if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return sum;
              return sum + (end - start) / (1000 * 60 * 60);
            }, 0) / completedClaims.length
          ).toFixed(2)
        )
      : 0;
    const tatBreaches24h = completedClaims.filter((claim) => {
      const start = claim.triggeredAt ? new Date(claim.triggeredAt).getTime() : NaN;
      const end = claim.completedAt ? new Date(claim.completedAt).getTime() : NaN;
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return false;
      return end - start > 24 * 60 * 60 * 1000;
    }).length;
    const reserveAdequacyRatio = baseLikelyPayout > 0 ? Number((projectedWeeklyPremium / baseLikelyPayout).toFixed(2)) : 0;

    const policyCountByPlan = {};
    for (const w of policiesActive) {
      const plan = String(w.policy?.plan ?? "unknown");
      if (!policyCountByPlan[plan]) {
        policyCountByPlan[plan] = {
          plan,
          premium: Number(w.policy?.weeklyPremium ?? 0),
          coverage: plan === "premium" ? "24h + priority payout" : "12h standard payout",
          activeUsers: 0,
        };
      }
      policyCountByPlan[plan].activeUsers += 1;
    }
    const policiesTable = Object.values(policyCountByPlan);

    res.json({
      totals: {
        totalUsers: workers.length,
        totalPolicies,
        totalClaims: claims.length,
        totalPayout,
        totalProfit,
      },
      fraudSignals: {
        weatherClaimRatio: Number(weatherClaimRatio.toFixed(3)),
        expectedWeatherRatio: Number(expectedWeatherRatio.toFixed(3)),
        weatherAbuseDelta: Number(weatherAbuseDelta.toFixed(3)),
        weatherAlertLabel,
        autoTuned: Boolean(autoTunedConfig),
      },
      insurerIntelligence: {
        currentLossRatio: Number(currentLossRatio.toFixed(2)),
        projectedLossRatioBase: Number(projectedLossRatioBase.toFixed(2)),
        likelyWeatherClaims,
        likelyDisruptionClaims,
        predictedNextWeekPayout: baseLikelyPayout,
        predictedNextWeekPremium: projectedWeeklyPremium,
        confidenceScore,
        weatherPayoutShare: Number((weatherPayout / Math.max(1, totalPayout)).toFixed(2)),
        disruptionPayoutShare: Number((disruptionPayout / Math.max(1, totalPayout)).toFixed(2)),
        scenarios,
        recommendation:
          weatherAlertLabel === "High"
            ? "Increase weather disruption reserves and keep stricter auto-flag thresholds active for next cycle."
            : weatherAlertLabel === "Medium"
              ? "Maintain current underwriting controls and monitor weather-linked clusters in high-density zones."
              : "Portfolio is stable. Maintain pricing and keep predictive monitoring active for early anomaly detection.",
        governance: {
          reserveAdequacyRatio,
          reserveStatus: reserveAdequacyRatio >= 1.25 ? "healthy" : reserveAdequacyRatio >= 1 ? "watch" : "critical",
          avgClaimSettlementHours,
          tatBreaches24h,
        },
      },
      usersTable,
      claimsTable,
      payoutsTable,
      policiesTable,
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.patch("/admin/claims/:claimId/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { claimId } = req.params;
    if (!mongoose.isValidObjectId(claimId)) {
      return res.status(400).json({ error: "invalid claim id" });
    }
    const { status, adminNote, payoutAmount } = req.body ?? {};
    const allowed = ["pending", "processing", "completed", "rejected"];
    if (!allowed.includes(String(status))) {
      return res.status(400).json({ error: "invalid claim status" });
    }

    const claim = await ClaimModel.findById(claimId);
    if (!claim) return res.status(404).json({ error: "claim not found" });
    if (!claim.adminReviewRequired) {
      return res.status(400).json({ error: "AI-final claim cannot be manually overridden. Only flagged claims are editable." });
    }

    const nextStatus = String(status);
    const wasCompleted = claim.status === "completed";
    claim.status = nextStatus;
    claim.decisionSource = "admin_override";
    claim.adminReviewRequired = false;
    claim.reviewFlags = [];
    if (nextStatus === "completed" && !claim.completedAt) {
      claim.completedAt = new Date();
    }
    if (nextStatus !== "completed") {
      claim.completedAt = undefined;
    }
    if (adminNote) {
      claim.reason = `${claim.reason ?? ""} | admin: ${String(adminNote).trim()}`.trim();
    }
    await claim.save();

    if (!wasCompleted && nextStatus === "completed") {
      const credit = Number(payoutAmount ?? claim.amount ?? 0);
      if (credit > 0) {
        await WorkerModel.findByIdAndUpdate(claim.workerId, { $inc: { walletBalance: credit } });
      }
    }

    await logAdminAction(req, {
      actionType: "claim_status_update",
      targetType: "claim",
      targetId: String(claimId),
      note: `status=${nextStatus}`,
      metadata: {
        workerId: String(claim.workerId),
        status: nextStatus,
        payoutCredit: Number(payoutAmount ?? 0),
      },
    });

    res.json({ ok: true, claim });
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.patch("/admin/claims/:claimId/review-flag", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { claimId } = req.params;
    if (!mongoose.isValidObjectId(claimId)) {
      return res.status(400).json({ error: "invalid claim id" });
    }
    const { reviewRequired, adminNote } = req.body ?? {};
    if (typeof reviewRequired !== "boolean") {
      return res.status(400).json({ error: "reviewRequired(boolean) required" });
    }
    const claim = await ClaimModel.findById(claimId);
    if (!claim) return res.status(404).json({ error: "claim not found" });

    claim.adminReviewRequired = reviewRequired;
    claim.reviewFlags = reviewRequired ? ["manual_review_requested"] : [];
    if (adminNote) {
      claim.reason = `${claim.reason ?? ""} | review-flag: ${String(adminNote).trim()}`.trim();
    }
    await claim.save();

    await logAdminAction(req, {
      actionType: reviewRequired ? "claim_flagged_for_review" : "claim_unflagged_review",
      targetType: "claim",
      targetId: String(claimId),
      note: reviewRequired ? "marked for manual review" : "removed from manual review",
      metadata: {
        reviewRequired,
        status: claim.status,
        decisionSource: claim.decisionSource ?? "ai",
      },
    });

    res.json({ ok: true, adminReviewRequired: claim.adminReviewRequired });
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.patch("/admin/users/:userId/policy", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: "invalid user id" });
    }
    const { active, weeklyPremium } = req.body ?? {};
    const worker = await WorkerModel.findById(userId);
    if (!worker) return res.status(404).json({ error: "user not found" });

    const currentPolicy = worker.policy ?? {
      plan: "basic",
      active: false,
      weeklyPremium: 0,
      startDate: new Date().toISOString().split("T")[0],
      coverages: [],
      exclusions: [],
    };
    if (typeof active === "boolean") currentPolicy.active = active;
    if (typeof weeklyPremium === "number" && weeklyPremium >= 0) {
      currentPolicy.weeklyPremium = weeklyPremium;
    }

    worker.policy = currentPolicy;
    await worker.save();

    await logAdminAction(req, {
      actionType: "policy_update",
      targetType: "worker",
      targetId: String(userId),
      note: "updated policy settings",
      metadata: {
        active: currentPolicy.active,
        weeklyPremium: currentPolicy.weeklyPremium,
        plan: currentPolicy.plan,
      },
    });
    res.json({ ok: true, policy: worker.policy });
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.patch("/admin/users/:userId/risk", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: "invalid user id" });
    }
    const { riskLevel, riskScore } = req.body ?? {};
    const allowedRisk = ["low", "medium", "high"];
    if (!allowedRisk.includes(String(riskLevel)) || typeof riskScore !== "number") {
      return res.status(400).json({ error: "riskLevel(low|medium|high) and riskScore(number) required" });
    }

    const worker = await WorkerModel.findByIdAndUpdate(
      userId,
      { $set: { riskLevel: String(riskLevel), riskScore: Number(riskScore) } },
      { new: true }
    ).lean();
    if (!worker) return res.status(404).json({ error: "user not found" });

    await logAdminAction(req, {
      actionType: "risk_reclassify",
      targetType: "worker",
      targetId: String(userId),
      note: `risk=${String(riskLevel)} score=${Number(riskScore)}`,
      metadata: {
        riskLevel: String(riskLevel),
        riskScore: Number(riskScore),
      },
    });
    res.json({ ok: true, riskLevel: worker.riskLevel, riskScore: worker.riskScore });
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.get("/admin/audit-logs", requireAuth, requireAdmin, async (req, res) => {
  try {
    const pageRaw = Number(req.query?.page ?? 1);
    const limitRaw = Number(req.query?.limit ?? 100);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const limit = Math.min(250, Math.max(10, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 100));
    const skip = (page - 1) * limit;
    const actionType = String(req.query?.actionType ?? "").trim();
    const adminEmail = String(req.query?.adminEmail ?? "").trim();
    const from = String(req.query?.from ?? "").trim();
    const to = String(req.query?.to ?? "").trim();
    const query = {};
    if (actionType && actionType !== "all") query.actionType = actionType;
    if (adminEmail && adminEmail !== "all") query.adminEmail = adminEmail;
    if (from || to) {
      query.createdAt = {};
      if (from) {
        const fromDate = new Date(`${from}T00:00:00.000Z`);
        if (!Number.isNaN(fromDate.getTime())) {
          query.createdAt.$gte = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(`${to}T23:59:59.999Z`);
        if (!Number.isNaN(toDate.getTime())) {
          query.createdAt.$lte = toDate;
        }
      }
      if (Object.keys(query.createdAt).length === 0) {
        delete query.createdAt;
      }
    }
    const total = await AdminActionModel.countDocuments(query);
    const logs = await AdminActionModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    res.json({
      items: logs.map((l) => ({
        id: String(l._id),
        adminEmail: l.adminEmail,
        actionType: l.actionType,
        targetType: l.targetType,
        targetId: l.targetId,
        note: l.note ?? "",
        metadata: l.metadata ?? {},
        createdAt: l.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.get("/admin/auto-flag-config", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const config = await getAutoFlagConfig();
    res.json({
      ...config,
      canEdit: isSuperAdminAuth(_req),
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.patch("/admin/auto-flag-config", requireAuth, requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const nextConfig = sanitizeAutoFlagConfig(req.body ?? {});
    await SystemConfigModel.findOneAndUpdate(
      { key: AUTO_FLAG_CONFIG_KEY },
      { $set: { value: nextConfig, updatedAt: new Date() } },
      { upsert: true, new: true }
    );

    await logAdminAction(req, {
      actionType: "auto_flag_config_update",
      targetType: "system_config",
      targetId: AUTO_FLAG_CONFIG_KEY,
      note: "updated auto-flag thresholds",
      metadata: nextConfig,
    });

    res.json({ ok: true, config: nextConfig });
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.post("/admin/auto-flag-config/reset", requireAuth, requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const defaults = sanitizeAutoFlagConfig({});
    await Promise.all([
      SystemConfigModel.findOneAndUpdate(
        { key: AUTO_FLAG_CONFIG_KEY },
        { $set: { value: defaults, updatedAt: new Date() } },
        { upsert: true, new: true }
      ),
      SystemConfigModel.findOneAndDelete({ key: AUTO_FLAG_LAST_AUTOTUNE_KEY }),
    ]);

    await logAdminAction(req, {
      actionType: "auto_flag_config_reset_default",
      targetType: "system_config",
      targetId: AUTO_FLAG_CONFIG_KEY,
      note: "reset auto-flag thresholds to defaults",
      metadata: defaults,
    });

    res.json({ ok: true, config: defaults });
  } catch (e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

// Phase 3 Analytics Endpoint
router.get("/workers/:id/statistics", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "invalid worker id" });
    }
    const worker = await WorkerModel.findById(id).lean();
    if (!worker) return res.status(404).json({ error: "worker not found" });
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const workerClaims = await ClaimModel.find({ workerId: id, triggeredAt: { $gte: weekAgo } })
      .sort({ triggeredAt: -1 })
      .lean();

    const fraudState = await calculateFraudScore(worker);
    const tomorrowRisk = computeTomorrowRiskPrediction(worker, fraudState);

    // Demo historical data
    const weeks = ["W1", "W2", "W3", "W4", "W5", "W6(Current)"];
    const riskVsPremium = weeks.map((w, i) => ({
      week: w,
      riskLevel: 30 + (Math.random() * 40) + (i * 2), // Mock risk going up slightly
      premiumPaid: 150 + (i * 10) + (Math.random() * 20),
    }));

    const claimsOverTime = weeks.map((w) => ({
      week: w,
      claimsCount: Math.floor(Math.random() * 4), // 0 to 3 claims
      claimsAmount: Math.floor(Math.random() * 1000)
    }));

    const fraudStats = [
      {
        week: "Current",
        gpsSpoofing: Math.round((fraudState.components?.locationAnomaly ?? 0) * 100),
        fakeInactivity: Math.round((fraudState.components?.activityMismatch ?? 0) * 100),
        fakeWeatherClaims: Math.round((fraudState.components?.fakeWeatherClaims ?? 0) * 100),
        clusterFraud: Math.round((fraudState.components?.patternSimilarity ?? 0) * 100),
        fraudScore: Math.round((fraudState.fraudScore ?? 0) * 100),
      },
    ];

    const weeklyCompletedClaims = workerClaims.filter((c) => c.status === "completed");
    const earningsProtectedINR = weeklyCompletedClaims.reduce((sum, c) => sum + Number(c.amount ?? 0), 0);
    const activeWeeklyCoverageHours = worker.policy?.active
      ? worker.policy?.plan === "premium" ? 168 : 84
      : 0;
    const weekResetAt = getNextWeekResetAt();
    const coverageRemainingHours = worker.policy?.active
      ? Math.max(0, Math.round((weekResetAt.getTime() - Date.now()) / (60 * 60 * 1000)))
      : 0;
    const activePolicyLabel = worker.policy?.active
      ? `${String(worker.policy?.plan ?? "basic")} plan active`
      : "no active policy";
    const reliabilityScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          70 +
          ((worker.policy?.active ? 8 : -12)) +
          (weeklyCompletedClaims.length * 3) -
          (Math.round(Number(fraudState.fraudScore ?? 0) * 100) / 8)
        )
      )
    );

    res.json({
      riskVsPremium,
      claimsOverTime,
      fraudStats,
      tomorrowRisk,
      workerSummary: {
        earningsProtectedINR,
        activeWeeklyCoverageHours,
        coverageRemainingHours,
        weekResetAt: weekResetAt.toISOString(),
        weeklyClaimsSettled: weeklyCompletedClaims.length,
        reliabilityScore,
        activePolicyLabel,
      },
    });
  } catch(e) {
    res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "desver-api",
    mongo: true,
    uptimeSec: Math.round(process.uptime()),
    nodeEnv: process.env.NODE_ENV ?? "development",
    version: process.env.npm_package_version ?? "unknown",
    now: new Date().toISOString(),
  });
});

export default router;
