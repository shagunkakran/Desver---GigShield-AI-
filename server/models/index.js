import mongoose from "mongoose";

const policySchema = new mongoose.Schema(
  {
    plan: { type: String, required: true },
    weeklyPremium: Number,
    active: { type: Boolean, default: true },
    startDate: String,
    coverages: [String],
    exclusions: [String],
    maxWeeklyPayout: { type: Number, default: 2000 },
    perClaimLimit: { type: Number, default: 500 },
    smartCapFactor: { type: Number, default: 1 },
  },
  { _id: false }
);

const workerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["worker", "admin"], default: "worker" },
    workerType: { type: String, required: true },
    location: { type: String, required: true },
    riskLevel: String,
    riskScore: Number,
    registeredAt: { type: Date, default: Date.now },
    policy: policySchema,
    walletBalance: { type: Number, default: 1250 },
    activeTriggers: { type: [String], default: [] },
    fraudScore: { type: Number, default: 0 },
    fraudMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { collection: "workers" }
);

workerSchema.index({ email: 1 }, { unique: true });

const claimSchema = new mongoose.Schema(
  {
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true, index: true },
    externalId: { type: String, required: true },
    type: { type: String, required: true },
    amount: Number,
    status: { type: String, default: "triggered" },
    decisionSource: { type: String, default: "ai" },
    adminReviewRequired: { type: Boolean, default: false },
    reviewFlags: { type: [String], default: [] },
    payout: {
      provider: String,
      reference: String,
      status: String,
      settledAt: Date,
      amount: Number,
      currency: String,
      sandbox: Boolean,
      idempotencyKey: String,
      processing: { type: Boolean, default: false },
      errorMessage: String,
      requestedAt: Date,
    },
    payoutAttempts: { type: Number, default: 0 },
    reason: String,
    autoTriggered: { type: Boolean, default: true },
    triggeredAt: { type: Date, default: Date.now },
    completedAt: Date,
    /** YYYY-MM-DD for cron dedupe */
    dedupeDay: String,
  },
  { collection: "claims" }
);

claimSchema.index({ workerId: 1, type: 1, dedupeDay: 1 }, { unique: false });

const adminActionSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true, index: true },
    adminEmail: { type: String, required: true },
    actionType: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    note: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: "admin_actions" }
);

const systemConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "system_configs" }
);

export const WorkerModel = mongoose.models.Worker || mongoose.model("Worker", workerSchema);
export const ClaimModel = mongoose.models.Claim || mongoose.model("Claim", claimSchema);
export const AdminActionModel =
  mongoose.models.AdminAction || mongoose.model("AdminAction", adminActionSchema);
export const SystemConfigModel =
  mongoose.models.SystemConfig || mongoose.model("SystemConfig", systemConfigSchema);
