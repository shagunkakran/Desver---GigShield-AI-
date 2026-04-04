import { useState } from "react";
import { Server, Database, Cpu, Radio, Cloud, Box, ArrowDown } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";

const layers = [
  { icon: Box, label: "Worker Mobile App", desc: "React.js + Tailwind CSS frontend", details: "The client-facing interface where workers view alerts, track claims, manage their wallet, and receive route suggestions." },
  { icon: Server, label: "API Gateway", desc: "Express.js REST API endpoints", details: "Handles routing, rate limiting, and authentication before forwarding requests to backend services." },
  { icon: Server, label: "Node.js Backend (Express)", desc: "Business logic, authentication, routing", details: "Core application server handling user management, claim processing, and coordination between AI engine and database." },
  { icon: Database, label: "MongoDB Database + Redis Cache", desc: "Persistent storage and caching layer", details: "MongoDB stores user profiles, claims, and transactions. Redis provides sub-millisecond caching for active sessions and real-time data." },
  { icon: Radio, label: "Apache Kafka Event Stream", desc: "Real-time event streaming and processing", details: "Kafka topics receive weather events, traffic updates, and pollution data, enabling real-time processing at scale." },
  { icon: Cpu, label: "AI Risk Engine (Python + Scikit-learn)", desc: "ML-based risk scoring and predictions", details: "Trained on historical delivery data to predict disruption severity, income loss, and fraud probability." },
  { icon: Cpu, label: "Income Loss Estimator", desc: "Calculates estimated worker income loss", details: "Uses worker earnings history, current conditions, and zone activity to estimate precise income impact." },
  { icon: Cpu, label: "Parametric Trigger Engine", desc: "Threshold-based compensation decisions", details: "Evaluates predefined parametric rules (e.g., rainfall > 50mm) to automatically trigger compensation." },
  { icon: Cloud, label: "Wallet / Compensation Payout", desc: "Automatic payouts to worker wallets", details: "Instant crediting of compensation to the worker's in-app wallet with full transaction history." },
];

const techStack = [
  { category: "Frontend", items: ["React.js", "Tailwind CSS"] },
  { category: "Backend", items: ["Node.js", "Express.js"] },
  { category: "Database", items: ["MongoDB"] },
  { category: "Cache", items: ["Redis"] },
  { category: "Event Streaming", items: ["Apache Kafka"] },
  { category: "AI / ML", items: ["Python", "Scikit-learn"] },
  { category: "Infrastructure", items: ["AWS", "Docker"] },
];

export default function ArchitecturePage() {
  const [expandedLayer, setExpandedLayer] = useState<number | null>(null);

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-16">
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">System Architecture</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Event-driven architecture powered by Apache Kafka for real-time delivery event processing. Click on any layer to learn more.
            </p>
          </div>
        </AnimatedSection>

        {/* Architecture diagram */}
        <div className="max-w-xl mx-auto mb-20">
          <div className="space-y-1">
            {layers.map((layer, i) => (
              <div key={layer.label}>
                <AnimatedSection delay={i * 60}>
                  <div
                    className={`glass-card rounded-lg p-4 flex items-start gap-4 hover:shadow-lg transition-all cursor-pointer ${
                      expandedLayer === i ? "ring-2 ring-primary/30" : ""
                    }`}
                    onClick={() => setExpandedLayer(expandedLayer === i ? null : i)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <layer.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-display font-semibold text-sm">{layer.label}</div>
                      <div className="text-xs text-muted-foreground">{layer.desc}</div>
                      {expandedLayer === i && (
                        <p className="text-xs text-foreground mt-2 bg-muted rounded-lg p-3 animate-fade-in">
                          {layer.details}
                        </p>
                      )}
                    </div>
                  </div>
                </AnimatedSection>
                {i < layers.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <AnimatedSection>
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-2xl font-bold text-center mb-8">Tech Stack</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {techStack.map((cat, i) => (
                <AnimatedSection key={cat.category} delay={i * 60}>
                  <div className="glass-card rounded-xl p-4 hover:shadow-lg transition-shadow h-full">
                    <h4 className="font-display font-semibold text-sm mb-2 text-primary">{cat.category}</h4>
                    <div className="space-y-1">
                      {cat.items.map((item) => (
                        <div key={item} className="text-sm">{item}</div>
                      ))}
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* Folder structure */}
        <AnimatedSection>
          <div className="max-w-md mx-auto mt-16">
            <h2 className="font-display text-2xl font-bold text-center mb-6">Project Structure</h2>
            <div className="glass-card rounded-xl p-6 font-mono text-sm">
              <pre className="text-muted-foreground">{`GigShield/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── lib/
│   └── public/
├── backend/
│   ├── routes/
│   ├── controllers/
│   └── middleware/
├── ai-engine/
│   ├── models/
│   └── training/
├── kafka/
├── database/
├── infrastructure/
└── README.md`}</pre>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
