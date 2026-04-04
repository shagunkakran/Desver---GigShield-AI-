import mongoose from "mongoose";

const policySchema = new mongoose.Schema(
  {
    plan: { type: String, required: true },
    weeklyPremium: Number,
    active: { type: Boolean, default: true },
    startDate: String,
    coverages: [String],
    exclusions: [String],
  },
  { _id: false }
);

const workerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    workerType: { type: String, required: true },
    location: { type: String, required: true },
    riskLevel: String,
    riskScore: Number,
    registeredAt: { type: Date, default: Date.now },
    policy: policySchema,
    walletBalance: { type: Number, default: 1250 },
    activeTriggers: { type: [String], default: [] },
  },
  { collection: "workers" }
);

const claimSchema = new mongoose.Schema(
  {
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true, index: true },
    externalId: { type: String, required: true },
    type: { type: String, required: true },
    amount: Number,
    status: { type: String, default: "triggered" },
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

export const WorkerModel = mongoose.models.Worker || mongoose.model("Worker", workerSchema);
export const ClaimModel = mongoose.models.Claim || mongoose.model("Claim", claimSchema);
