import { useState } from "react";
import { ArrowDown, CloudRain, Cpu, BarChart3, CheckCircle, Wallet, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedSection from "@/components/AnimatedSection";

const steps = [
  {
    icon: CloudRain,
    step: 1,
    title: "Disruption Detected",
    description: "External weather API detects extreme conditions and sends an event to the system.",
    detail: { type: "weather_alert", location: "Delhi", rainfall: "85mm", timestamp: "10:05 AM" },
  },
  {
    icon: Cpu,
    step: 2,
    title: "Event Processing via Kafka",
    description: "The disruption event is streamed through Apache Kafka and mapped to affected regions and active workers.",
    detail: null,
  },
  {
    icon: BarChart3,
    step: 3,
    title: "AI Risk Analysis",
    description: "The AI risk engine evaluates severity of weather, geographic impact, worker activity levels, and historical patterns.",
    detail: { disruption_severity: "0.87", estimated_income_loss: "₹300", affected_workers: "1,240" },
  },
  {
    icon: CheckCircle,
    step: 4,
    title: "Parametric Trigger Check",
    description: "If conditions exceed predefined thresholds, the parametric insurance engine triggers compensation automatically.",
    detail: { rule: "rainfall > threshold AND worker_activity is low", result: "TRIGGER_COMPENSATION" },
  },
  {
    icon: Wallet,
    step: 5,
    title: "Automatic Payout",
    description: "Compensation is credited directly to the worker's Desver wallet with a notification.",
    detail: { compensation: "₹300", reason: "Weather Disruption", notification: "₹300 Desver compensation credited due to heavy rainfall." },
  },
];

export default function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState(-1);
  const [running, setRunning] = useState(false);

  const runDemo = () => {
    setRunning(true);
    setActiveStep(-1);
    steps.forEach((_, i) => {
      setTimeout(() => {
        setActiveStep(i);
        if (i === steps.length - 1) setTimeout(() => setRunning(false), 600);
      }, (i + 1) * 900);
    });
  };

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-10">
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">How It Works</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
              From disruption detection to automatic payout — a complete walkthrough of the Desver demo flow.
            </p>
            <Button onClick={runDemo} disabled={running} className="gap-2">
              <Play className="h-4 w-4" />
              {running ? "Running Demo..." : "Run Live Demo"}
            </Button>
          </div>
        </AnimatedSection>

        <div className="max-w-2xl mx-auto space-y-2">
          {steps.map((step, i) => (
            <div key={step.step}>
              <AnimatedSection delay={i * 100}>
                <div className={`glass-card rounded-xl p-6 transition-all duration-500 ${
                  activeStep >= i ? "ring-2 ring-primary/40 shadow-lg" : ""
                } ${activeStep === i ? "scale-[1.02]" : ""}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold flex-shrink-0 transition-colors duration-500 ${
                      activeStep >= i
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <step.icon className="h-5 w-5 text-primary" />
                        <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                      {step.detail && (
                        <div className={`bg-muted rounded-lg p-3 font-mono text-xs space-y-1 transition-all duration-500 ${
                          activeStep >= i ? "opacity-100" : "opacity-50"
                        }`}>
                          {Object.entries(step.detail).map(([key, val]) => (
                            <div key={key}>
                              <span className="text-primary">{key}</span>
                              <span className="text-muted-foreground">: </span>
                              <span>{val}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </AnimatedSection>
              {i < steps.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className={`h-5 w-5 transition-colors duration-500 ${
                    activeStep > i ? "text-primary" : "text-muted-foreground/50"
                  }`} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Completion message */}
        {activeStep === steps.length - 1 && (
          <div className="max-w-2xl mx-auto mt-6">
            <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-center animate-fade-in">
              <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="text-sm font-semibold text-success">Demo Complete — ₹300 credited to Shirsh's wallet in under 5 minutes!</p>
            </div>
          </div>
        )}

        {/* Example scenario */}
        <AnimatedSection>
          <div className="max-w-2xl mx-auto mt-16">
            <h2 className="font-display text-2xl font-bold mb-6 text-center">Example Scenario</h2>
            <div className="glass-card rounded-xl p-6">
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Delivery Partner</span>
                  <p className="font-semibold">Shirsh Gupta — Zomato</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Scenario</span>
                  <p className="text-sm">
                    Heavy rainfall occurs in Delhi during peak delivery hours. Shirsh is unable to accept or complete deliveries due to unsafe weather and low order availability.
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Impact</span>
                  <ul className="text-sm space-y-1 mt-1">
                    <li>• Loss of working hours</li>
                    <li>• Reduced order opportunities</li>
                    <li>• Decreased daily income</li>
                  </ul>
                </div>
                <div className="bg-success/10 rounded-lg p-4 border border-success/20">
                  <span className="text-sm font-semibold text-success">System Response</span>
                  <p className="text-sm mt-1">
                    Weather API detects rainfall above threshold → AI validates disruption → Worker activity drops → Micro-compensation of ₹300 automatically credited to wallet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
