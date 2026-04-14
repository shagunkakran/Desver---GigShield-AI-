/**
 * ClaimsPage.tsx
 * Zero-touch automated claims management.
 * Claims are triggered automatically by the system (from PremiumPage triggers or system events).
 * Shows real-time pipeline: Triggered → Processing → Payout Completed.
 */

import { useState } from "react";
import {
  Zap, CloudRain, Wind, TrafficCone, Clock, CheckCircle,
  AlertTriangle, Activity, Wallet, Info, CreditCard,
} from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import { useWorker, type Claim, type ClaimStatus } from "@/contexts/WorkerContext";
import { toast } from "sonner";

// ── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<
  ClaimStatus,
  { label: string; icon: any; className: string; barWidth: string }
> = {
  triggered:  {
    label: "Claim Triggered",
    icon: Zap,
    className: "text-accent bg-accent/10",
    barWidth: "w-1/4",
  },
  processing: {
    label: "Processing",
    icon: Activity,
    className: "text-primary bg-primary/10",
    barWidth: "w-2/4",
  },
  completed:  {
    label: "Payout Completed",
    icon: CheckCircle,
    className: "text-success bg-success/10",
    barWidth: "w-full",
  },
  rejected:   {
    label: "Rejected",
    icon: AlertTriangle,
    className: "text-destructive bg-destructive/10",
    barWidth: "w-full",
  },
};

const TYPE_ICON: Record<string, any> = {
  "Weather Disruption": CloudRain,
  "Pollution Spike": Wind,
  "Traffic Blockage": TrafficCone,
};

// ── Pipeline visual ──────────────────────────────────────────────────────────

function ClaimPipeline({ status }: { status: ClaimStatus }) {
  const steps: ClaimStatus[] = ["triggered", "processing", "completed"];
  const currentIndex = steps.indexOf(status);

  return (
    <div className="flex items-center gap-1 mt-3">
      {steps.map((step, i) => {
        const isActive = i <= currentIndex && status !== "rejected";
        const s = STATUS[step];
        const Icon = s.icon;
        return (
          <div key={step} className="flex items-center gap-1 flex-1">
            <div
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all ${
                isActive ? s.className : "text-muted-foreground bg-muted/50"
              }`}
            >
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 rounded transition-all ${
                  i < currentIndex && status !== "rejected" ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Claim Card ───────────────────────────────────────────────────────────────

function ClaimCard({
  claim,
  onInstantPayout,
}: {
  claim: Claim;
  onInstantPayout: (claimId: string, gateway: "razorpay" | "stripe" | "upi") => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loadingGateway, setLoadingGateway] = useState<"" | "razorpay" | "stripe" | "upi">("");
  const status = STATUS[claim.status];
  const StatusIcon = status.icon;
  const TypeIcon = TYPE_ICON[claim.type] ?? Activity;

  const isPending = claim.status === "triggered" || claim.status === "processing";

  async function handleInstantPayout(gateway: "razorpay" | "stripe" | "upi") {
    try {
      setLoadingGateway(gateway);
      await onInstantPayout(claim.id, gateway);
      toast.success(`Instant payout processed via ${gateway.toUpperCase()}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Instant payout failed. Please retry.");
    } finally {
      setLoadingGateway("");
    }
  }

  return (
    <div
      className={`glass-card rounded-xl p-5 transition-all hover:shadow-lg cursor-pointer ${
        claim.status === "triggered" || claim.status === "processing"
          ? "ring-1 ring-primary/20"
          : ""
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <TypeIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-display font-semibold text-sm">{claim.type}</div>
            <div className="text-xs text-muted-foreground">{claim.id}</div>
            <div className="text-xs text-muted-foreground">Triggered: {claim.triggeredAt}</div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-display font-bold text-base">₹{claim.amount}</div>
          <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 ${status.className}`}>
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <ClaimPipeline status={claim.status} />

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/50 animate-fade-in space-y-2">
          <p className="text-xs text-muted-foreground">{claim.reason}</p>
          {claim.status === "completed" && claim.completedAt && (
            <div className="flex items-center gap-2 text-xs text-success">
              <Wallet className="h-3.5 w-3.5" />
              ₹{claim.amount} credited to wallet at {claim.completedAt}
            </div>
          )}
          {claim.payout?.reference && (
            <div className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-2 text-xs">
              <div className="font-medium">Payout Receipt</div>
              <div className="text-muted-foreground mt-1">
                {String(claim.payout.provider ?? "gateway").toUpperCase()} | Ref: {claim.payout.reference}
              </div>
              <div className="text-muted-foreground">
                Status: {claim.payout.status ?? "-"} | {claim.payout.sandbox ? "Sandbox" : "Live"}
              </div>
            </div>
          )}
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            {claim.autoTriggered ? "Auto-triggered by Desver event engine" : "Manually submitted"}
          </div>
          {isPending && (
            <div className="pt-2">
              <div className="text-xs font-medium mb-2 text-primary flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                Instant Payout (Simulated)
              </div>
              <div className="flex gap-2 flex-wrap">
                {(["razorpay", "stripe", "upi"] as const).map((gw) => (
                  <button
                    key={gw}
                    type="button"
                    disabled={Boolean(loadingGateway)}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleInstantPayout(gw);
                    }}
                    className="px-2.5 py-1 rounded-md text-xs bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
                  >
                    {loadingGateway === gw ? "Processing..." : gw.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ClaimsPage() {
  const { claims, instantPayout } = useWorker();
  const [filter, setFilter] = useState<ClaimStatus | "all">("all");

  const filtered =
    filter === "all" ? claims : claims.filter((c) => c.status === filter);

  const totalPaid = claims
    .filter((c) => c.status === "completed")
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="py-16 aurora-bg min-h-[calc(100vh-4rem)]">
      <div className="container mx-auto px-4">
        {/* Header */}
        <AnimatedSection>
          <div className="text-center mb-12 glass-card-premium gradient-frame rounded-2xl p-6 md:p-8 max-w-4xl mx-auto neon-ring card-lift">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Zap className="h-4 w-4" />
              Zero-Touch Automation
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-3 text-gradient">
              Claims Management
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              All claims are triggered <strong>automatically</strong> by the Desver event engine.
              No manual filing required — disruption is detected and compensation is initiated instantly.
            </p>
          </div>
        </AnimatedSection>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-10">
          {[
            { icon: Activity, label: "Total Claims", value: `${claims.length}` },
            {
              icon: CheckCircle,
              label: "Completed",
              value: `${claims.filter((c) => c.status === "completed").length}`,
            },
            {
              icon: Clock,
              label: "Processing",
              value: `${claims.filter((c) => c.status === "processing" || c.status === "triggered").length}`,
            },
            { icon: Wallet, label: "Total Paid Out", value: `₹${totalPaid}` },
          ].map((stat) => (
            <AnimatedSection key={stat.label}>
              <div className="glass-card-premium card-lift rounded-xl p-4 text-center transition-transform">
                <stat.icon className="h-5 w-5 text-primary mx-auto mb-2" />
                <div className="font-display text-xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* How it works */}
        <AnimatedSection>
          <div className="max-w-4xl mx-auto mb-8 bg-primary/10 border border-primary/25 rounded-xl p-5 backdrop-blur-md card-lift">
            <h3 className="font-display font-semibold text-sm mb-3 text-primary flex items-center gap-2">
              <Info className="h-4 w-4" /> How Zero-Touch Claims Work
            </h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { step: "1", title: "Disruption Detected", desc: "Weather/traffic trigger fires from real-time data" },
                { step: "2", title: "Auto-Claim Created", desc: "Claim is instantly created with Triggered status" },
                { step: "3", title: "Payout Credited", desc: "Compensation hits wallet in under 5 minutes" },
              ].map((item) => (
                <div key={item.step} className="flex gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 max-w-4xl mx-auto flex-wrap">
          {(["all", "triggered", "processing", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all"
                ? `All (${claims.length})`
                : `${STATUS[f as ClaimStatus].label} (${claims.filter((c) => c.status === f).length})`}
            </button>
          ))}
        </div>

        {/* Claims list */}
        <div className="max-w-4xl mx-auto space-y-4">
          {filtered.length === 0 ? (
            <AnimatedSection>
              <div className="glass-card rounded-xl p-12 text-center">
                <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {claims.length === 0
                    ? "No claims yet. Trigger a live disruption from Premium page and watch AI confidence + instant payout simulation in action."
                    : "No claims match this filter."}
                </p>
                {claims.length === 0 && (
                  <div className="mt-4 text-xs text-primary/80">
                    Pro tip: Use a weak-signal trigger to demo partial payout (50%) logic.
                  </div>
                )}
              </div>
            </AnimatedSection>
          ) : (
            filtered.map((claim, i) => (
              <AnimatedSection key={claim.id} delay={i * 60}>
                <ClaimCard claim={claim} onInstantPayout={instantPayout} />
              </AnimatedSection>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
