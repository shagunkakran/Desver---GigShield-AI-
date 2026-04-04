/**
 * PremiumPage.tsx
 * Dynamic premium calculator — live updates as inputs change.
 * Also houses the Automated Triggers system (Rain / Unsafe Zone / Multiple Claims).
 */

import { useState, useEffect, useCallback } from "react";
import {
  Calculator, CloudRain, MapPin, Clock, ShieldAlert, Zap,
  TrendingUp, TrendingDown, Bell, AlertTriangle, Radar, Loader2, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import AnimatedSection from "@/components/AnimatedSection";
import { useWorker } from "@/contexts/WorkerContext";
import { calculatePremium, type PlanType } from "@/utils/premiumCalculator";
import { type RiskLevel } from "@/utils/riskEngine";
import { evaluateIntelligence, type IntelligenceResponse } from "@/lib/api";

// ── Toggle component ─────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
  icon: Icon,
  description,
  impact,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  icon: any;
  description: string;
  impact: string;
}) {
  return (
    <div
      className={`glass-card rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
        checked ? "ring-2 ring-primary/40" : ""
      }`}
      onClick={() => onChange(!checked)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${checked ? "text-primary" : "text-muted-foreground"}`} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        {/* visual toggle pill */}
        <div
          className={`w-10 h-5 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
        >
          <div
            className={`w-4 h-4 mt-0.5 rounded-full bg-white shadow transition-transform ${
              checked ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <p className={`text-xs font-semibold mt-1 ${checked ? "text-primary" : "text-muted-foreground/50"}`}>
        {impact}
      </p>
    </div>
  );
}

// ── Animated counter for premium ─────────────────────────────────────────────

function AnimatedAmount({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    const diff = value - displayed;
    const step = diff / 10;
    let count = 0;
    const timer = setInterval(() => {
      count++;
      setDisplayed((prev) => {
        const next = prev + step;
        return count >= 10 ? value : Math.round(next);
      });
      if (count >= 10) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [value]); // eslint-disable-line

  return <>{displayed}</>;
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function PremiumPage() {
  const { profile, policy, triggerClaim, addTrigger, removeTrigger, activeTriggers, claims } =
    useWorker();

  const [isRaining, setIsRaining] = useState(activeTriggers.includes("rain"));
  const [isSafeZone, setIsSafeZone] = useState(activeTriggers.includes("safeZone"));
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [intel, setIntel] = useState<IntelligenceResponse | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  /** `null` = ML layer not loaded yet; number = API delta applied to weekly premium */
  const [mlPremiumDelta, setMlPremiumDelta] = useState<number | null>(null);

  const runIntelligence = useCallback(async () => {
    const loc = profile?.location ?? "Delhi";
    setIntelLoading(true);
    try {
      const data = await evaluateIntelligence(loc);
      setIntel(data);
      setMlPremiumDelta(data.ml.weeklyPremiumDeltaINR);

      const rainOn = data.triggers.some((t) => t.id === "weather_precipitation" && t.active);
      setIsRaining(rainOn);

      const aqiOn = data.triggers.some((t) => t.id === "air_quality" && t.active);
      const trafficOn = data.triggers.some((t) => t.id === "traffic_civic_mock" && t.active);

      if (aqiOn) addTrigger("aqiLive");
      else removeTrigger("aqiLive");
      if (trafficOn) addTrigger("trafficMock");
      else removeTrigger("trafficMock");

      if (policy && aqiOn) {
        const openPollution = claims.find(
          (c) => c.type === "Pollution Spike" && c.status !== "completed"
        );
        if (!openPollution) {
          triggerClaim(
            "Pollution Spike",
            150,
            "AQI / PM2.5 signal from Open-Meteo air-quality API — zero-touch pollution claim"
          );
          toast.success("Auto-claim: pollution spike signal");
        }
      }

      if (policy && trafficOn) {
        const openT = claims.find(
          (c) => c.type === "Traffic Blockage" && c.status !== "completed"
        );
        if (!openT) {
          triggerClaim(
            "Traffic Blockage",
            200,
            "Mock civic / corridor disruption feed — route income loss protection"
          );
          toast.success("Auto-claim: traffic disruption signal");
        }
      }

      toast.success("Live intelligence refreshed (5 triggers + ML)");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "API unreachable";
      toast.error(`Intelligence API: ${msg}. Run \`npm run server\` in MEEHSUS.`);
    } finally {
      setIntelLoading(false);
    }
  }, [
    profile?.location,
    policy,
    claims,
    triggerClaim,
    addTrigger,
    removeTrigger,
  ]);

  // Trigger auto-claim when rain is turned on and policy exists
  useEffect(() => {
    if (isRaining) {
      addTrigger("rain");
      if (policy) {
        // Only auto-trigger if no recent rain claim
        const recentRain = claims.find((c) => c.type === "Weather Disruption" && c.status !== "completed");
        if (!recentRain) {
          triggerClaim("Weather Disruption", 300, "Heavy rainfall detected — income protection activated");
        }
      }
    } else {
      removeTrigger("rain");
    }
  }, [isRaining]); // eslint-disable-line

  useEffect(() => {
    if (isSafeZone) addTrigger("safeZone");
    else removeTrigger("safeZone");
  }, [isSafeZone]); // eslint-disable-line

  const plan = (policy?.plan ?? "basic") as PlanType;
  const riskLevel = (profile?.riskLevel ?? "medium") as RiskLevel;
  const location = profile?.location ?? "Delhi";

  const result = calculatePremium({
    plan,
    riskLevel,
    location,
    isRaining,
    isSafeZone,
    hoursPerDay,
    mlAdjustment: mlPremiumDelta === null ? undefined : mlPremiumDelta,
  });

  const basePremium = policy?.weeklyPremium ?? result.total;
  const delta = result.total - basePremium;

  // Multiple claims fraud trigger
  const multipleClaims = claims.length >= 4;

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <AnimatedSection>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Calculator className="h-4 w-4" />
              Dynamic Premium Engine
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-3">
              Premium Calculator
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Toggle real-world conditions and watch your premium update live. Our formula weighs
              weather, location safety, and work hours in real time.
            </p>
          </div>
        </AnimatedSection>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          {/* LEFT — Inputs / Triggers */}
          <div className="space-y-6">
            <AnimatedSection>
              <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Automated Triggers
              </h2>

              <div className="glass-card rounded-xl p-4 mb-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Radar className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">Hyper-local intelligence</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Calls <strong>5 automated triggers</strong> (Open-Meteo weather, Open-Meteo air
                      quality, Nager.Date India holidays, water-logging heuristics, mock civic feed) and
                      runs the <strong>ML pricing model</strong> on the server.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  className="w-full gap-2"
                  variant="secondary"
                  disabled={intelLoading}
                  onClick={() => void runIntelligence()}
                >
                  {intelLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {intelLoading ? "Fetching signals…" : "Run live intelligence (API + ML)"}
                </Button>
                {intel?.ml?.extendedCoverageHours ? (
                  <p className="text-xs text-primary font-medium flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Predictive weather: +{intel.ml.extendedCoverageHours}h extended coverage window
                    (model output)
                  </p>
                ) : null}
              </div>

              {intel?.triggers?.length ? (
                <div className="space-y-2 mb-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Live signal feed
                  </h3>
                  {intel.triggers.map((t) => (
                    <div
                      key={t.id}
                      className={`rounded-lg border px-3 py-2 text-xs ${
                        t.active ? "border-primary/40 bg-primary/5" : "border-border/60 bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{t.name}</span>
                        <span
                          className={
                            t.active ? "text-destructive font-semibold" : "text-muted-foreground"
                          }
                        >
                          {t.active ? "ACTIVE" : "OK"}
                        </span>
                      </div>
                      <div className="text-muted-foreground mt-1">{t.detail}</div>
                      <div className="text-[10px] text-muted-foreground/80 mt-1 font-mono">
                        {t.source}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {intel?.ml?.explanations?.length ? (
                <div className="glass-card rounded-xl p-4 mb-4 space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> ML explanations
                  </h3>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                    {intel.ml.explanations.map((ex, i) => (
                      <li key={i}>{ex}</li>
                    ))}
                  </ul>
                  <div className="text-xs font-mono bg-muted/50 rounded p-2 mt-2">
                    Δ premium: {intel.ml.weeklyPremiumDeltaINR >= 0 ? "+" : ""}
                    ₹{intel.ml.weeklyPremiumDeltaINR}/week · model {intel.ml.modelId}
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                {/* Trigger 1: Rain */}
                <Toggle
                  checked={isRaining}
                  onChange={setIsRaining}
                  label="Rain Detected"
                  icon={CloudRain}
                  description="Simulate heavy rainfall in your zone — triggers income loss claim automatically."
                  impact={isRaining ? "+₹12/week surcharge applied" : "Toggle to simulate rain event"}
                />

                {/* Trigger 2: Safe Zone */}
                <Toggle
                  checked={isSafeZone}
                  onChange={setIsSafeZone}
                  label="Safe Delivery Zone"
                  icon={MapPin}
                  description="Mark your zone as safe — historically low accident and disruption rates."
                  impact={isSafeZone ? "−₹10/week discount applied" : "Toggle for safe zone discount"}
                />

                {/* Trigger 3: Multiple Claims (read-only, auto-detected) */}
                <div
                  className={`glass-card rounded-xl p-4 ${
                    multipleClaims ? "ring-2 ring-destructive/40" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`h-4 w-4 ${multipleClaims ? "text-destructive" : "text-muted-foreground"}`}
                      />
                      <span className="text-sm font-medium">Multiple Claims Detected</span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        multipleClaims
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {multipleClaims ? "ACTIVE" : "Monitoring"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {multipleClaims
                      ? `⚠️ ${claims.length} claims detected — fraud warning raised. Account under soft review.`
                      : `Monitoring claim frequency. Alert triggers at 4+ claims.`}
                  </p>
                </div>
              </div>
            </AnimatedSection>

            {/* Working Hours Slider */}
            <AnimatedSection delay={100}>
              <div className="glass-card rounded-xl p-6">
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Daily Working Hours: <span className="text-primary font-bold ml-1">{hoursPerDay}h</span>
                </h3>
                <input
                  type="range"
                  min={4}
                  max={16}
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>4h</span>
                  <span>Standard (8h)</span>
                  <span>16h</span>
                </div>
                {hoursPerDay > 8 && (
                  <p className="text-xs text-accent mt-2">
                    ⏱ {hoursPerDay - 8} extra hours × ₹2 = +₹{(hoursPerDay - 8) * 2}/week added
                  </p>
                )}
              </div>
            </AnimatedSection>

            {/* Formula display */}
            <AnimatedSection delay={150}>
              <div className="glass-card rounded-xl p-6">
                <h3 className="font-display font-semibold mb-3 text-sm text-primary">
                  Premium Formula
                </h3>
                <div className="bg-muted rounded-lg p-3 font-mono text-xs space-y-1">
                  <div className="text-muted-foreground">// Dynamic Premium Engine</div>
                  <div>
                    <span className="text-primary">premium</span> = base
                  </div>
                  <div className="ml-8">+ risk_factor ({riskLevel})</div>
                  <div className="ml-8">+ location_risk ({location})</div>
                  {isRaining && <div className="ml-8 text-accent">+ rain_surcharge</div>}
                  {isSafeZone && <div className="ml-8 text-success">− safe_zone_discount</div>}
                  {hoursPerDay > 8 && (
                    <div className="ml-8 text-accent">+ extra_hours × rate</div>
                  )}
                </div>
              </div>
            </AnimatedSection>
          </div>

          {/* RIGHT — Live Premium Output */}
          <div className="space-y-6">
            {/* Main premium display */}
            <AnimatedSection delay={80}>
              <div className="glass-card rounded-2xl p-8 text-center border-2 border-primary/20">
                <div className="text-sm text-muted-foreground mb-2">Current Weekly Premium</div>
                <div className="font-display text-6xl font-black text-primary mb-1">
                  ₹<AnimatedAmount value={result.total} />
                </div>
                <div className="text-sm text-muted-foreground">/week</div>

                {delta !== 0 && (
                  <div
                    className={`inline-flex items-center gap-1 mt-3 text-sm font-semibold px-3 py-1 rounded-full ${
                      delta > 0
                        ? "bg-destructive/10 text-destructive"
                        : "bg-success/10 text-success"
                    }`}
                  >
                    {delta > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {delta > 0 ? "+" : ""}₹{Math.abs(delta)} vs base
                  </div>
                )}
              </div>
            </AnimatedSection>

            {/* Breakdown */}
            <AnimatedSection delay={120}>
              <div className="glass-card rounded-xl p-6">
                <h3 className="font-display font-semibold mb-4">Breakdown</h3>
                <div className="space-y-3">
                  {result.breakdown.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{item.label}</span>
                      <span
                        className={`font-display font-bold ${
                          item.type === "subtract" ? "text-success" : ""
                        }`}
                      >
                        {item.type === "subtract" ? "−" : "+"}₹{item.amount}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-3 flex justify-between font-display font-bold">
                    <span>Total Premium</span>
                    <span className="text-primary text-lg">₹{result.total}</span>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* Active claim alerts */}
            {isRaining && (
              <AnimatedSection>
                <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                  <Bell className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-sm text-accent">Rain Trigger Active</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Income loss claim auto-submitted to Claims Engine. Check the Claims page for
                      live payout status.
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            )}

            {multipleClaims && (
              <AnimatedSection>
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                  <ShieldAlert className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-sm text-destructive">Fraud Warning Raised</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {claims.length} claims detected. Soft review triggered. Check Fraud Detection
                      score on the Dashboard.
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
