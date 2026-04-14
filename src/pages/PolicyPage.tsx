/**
 * PolicyPage.tsx
 * Insurance policy selection and management.
 * Shows coverage details and MANDATORY exclusions (War / Pandemic / Fraud).
 * Reads worker risk profile to recommend the right plan.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, Check, X, AlertTriangle, Zap, ChevronRight, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedSection from "@/components/AnimatedSection";
import { useWorker } from "@/contexts/WorkerContext";
import { calculatePremium } from "@/utils/premiumCalculator";
import { RISK_COLORS, RISK_BG } from "@/utils/riskEngine";

// ── Plan data ────────────────────────────────────────────────────────────────

interface Plan {
  id: "basic" | "premium";
  name: string;
  badge?: string;
  description: string;
  coverages: { label: string; detail: string }[];
  exclusions: { label: string; reason: string }[];
}

const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic Plan",
    description: "Essential protection for low-to-medium risk workers.",
    coverages: [
      { label: "Weather Disruption", detail: "Heavy rain, storms, heatwaves — auto-triggered payouts." },
      { label: "Pollution Spike", detail: "AQI above safe thresholds — income protection activated." },
      { label: "Standard Payout Speed", detail: "Compensation credited within 5 minutes." },
    ],
    exclusions: [
      { label: "War / Civil Unrest", reason: "Systemic risks not insurable at individual level." },
      { label: "Pandemic Events", reason: "Government-declared health emergencies excluded." },
      { label: "Fraud / Misrepresentation", reason: "False claims immediately void coverage." },
    ],
  },
  {
    id: "premium",
    name: "Premium Plan",
    badge: "Recommended",
    description: "Full-spectrum coverage for high-risk delivery workers.",
    coverages: [
      { label: "Weather Disruption", detail: "Heavy rain, storms, heatwaves — priority payouts." },
      { label: "Pollution Spike (AQI)", detail: "Full income loss protection on pollution alerts." },
      { label: "Traffic & Road Blockage", detail: "Route closures, protests, city shutdowns covered." },
      { label: "Accident Coverage", detail: "Minor incident compensation during active shifts." },
      { label: "Income Loss Protection", detail: "Estimated earnings covered when disruption lasts 2h+." },
      { label: "AI Route Suggestions", detail: "Real-time safer route alerts from our risk engine." },
      { label: "Priority Payout Speed", detail: "Sub-2 minute automatic wallet credit." },
    ],
    exclusions: [
      { label: "War / Civil Unrest", reason: "Systemic risks not insurable at individual level." },
      { label: "Pandemic Events", reason: "Government-declared health emergencies excluded." },
      { label: "Fraud / Misrepresentation", reason: "False claims immediately void all benefits." },
    ],
  },
];

// ── Main Component ───────────────────────────────────────────────────────────

export default function PolicyPage() {
  const navigate = useNavigate();
  const { profile, policy, selectPolicy } = useWorker();

  const [selected, setSelected] = useState<"basic" | "premium">(
    policy?.plan ?? (profile?.riskLevel === "high" ? "premium" : "basic")
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Compute current premium for the selected plan
  const premiumResult = calculatePremium({
    plan: selected,
    riskLevel: profile?.riskLevel ?? "medium",
    location: profile?.location ?? "Delhi",
    isRaining: false,
    isSafeZone: false,
    hoursPerDay: 8,
  });

  function handleActivate() {
    selectPolicy(selected, premiumResult.total);
    setConfirmed(true);
    setTimeout(() => navigate("/worker/premium"), 1400);
  }

  const selectedPlan = PLANS.find((p) => p.id === selected)!;
  const activeCoverageHours = policy?.plan === "premium" ? 24 : policy?.plan ? 12 : 0;

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <AnimatedSection>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Shield className="h-4 w-4" />
              Insurance Policy Management
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-3">
              Choose Your Coverage
            </h1>
            {profile && (
              <p className="text-muted-foreground max-w-xl mx-auto">
                Based on your profile in{" "}
                <strong className={RISK_COLORS[profile.riskLevel]}>{profile.location}</strong>{" "}
                as a {profile.workerType} worker, your risk level is{" "}
                <strong className={RISK_COLORS[profile.riskLevel]}>
                  {profile.riskLevel.toUpperCase()}
                </strong>
                .
              </p>
            )}
          </div>
        </AnimatedSection>

        {policy?.active && (
          <AnimatedSection>
            <div className="max-w-4xl mx-auto mb-8 glass-card-premium rounded-2xl p-5 card-lift">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Active Policy</div>
                  <div className="font-display text-xl font-bold capitalize">{policy.plan} plan</div>
                  <div className="text-sm text-muted-foreground">
                    Coverage Hours: {activeCoverageHours}h/day • Weekly Premium: ₹{policy.weeklyPremium}
                  </div>
                </div>
                <div className="flex gap-2">
                  {policy.plan !== "premium" ? (
                    <Button variant="outline" onClick={() => setSelected("premium")}>Upgrade</Button>
                  ) : (
                    <Button variant="outline" onClick={() => setSelected("basic")}>Downgrade</Button>
                  )}
                </div>
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* Plan selector */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
          {PLANS.map((plan, i) => (
            <AnimatedSection key={plan.id} delay={i * 100}>
              <div
                onClick={() => setSelected(plan.id)}
                className={`glass-card rounded-2xl p-6 cursor-pointer transition-all hover:shadow-xl relative ${
                  selected === plan.id
                    ? "ring-2 ring-primary scale-[1.02]"
                    : "hover:scale-[1.01]"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3" /> {plan.badge}
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-display text-xl font-bold">{plan.name}</h2>
                  {selected === plan.id && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                {/* Coverage list */}
                <div className="space-y-2 mb-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">
                    ✅ Coverage Included
                  </h4>
                  {plan.coverages.map((cov) => (
                    <div
                      key={cov.label}
                      className="text-sm flex items-start gap-2 cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(expanded === `${plan.id}-${cov.label}` ? null : `${plan.id}-${cov.label}`);
                      }}
                    >
                      <Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium group-hover:text-primary transition-colors">
                          {cov.label}
                        </span>
                        {expanded === `${plan.id}-${cov.label}` && (
                          <p className="text-xs text-muted-foreground mt-0.5 animate-fade-in">
                            {cov.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Exclusions — always visible, per hackathon requirements */}
                <div className="border-t border-border/50 pt-4 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-destructive mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Exclusions (Not Covered)
                  </h4>
                  {plan.exclusions.map((excl) => (
                    <div
                      key={excl.label}
                      className="text-sm flex items-start gap-2 cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(expanded === `${plan.id}-excl-${excl.label}` ? null : `${plan.id}-excl-${excl.label}`);
                      }}
                    >
                      <X className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                          {excl.label}
                        </span>
                        {expanded === `${plan.id}-excl-${excl.label}` && (
                          <p className="text-xs text-muted-foreground mt-0.5 animate-fade-in">
                            {excl.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* Premium summary + activate */}
        <AnimatedSection>
          <div className="max-w-xl mx-auto glass-card rounded-2xl p-8">
            <h3 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Your Weekly Premium
            </h3>

            <div className="space-y-2 mb-6">
              {premiumResult.breakdown.map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className={item.type === "subtract" ? "text-success" : ""}>
                    {item.type === "subtract" ? "−" : "+"}₹{item.amount}
                  </span>
                </div>
              ))}
              <div className="border-t border-border pt-2 flex justify-between font-display font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">₹{premiumResult.total}/week</span>
              </div>
            </div>

            {confirmed ? (
              <div className="flex items-center gap-3 bg-success/10 text-success rounded-lg p-4 animate-fade-in">
                <Check className="h-5 w-5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Policy activated!</div>
                  <div className="text-xs text-muted-foreground">Redirecting to premium calculator…</div>
                </div>
              </div>
            ) : (
              <Button className="w-full gap-2" onClick={handleActivate}>
                Activate {selectedPlan.name}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}

            <p className="text-xs text-muted-foreground text-center mt-3">
              Click any coverage or exclusion item to expand details.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
