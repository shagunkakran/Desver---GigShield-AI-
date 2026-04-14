import { useState } from "react";
import {
  Shield, MapPin, Activity, Users, AlertTriangle,
  CheckCircle, XCircle, Eye, Fingerprint, Radio, Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedSection from "@/components/AnimatedSection";

const validationSignals = [
  { icon: MapPin, label: "GPS Movement Consistency", desc: "Continuous vs static location analysis — detects teleportation anomalies" },
  { icon: Activity, label: "Delivery Activity Logs", desc: "Order acceptance, completion timestamps, and active session durations" },
  { icon: Radio, label: "Network Pattern Analysis", desc: "Detects sudden location jumps and impossible travel speeds" },
  { icon: Fingerprint, label: "App Session Activity", desc: "Foreground usage, interaction frequency, and behavioral fingerprints" },
  { icon: Eye, label: "Weather Correlation Check", desc: "Cross-validates worker location with actual weather conditions in that zone" },
  { icon: Users, label: "Cluster Fraud Detection", desc: "Identifies groups of users with identical patterns — potential fraud rings" },
];

const fraudScenarios = [
  {
    title: "GPS Spoofing Attack",
    description: "A worker uses a GPS spoofing app to fake their location in a disruption zone while actually being at home.",
    signals: ["Static GPS with no movement", "No delivery logs", "No app interaction", "Location mismatch with cell tower"],
    verdict: "Flagged",
    score: 92,
  },
  {
    title: "Coordinated Fraud Ring",
    description: "500 workers suddenly appear at the same coordinates with identical timestamps and zero deliveries.",
    signals: ["Cluster of identical locations", "No movement patterns", "Same timestamps", "Zero delivery completions"],
    verdict: "Flagged",
    score: 98,
  },
  {
    title: "Genuine Worker in Rain",
    description: "Worker Shirsh's orders drop during heavy rainfall. GPS shows reduced movement, some completed deliveries.",
    signals: ["Gradual movement reduction", "3 completed deliveries before stopping", "Active app usage", "Weather confirmed at location"],
    verdict: "Approved",
    score: 12,
  },
];

export default function AntiSpoofingPage() {
  const [activeScenario, setActiveScenario] = useState(0);
  const [simRunning, setSimRunning] = useState(false);
  const [simStep, setSimStep] = useState(-1);

  const runSimulation = () => {
    setSimRunning(true);
    setSimStep(0);
    const steps = [0, 1, 2, 3, 4];
    steps.forEach((s, i) => {
      setTimeout(() => {
        setSimStep(s);
        if (i === steps.length - 1) {
          setTimeout(() => setSimRunning(false), 800);
        }
      }, (i + 1) * 700);
    });
  };

  const scenario = fraudScenarios[activeScenario];

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <AnimatedSection>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-destructive/10 text-destructive rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Shield className="h-4 w-4" />
              Adversarial Defense System
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Anti-Spoofing & Fraud Detection
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Desver goes beyond GPS verification. Our multi-signal intelligence system
              prevents GPS spoofing, coordinated fraud rings, and fake disruption claims while
              protecting honest workers.
            </p>
          </div>
        </AnimatedSection>

        {/* Differentiation Logic */}
        <AnimatedSection className="mb-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-2xl font-bold text-center mb-8">
              Real vs Spoofed — How We Tell the Difference
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="glass-card rounded-xl p-6 border-l-4 border-l-success">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <h3 className="font-display font-semibold text-success">Genuine Claim</h3>
                </div>
                <div className="bg-muted rounded-lg p-3 font-mono text-xs space-y-1">
                  <div><span className="text-primary">IF</span> disruption_detected</div>
                  <div><span className="text-primary">AND</span> real_delivery_activity = <span className="text-success">true</span></div>
                  <div><span className="text-primary">AND</span> movement_pattern = <span className="text-success">consistent</span></div>
                  <div><span className="text-primary">→</span> <span className="text-success font-bold">APPROVE_CLAIM</span></div>
                </div>
              </div>
              <div className="glass-card rounded-xl p-6 border-l-4 border-l-destructive">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <h3 className="font-display font-semibold text-destructive">Suspicious Claim</h3>
                </div>
                <div className="bg-muted rounded-lg p-3 font-mono text-xs space-y-1">
                  <div><span className="text-primary">IF</span> disruption_detected</div>
                  <div><span className="text-primary">BUT</span> activity_signals = <span className="text-destructive">inconsistent</span></div>
                  <div><span className="text-primary">OR</span> behavior_pattern = <span className="text-destructive">anomalous</span></div>
                  <div><span className="text-primary">→</span> <span className="text-accent font-bold">FLAG_FOR_REVIEW</span></div>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Validation Signals */}
        <AnimatedSection className="mb-16">
          <h2 className="font-display text-2xl font-bold text-center mb-8">
            Multi-Signal Validation Pipeline
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {validationSignals.map((signal, i) => (
              <AnimatedSection key={signal.label} delay={i * 100}>
                <div className="glass-card rounded-xl p-5 hover:shadow-xl transition-all hover:-translate-y-1 h-full">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <signal.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h4 className="font-display font-semibold text-sm mb-1">{signal.label}</h4>
                  <p className="text-xs text-muted-foreground">{signal.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </AnimatedSection>

        {/* Fraud Score Formula */}
        <AnimatedSection className="mb-16">
          <div className="max-w-2xl mx-auto glass-card rounded-xl p-8 text-center">
            <Cpu className="h-8 w-8 text-primary mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold mb-4">AI Fraud Scoring Model</h2>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm mb-4">
              <span className="text-primary">fraud_score</span> = location_anomaly + activity_mismatch + pattern_similarity
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-success/10 rounded-lg p-3">
                <div className="font-semibold text-success">Score &lt; 40</div>
                <div className="text-xs text-muted-foreground">Auto-approve payout</div>
              </div>
              <div className="bg-destructive/10 rounded-lg p-3">
                <div className="font-semibold text-destructive">Score &gt; 40</div>
                <div className="text-xs text-muted-foreground">Flag for human review</div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Interactive Scenario Simulator */}
        <AnimatedSection className="mb-16">
          <h2 className="font-display text-2xl font-bold text-center mb-8">
            Live Fraud Detection Simulator
          </h2>
          <div className="max-w-4xl mx-auto">
            {/* Scenario tabs */}
            <div className="flex gap-2 mb-6 flex-wrap justify-center">
              {fraudScenarios.map((s, i) => (
                <button
                  key={s.title}
                  onClick={() => { setActiveScenario(i); setSimStep(-1); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeScenario === i
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>

            <div className="glass-card rounded-xl p-6">
              <div className="mb-4">
                <h3 className="font-display font-semibold text-lg mb-1">{scenario.title}</h3>
                <p className="text-sm text-muted-foreground">{scenario.description}</p>
              </div>

              {/* Detected Signals */}
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Detected Signals:</h4>
                <div className="grid sm:grid-cols-2 gap-2">
                  {scenario.signals.map((sig, i) => (
                    <div
                      key={sig}
                      className={`flex items-center gap-2 text-xs p-2 rounded-lg transition-all duration-300 ${
                        simStep >= i ? "bg-muted opacity-100" : "bg-muted/30 opacity-50"
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full transition-colors ${
                        simStep >= i
                          ? scenario.verdict === "Approved" ? "bg-success" : "bg-destructive"
                          : "bg-muted-foreground/30"
                      }`} />
                      {sig}
                    </div>
                  ))}
                </div>
              </div>

              {/* Run button + result */}
              <div className="flex items-center gap-4 mt-6">
                <Button onClick={runSimulation} disabled={simRunning} className="gap-2">
                  <Activity className="h-4 w-4" />
                  {simRunning ? "Analyzing..." : "Run Analysis"}
                </Button>

                {simStep >= 4 && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium animate-fade-in ${
                    scenario.verdict === "Approved"
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}>
                    {scenario.verdict === "Approved" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Fraud Score: {scenario.score}/100 — {scenario.verdict === "Approved" ? "Claim Approved" : "Flagged for Review"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Claim Processing Workflow */}
        <AnimatedSection className="mb-16">
          <h2 className="font-display text-2xl font-bold text-center mb-8">
            Smart Claim Processing Workflow
          </h2>
          <div className="max-w-md mx-auto space-y-3">
            {[
              { label: "Disruption Detected", icon: AlertTriangle, color: "text-accent" },
              { label: "Validate Worker Activity & Behavior", icon: Fingerprint, color: "text-primary" },
              { label: "Compute Fraud Score", icon: Cpu, color: "text-primary" },
              { label: "Low Score → Auto Payout", icon: CheckCircle, color: "text-success" },
              { label: "High Score → Flag for Review", icon: Eye, color: "text-destructive" },
              { label: "Final Decision (Auto / Assisted)", icon: Shield, color: "text-primary" },
            ].map((step, i) => (
              <AnimatedSection key={step.label} delay={i * 80}>
                <div className="glass-card rounded-lg p-4 flex items-center gap-4">
                  <div className={`flex-shrink-0 ${step.color}`}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">{step.label}</span>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </AnimatedSection>

        {/* Fairness guarantee */}
        <AnimatedSection>
          <div className="max-w-2xl mx-auto glass-card rounded-xl p-8 text-center border-2 border-success/20">
            <Shield className="h-10 w-10 text-success mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold mb-3">Fairness Guarantee</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Flagged claims are <strong>never automatically rejected</strong>. They are marked as
              "Under Review" and workers can submit manual reports, delivery logs, and additional evidence.
              If a disruption is confirmed and no strong fraud signal exists, the claim is approved.
            </p>
            <div className="bg-muted rounded-lg p-3 font-mono text-xs">
              <span className="text-primary">IF</span> disruption_confirmed <span className="text-primary">AND</span> fraud_signal = <span className="text-success">weak</span> <span className="text-primary">→</span> <span className="text-success font-bold">APPROVE</span>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
