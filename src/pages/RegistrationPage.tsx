/**
 * RegistrationPage.tsx
 * Worker registration form with real-time risk level computation.
 * After registration, redirects to the Policy page.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, User, MapPin, Briefcase, ChevronRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedSection from "@/components/AnimatedSection";
import { toast } from "sonner";
import { useWorker } from "@/contexts/WorkerContext";
import { registerWorkerApi } from "@/lib/api";
import {
  calculateRiskLevel,
  getLocations,
  getWorkerTypes,
  RISK_COLORS,
  RISK_BG,
  type RiskLevel,
} from "@/utils/riskEngine";

// ── Sub-components ───────────────────────────────────────────────────────────

function RiskMeter({ score, level }: { score: number; level: RiskLevel }) {
  const barColor =
    level === "low" ? "bg-success" : level === "medium" ? "bg-accent" : "bg-destructive";

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Low Risk</span>
        <span>High Risk</span>
      </div>
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold capitalize ${RISK_COLORS[level]}`}>
          {level} Risk Zone
        </span>
        <span className="text-sm font-display font-bold">{score}/100</span>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function RegistrationPage() {
  const navigate = useNavigate();
  const { register, profile } = useWorker();

  const [form, setForm] = useState({
    name: profile?.name ?? "",
    workerType: profile?.workerType ?? "delivery",
    location: profile?.location ?? "Delhi",
  });

  const [submitted, setSubmitted] = useState(false);

  // Live risk calculation as user fills the form
  const liveRisk = calculateRiskLevel(form.location, form.workerType);

  const locations = getLocations();
  const workerTypes = getWorkerTypes();

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    const risk = calculateRiskLevel(form.location, form.workerType);
    try {
      const res = await registerWorkerApi({
        name: form.name.trim(),
        workerType: form.workerType,
        location: form.location,
        riskLevel: risk.level,
        riskScore: risk.score,
      });
      register({
        name: form.name.trim(),
        workerType: form.workerType as any,
        location: form.location,
        serverId: res.id,
      });
    } catch {
      toast.error(
        "Server registration failed. Start MongoDB, set MONGODB_URI in MEEHSUS/.env, then run npm run server."
      );
      return;
    }
    setSubmitted(true);
    setTimeout(() => navigate("/policy"), 1600);
  }

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <AnimatedSection>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Shield className="h-4 w-4" />
              Phase 2 — Worker Onboarding
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-3">
              Worker Registration
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Register your profile and instantly see your risk level — calculated from your
              city and worker type using our AI risk engine.
            </p>
          </div>
        </AnimatedSection>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Form */}
          <AnimatedSection>
            <div className="glass-card rounded-2xl p-8 space-y-6">
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Your Profile
              </h2>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Shirsh Gupta"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Worker Type */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-primary" /> Worker Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {workerTypes.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => handleChange("workerType", value)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        form.workerType === value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" /> City / Location
                </label>
                <select
                  value={form.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Submit */}
              {submitted ? (
                <div className="flex items-center gap-3 text-success bg-success/10 rounded-lg p-4 animate-fade-in">
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-sm">Registration successful!</div>
                    <div className="text-xs text-muted-foreground">Redirecting to policy selection…</div>
                  </div>
                </div>
              ) : (
                <Button
                  className="w-full gap-2"
                  onClick={handleSubmit}
                  disabled={!form.name.trim()}
                >
                  Continue to Policy Selection
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </AnimatedSection>

          {/* Live Risk Panel */}
          <AnimatedSection delay={100}>
            <div className="space-y-6">
              {/* Risk Result Card */}
              <div className={`glass-card rounded-2xl p-8 border-2 transition-all duration-500 ${RISK_BG[liveRisk.level]} border-transparent`}>
                <h2 className="font-display text-xl font-bold mb-6">Live Risk Assessment</h2>
                <RiskMeter score={liveRisk.score} level={liveRisk.level} />

                <div className="mt-6 space-y-3">
                  {liveRisk.breakdown.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-lg"
                    >
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-display font-bold">{item.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Explanation */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-display font-semibold mb-3 text-sm">What this means</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {liveRisk.level === "low" && (
                    <p>✅ You operate in a low-disruption zone. You qualify for our most affordable <strong>Basic Plan</strong> starting at ₹50/week.</p>
                  )}
                  {liveRisk.level === "medium" && (
                    <p>⚠️ Moderate disruption risk in your area. Our <strong>Medium Plan</strong> at ₹60/week includes traffic and pollution coverage.</p>
                  )}
                  {liveRisk.level === "high" && (
                    <p>🔴 High disruption frequency detected. We recommend the <strong>Premium Plan</strong> at ₹80/week for full coverage including income loss protection.</p>
                  )}
                </div>
              </div>

              {/* How risk is calculated */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-display font-semibold mb-3 text-sm text-primary">Risk Formula</h3>
                <div className="bg-muted rounded-lg p-3 font-mono text-xs">
                  <div><span className="text-primary">risk_score</span> = location_score × 0.5</div>
                  <div className="ml-8">+ worker_type_score × 0.5</div>
                  <div className="mt-1 text-muted-foreground">{"// Low: <45  Medium: <65  High: 65+"}</div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
}
