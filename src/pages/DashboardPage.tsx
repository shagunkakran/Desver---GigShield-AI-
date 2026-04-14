/**
 * DashboardPage.tsx  (Phase 2 — fully upgraded)
 * Master dashboard combining: worker info, premium, active policy,
 * risk level, claim status, fraud score, route risk, wallet, alerts.
 */

import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Wallet, CloudRain, Wind, TrafficCone, Bell, Shield, TrendingUp,
  AlertTriangle, CheckCircle, Clock, Activity, MapPin, FileText,
  Fingerprint, User, Zap, ChevronRight, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedSection from "@/components/AnimatedSection";
import { useWorker, type ClaimStatus } from "@/contexts/WorkerContext";
import { detectFraud } from "@/utils/fraudDetector";
import { RISK_COLORS, RISK_BG } from "@/utils/riskEngine";
import CountUp from "@/components/CountUp";
import PulseRiskBadge from "@/components/PulseRiskBadge";
import { fetchWorkerStatistics } from "@/lib/api";

// ── Static mock data (kept from original dashboard) ──────────────────────────

const staticAlerts = [
  { message: "Heavy rainfall expected in East Delhi — stay safe!", type: "warning", time: "2 hours ago" },
  { message: "AQI levels rising in Gurugram region — AQI 380", type: "info", time: "5 hours ago" },
  { message: "₹300 compensation credited for weather disruption", type: "success", time: "1 day ago" },
  { message: "Plan renewed — High Risk Route ₹80/week", type: "info", time: "3 days ago" },
];

const AnalyticsDashboard = lazy(() => import("@/components/AnalyticsDashboard"));

const staticTransactions = [
  { label: "Weather compensation", amount: "+₹300", date: "Dec 15" },
  { label: "Pollution compensation", amount: "+₹150", date: "Dec 12" },
  { label: "Premium payment", amount: "-₹80", date: "Dec 10" },
  { label: "Weather compensation", amount: "+₹250", date: "Dec 10" },
];

const routes = [
  { route: "Route A (Connaught Place)", risk: 82, level: "high" as const },
  { route: "Route B (Saket)", risk: 35, level: "medium" as const },
  { route: "Route C (Dwarka)", risk: 18, level: "low" as const },
  { route: "Route D (Lajpat Nagar)", risk: 61, level: "medium" as const },
  { route: "Route E (Rohini)", risk: 9, level: "low" as const },
];

const claimStatusConfig: Record<ClaimStatus, { label: string; icon: any; className: string }> = {
  triggered:  { label: "Triggered",        icon: Zap,           className: "text-accent bg-accent/10" },
  processing: { label: "Processing",       icon: Activity,      className: "text-primary bg-primary/10" },
  completed:  { label: "Payout Completed", icon: CheckCircle,   className: "text-success bg-success/10" },
  rejected:   { label: "Rejected",         icon: AlertTriangle, className: "text-destructive bg-destructive/10" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="glass-card-premium card-lift rounded-xl p-4">
      <Icon className="h-5 w-5 text-primary mb-2" />
      <div className="font-display text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {sub && <div className="text-xs text-primary/70 mt-0.5">{sub}</div>}
    </div>
  );
}

function RouteRisk({ route, risk, level }: { route: string; risk: number; level: "low" | "medium" | "high" }) {
  const colors = { high: "bg-destructive", medium: "bg-accent", low: "bg-success" };
  const labels = { high: "High Risk", medium: "Medium", low: "Low Risk" };
  return (
    <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
      <div className="flex-1">
        <div className="text-sm font-medium mb-1">{route}</div>
        <div className="relative h-2 bg-muted-foreground/10 rounded-full overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ${colors[level]}`}
            style={{ width: `${risk}%` }}
          />
        </div>
      </div>
      <div className="text-right min-w-[80px]">
        <div className="text-sm font-display font-bold">{risk}%</div>
        <div className="text-xs text-muted-foreground">{labels[level]}</div>
      </div>
    </div>
  );
}

// ── Fraud Score Ring ──────────────────────────────────────────────────────────

function FraudScoreRing({ score, label }: { score: number; label: string }) {
  const color = label === "Low" ? "#22c55e" : label === "Medium" ? "#f59e0b" : "#ef4444";
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={`${filled} ${circumference}`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-black text-2xl">{score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <span
        className={`text-sm font-bold mt-2 ${
          label === "Low" ? "text-success" : label === "Medium" ? "text-accent" : "text-destructive"
        }`}
      >
        {label} Risk
      </span>
    </div>
  );
}

// ── Not Registered Prompt ────────────────────────────────────────────────────

function NotRegisteredPrompt() {
  return (
    <AnimatedSection>
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <User className="h-10 w-10 text-primary" />
        </div>
        <h2 className="font-display text-2xl font-bold mb-3">Welcome to Desver</h2>
        <p className="text-muted-foreground mb-8">
          Register your worker profile to access your personalised dashboard with live risk scores,
          automated claims, and fraud detection.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/register">
            <Button size="lg" className="gap-2">
              Register Now <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/how-it-works">
            <Button size="lg" variant="outline">See How It Works</Button>
          </Link>
        </div>
      </div>
    </AnimatedSection>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

type Tab = "overview" | "claims" | "wallet" | "alerts" | "fraud";

export default function DashboardPage() {
  const { profile, policy, claims, walletBalance, reset, serverFraudState, tomorrowRisk } = useWorker();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [coverageRemainingHours, setCoverageRemainingHours] = useState(0);
  const [weekResetAt, setWeekResetAt] = useState<string | null>(null);
  const [countdownNow, setCountdownNow] = useState(() => Date.now());

  useEffect(() => {
    if (!profile?.serverId) return;
    let cancelled = false;
    void fetchWorkerStatistics(profile.serverId)
      .then((res) => {
        if (cancelled) return;
        setCoverageRemainingHours(res.workerSummary?.coverageRemainingHours ?? 0);
        setWeekResetAt(res.workerSummary?.weekResetAt ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profile?.serverId]);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const coverageCountdown = useMemo(() => {
    if (!policy?.active || !weekResetAt) return "coverage inactive";
    const diff = Math.max(0, new Date(weekResetAt).getTime() - countdownNow);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [countdownNow, policy?.active, weekResetAt]);

  const remainingText = useMemo(() => {
    if (!policy?.active) return "coverage inactive";
    return `${coverageRemainingHours}h left this week • ${coverageCountdown}`;
  }, [coverageRemainingHours, coverageCountdown, policy?.active]);

  // Fraud detection result
  const fraudResult = serverFraudState ? {
    score: Math.round(serverFraudState.fraudScore * 100),
    label: serverFraudState.riskCategory.split(" ")[0],
    recommendation: serverFraudState.fraudScore > 0.6 ? "Investigation recommended based on anomalies." : "Normal operations. Account is secure.",
    signals: serverFraudState.anomalies.map((a: any) => ({
      name: a.type,
      description: a.detail,
      severity: a.severity.toLowerCase(),
      value: "Detected"
    }))
  } : detectFraud(claims);
  const fraudTone = fraudResult.score < 30 ? "safe" : fraudResult.score < 70 ? "suspicious" : "risky";

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: Activity },
    { key: "claims",   label: `Claims (${claims.length})`, icon: FileText },
    { key: "wallet",   label: "Wallet",  icon: Wallet },
    { key: "alerts",   label: "Alerts",  icon: Bell },
    { key: "fraud",    label: "Fraud AI", icon: Fingerprint },
  ];

  if (!profile?.registered) return (
    <div className="py-8">
      <div className="container mx-auto px-4">
        <NotRegisteredPrompt />
      </div>
    </div>
  );

  const totalPaidOut = claims
    .filter((c) => c.status === "completed")
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="py-8 aurora-bg min-h-[calc(100vh-4rem)]">
      <div className="container mx-auto px-4">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
          <div className="glass-card-premium gradient-frame rounded-2xl p-5 md:p-6 neon-ring card-lift">
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary/80 mb-2">Phase 3 Intelligence Hub</p>
            <h1 className="font-display text-2xl md:text-4xl font-bold text-gradient">Worker Dashboard</h1>
            <p className="text-muted-foreground text-sm">Welcome back, {profile.name}</p>
            {/* Quick profile chips */}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-muted px-2.5 py-1 rounded-full capitalize">
                📍 {profile.location}
              </span>
              <span className="text-xs bg-muted px-2.5 py-1 rounded-full capitalize">
                💼 {profile.workerType}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full capitalize font-semibold border border-white/10 ${RISK_BG[profile.riskLevel]} ${RISK_COLORS[profile.riskLevel]}`}>
                {profile.riskLevel} risk
              </span>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            {policy && (
              <div className="flex items-center gap-2 bg-primary/10 text-primary rounded-lg px-4 py-2 border border-primary/20 card-lift">
                <Shield className="h-5 w-5" />
                <div>
                  <div className="text-xs font-medium">Active Plan</div>
                  <div className="font-display font-bold text-sm capitalize">
                    {policy.plan} — ₹{policy.weeklyPremium}/week
                  </div>
                  <div className="text-[10px] opacity-80">
                    Cap: ₹{policy.maxWeeklyPayout ?? 2000}/week, ₹{policy.perClaimLimit ?? 500}/claim
                  </div>
                </div>
              </div>
            )}
            {!policy && (
              <Link to="/worker/policy">
                <Button size="sm" className="gap-2">
                  <Shield className="h-4 w-4" /> Activate Policy
                </Button>
              </Link>
            )}
            <button
              onClick={reset}
              title="Reset profile (demo)"
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/70 backdrop-blur-md p-1 rounded-xl mb-8 overflow-x-auto w-fit max-w-full border border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Wallet}      label="Wallet Balance"   value={`₹${walletBalance.toLocaleString()}`} />
              <StatCard icon={TrendingUp}  label="Earnings Protected"   value={`₹${totalPaidOut}`} sub="7-day insured payout" />
              <StatCard icon={CheckCircle} label="Claims Completed" value={`${claims.filter(c => c.status === "completed").length}`} />
              <StatCard
                icon={Shield}
                label="Active Weekly Coverage"
                value={policy?.active ? (policy.plan === "premium" ? "168h" : "84h") : "0h"}
                sub={policy?.active ? `${policy.plan} plan active • ${remainingText}` : "activate plan to protect earnings"}
              />
            </div>
            {policy?.active && weekResetAt && (
              <p className="text-xs text-muted-foreground">
                Weekly coverage resets: {new Date(weekResetAt).toLocaleString()} (live: {coverageCountdown})
              </p>
            )}

            {/* Phase 3 - Tomorrow Risk Prediction (Smart AI) */}
            <AnimatedSection>
              <div className="glass-card-premium gradient-frame rounded-2xl p-6 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border border-primary/20 flex items-start gap-4 card-lift">
                <div className="bg-primary/20 p-3 rounded-xl mt-1 min-w-max">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-primary">AI Tomorrow Risk Prediction</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    AI forecast suggests <strong className="text-foreground"><CountUp value={tomorrowRisk?.probabilityPct ?? 78} suffix="%" /> probability of Income-Loss Event</strong> tomorrow based on risk telemetry + anomaly pressure.
                    <br />
                    <span className="inline-block mt-2 font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                      Recommendation: {tomorrowRisk?.recommendation ?? "Activate Dynamic Premium today to secure guaranteed minimum payout."}
                    </span>
                  </p>
                </div>
              </div>
            </AnimatedSection>

            {/* Phase 2 Feature strip */}
            <AnimatedSection>
              <div className="grid sm:grid-cols-3 gap-3">
                <Link to="/worker/premium" className="glass-card-premium card-lift rounded-xl p-4 flex items-center gap-3 transition-all group">
                  <Zap className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="font-semibold text-sm">Dynamic Premium</div>
                    <div className="text-xs text-muted-foreground">
                      Current: ₹{policy?.weeklyPremium ?? "—"}/week
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                </Link>
                <Link to="/worker/claims" className="glass-card-premium card-lift rounded-xl p-4 flex items-center gap-3 transition-all group">
                  <FileText className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="font-semibold text-sm">Claims Engine</div>
                    <div className="text-xs text-muted-foreground">
                      {claims.filter(c => c.status !== "completed").length} active claim(s)
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                </Link>
                <button onClick={() => setActiveTab("fraud")} className="glass-card-premium card-lift rounded-xl p-4 flex items-center gap-3 transition-all group text-left">
                  <Fingerprint className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="font-semibold text-sm">Fraud Score</div>
                    <div className={`text-xs font-semibold ${
                      fraudResult.label === "Low" ? "text-success" : fraudResult.label === "Medium" ? "text-accent" : "text-destructive"
                    }`}>
                      {fraudResult.score}/100 — {fraudResult.label} Risk
                    </div>
                    <div className="mt-1">
                      <PulseRiskBadge
                        tone={fraudTone}
                        label={fraudTone === "safe" ? "Fraud Band: Safe" : fraudTone === "suspicious" ? "Fraud Band: Suspicious" : "Fraud Band: Risky"}
                      />
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                </button>
              </div>
            </AnimatedSection>

            {/* Claims + Alerts */}
            <div className="grid md:grid-cols-2 gap-6">
              <AnimatedSection>
                <div className="glass-card rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold">Recent Claims</h3>
                    <button onClick={() => setActiveTab("claims")} className="text-xs text-primary hover:underline">View all</button>
                  </div>
                  {claims.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No claims yet. Go to{" "}
                      <Link to="/worker/premium" className="text-primary underline">Premium page</Link>{" "}
                      to trigger a simulated event and unlock instant payout insights.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {claims.slice(0, 3).map((claim) => {
                        const s = claimStatusConfig[claim.status];
                        const TypeIcon = claim.type === "Weather Disruption" ? CloudRain
                          : claim.type === "Pollution Spike" ? Wind : TrafficCone;
                        return (
                          <div key={claim.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <TypeIcon className="h-4 w-4 text-primary" />
                              <div>
                                <div className="text-sm font-medium">{claim.type}</div>
                                <div className="text-xs text-muted-foreground">{claim.triggeredAt}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-display font-semibold text-sm">₹{claim.amount}</div>
                              <div className={`text-xs px-2 py-0.5 rounded-full ${s.className}`}>
                                {s.label}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </AnimatedSection>

              <AnimatedSection delay={100}>
                <div className="glass-card rounded-xl p-6">
                  <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                    <Bell className="h-4 w-4" /> Live Alerts
                  </h3>
                  <div className="space-y-3">
                    {staticAlerts.slice(0, 3).map((alert, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg text-sm ${
                          alert.type === "warning" ? "bg-accent/10 border border-accent/20"
                            : alert.type === "success" ? "bg-success/10 border border-success/20"
                            : "bg-primary/5 border border-primary/10"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span>{alert.message}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{alert.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedSection>
            </div>

            {/* Route Risk */}
            <AnimatedSection>
              <div className="glass-card rounded-xl p-6">
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Route Risk Map
                </h3>
                <div className="space-y-3">
                  {routes.map((r) => <RouteRisk key={r.route} {...r} />)}
                </div>
              </div>
            </AnimatedSection>

            {/* Phase 3 - Analytics Dashboard Component */}
            <AnimatedSection>
              <Suspense fallback={<div className="text-sm text-muted-foreground">Loading analytics...</div>}>
                <AnalyticsDashboard />
              </Suspense>
            </AnimatedSection>
          </div>
        )}

        {/* ── CLAIMS ───────────────────────────────────────────────────────── */}
        {activeTab === "claims" && (
          <AnimatedSection>
            <div className="max-w-3xl mx-auto">
              {claims.length === 0 ? (
                <div className="glass-card rounded-xl p-12 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No claims triggered yet.</p>
                  <Link to="/worker/premium">
                    <Button size="sm">Go to Premium Page to Simulate</Button>
                  </Link>
                </div>
              ) : (
                <div className="glass-card rounded-xl overflow-hidden">
                  <div className="p-6 border-b">
                    <h3 className="font-display font-semibold">All Claims</h3>
                  </div>
                  <div className="divide-y">
                    {claims.map((claim) => {
                      const s = claimStatusConfig[claim.status];
                      const StatusIcon = s.icon;
                      const TypeIcon = claim.type === "Weather Disruption" ? CloudRain
                        : claim.type === "Pollution Spike" ? Wind : TrafficCone;
                      return (
                        <div key={claim.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <TypeIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">{claim.type}</div>
                              <div className="text-xs text-muted-foreground">{claim.id} • {claim.triggeredAt}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-display font-bold">₹{claim.amount}</span>
                            <div className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${s.className}`}>
                              <StatusIcon className="h-3 w-3" />
                              {s.label}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="text-center mt-4">
                <Link to="/worker/claims">
                  <Button variant="outline" size="sm" className="gap-2">
                    Open Full Claims Management <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* ── WALLET ───────────────────────────────────────────────────────── */}
        {activeTab === "wallet" && (
          <AnimatedSection>
            <div className="max-w-lg mx-auto space-y-6">
              <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-8 text-primary-foreground">
                <div className="text-sm opacity-80 mb-1">Total Balance</div>
                <div className="font-display text-4xl font-bold mb-4">₹{walletBalance.toLocaleString()}.00</div>
                <Button size="sm" variant="secondary">Withdraw</Button>
              </div>
              <div className="glass-card rounded-xl p-6">
                <h3 className="font-display font-semibold mb-4">Recent Transactions</h3>
                <div className="space-y-3">
                  {/* Live claims as transactions */}
                  {claims.filter(c => c.status === "completed").slice(0, 4).map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium">{c.type} compensation</div>
                        <div className="text-xs text-muted-foreground">{c.completedAt}</div>
                      </div>
                      <span className="font-display font-semibold text-sm text-success">+₹{c.amount}</span>
                    </div>
                  ))}
                  {/* Static fallback transactions */}
                  {staticTransactions.map((tx, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium">{tx.label}</div>
                        <div className="text-xs text-muted-foreground">{tx.date}</div>
                      </div>
                      <span className={`font-display font-semibold text-sm ${tx.amount.startsWith("+") ? "text-success" : "text-destructive"}`}>
                        {tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* ── ALERTS ───────────────────────────────────────────────────────── */}
        {activeTab === "alerts" && (
          <AnimatedSection>
            <div className="max-w-2xl mx-auto space-y-4">
              {staticAlerts.map((alert, i) => (
                <div key={i} className={`glass-card rounded-xl p-5 border-l-4 ${
                  alert.type === "warning" ? "border-l-accent"
                    : alert.type === "success" ? "border-l-success"
                    : "border-l-primary"
                }`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium">{alert.message}</span>
                    <span className="text-xs text-muted-foreground ml-4 whitespace-nowrap">{alert.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        )}

        {/* ── FRAUD AI ─────────────────────────────────────────────────────── */}
        {activeTab === "fraud" && (
          <AnimatedSection>
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="glass-card rounded-xl p-8">
                <h2 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
                  <Fingerprint className="h-5 w-5 text-primary" />
                  AI Fraud Detection Report
                </h2>

                <div className="flex flex-col sm:flex-row items-center gap-8 mb-8">
                  <FraudScoreRing score={fraudResult.score} label={fraudResult.label} />

                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Recommendation</div>
                      <div className="font-semibold text-sm bg-muted rounded-lg p-3">
                        {fraudResult.recommendation}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-center p-3 bg-success/10 rounded-lg">
                        <div className="font-bold text-success">Score &lt; 35</div>
                        <div className="text-xs text-muted-foreground">Auto-approve</div>
                      </div>
                      <div className="text-center p-3 bg-destructive/10 rounded-lg">
                        <div className="font-bold text-destructive">Score &gt; 65</div>
                        <div className="text-xs text-muted-foreground">Investigation</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Signals */}
                <div>
                  <h3 className="font-display font-semibold text-sm mb-3">Detected Signals</h3>
                  {fraudResult.signals.length === 0 ? (
                    <div className="p-4 bg-success/10 rounded-lg text-sm text-success">
                      ✅ No suspicious signals detected. Activity looks normal.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {fraudResult.signals.map((sig) => (
                        <div
                          key={sig.name}
                          className={`rounded-lg p-4 text-sm border ${
                            sig.severity === "high"
                              ? "bg-destructive/10 border-destructive/20"
                              : sig.severity === "medium"
                              ? "bg-accent/10 border-accent/20"
                              : "bg-muted border-border"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold">{sig.name}</span>
                            <span className="text-xs font-mono">{sig.value}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{sig.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Formula */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="font-display font-semibold text-sm text-primary mb-3">Fraud Score Formula</h3>
                <div className="bg-muted rounded-lg p-3 font-mono text-xs space-y-1">
                  <div className="text-muted-foreground">// Desver Fraud Scoring Engine v2</div>
                  <div><span className="text-primary">fraud_score</span> = location_anomaly × 0.4</div>
                  <div className="ml-8">+ activity_mismatch × 0.3</div>
                  <div className="ml-8">+ pattern_similarity × 0.3</div>
                  <div className="mt-1 text-muted-foreground">{"// Low:<35  Medium:<65  High:65+"}</div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        )}
      </div>
    </div>
  );
}
