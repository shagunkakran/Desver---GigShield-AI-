import { useState } from "react";
import { CloudRain, Wind, TrafficCone, Route, Shield, AlertTriangle, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";

const features = [
  {
    icon: CloudRain,
    title: "Weather-Based Disruption Insurance",
    description:
      "Desver detects extreme weather conditions such as heavy rain, storms, or heatwaves and compensates workers when working becomes difficult or unsafe. Our weather APIs monitor conditions in real-time and trigger payouts automatically.",
    details: [
      "Real-time weather monitoring via APIs",
      "Automatic threshold-based triggers",
      "Heavy rain, heatwave, and storm detection",
      "Regional weather pattern analysis",
    ],
  },
  {
    icon: Wind,
    title: "Pollution & Environmental Risk Coverage",
    description:
      "When pollution levels (AQI) exceed safe thresholds, workers may reduce activity or face health risks. Desver provides compensation during such periods, encouraging workers to prioritize their health.",
    details: [
      "AQI monitoring and threshold alerts",
      "Health risk based compensation",
      "Pollution spike prediction",
      "City-level granular tracking",
    ],
  },
  {
    icon: TrafficCone,
    title: "Road & Traffic Disruption Detection",
    description:
      "Desver identifies blocked routes, traffic restrictions, protests, or city-wide disruptions and triggers compensation when delivery becomes impractical due to infrastructure issues.",
    details: [
      "Real-time traffic API integration",
      "Protest and road block detection",
      "City-wide disruption mapping",
      "Historical disruption pattern analysis",
    ],
  },
  {
    icon: Route,
    title: "AI Route Risk Predictor",
    description:
      "Our AI analyzes traffic data, weather conditions, and historical delivery patterns to identify risky delivery routes. Workers receive safer route suggestions to minimize delays and maximize earnings.",
    details: [
      "Route A → Risk 82% (avoid)",
      "Route B → Risk 18% (safe)",
      "Multi-signal risk scoring",
      "Real-time alternative route suggestions",
    ],
  },
  {
    icon: Shield,
    title: "Adversarial Defense & Anti-Spoofing",
    description:
      "Desver validates real-world worker activity beyond GPS. Our fraud detection system analyzes movement patterns, delivery logs, app session data, and cluster patterns to prevent GPS spoofing and coordinated fraud rings.",
    details: [
      "Multi-signal worker activity validation",
      "GPS movement consistency checks",
      "Cluster fraud ring detection",
      "Fair review process for flagged claims",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Smart Claim Processing",
    description:
      "Claims are processed through a multi-layer validation system. Low fraud score claims get automatic payouts, while high fraud score claims are flagged for review — never automatically rejected, ensuring fairness.",
    details: [
      "AI fraud scoring mechanism",
      "Auto-payout for verified claims",
      "Human review for flagged claims",
      "Worker can submit manual reports",
    ],
  },
];

export default function FeaturesPage() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <MapPin className="h-4 w-4" />
              Platform Capabilities
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">Features</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive income protection powered by event-driven architecture, AI risk prediction, and parametric insurance triggers.
            </p>
          </div>
        </AnimatedSection>

        <div className="space-y-6 max-w-4xl mx-auto">
          {features.map((feature, i) => {
            const isExpanded = expandedIndex === i;
            return (
              <AnimatedSection key={feature.title} delay={i * 80}>
                <div
                  className="glass-card rounded-xl p-6 md:p-8 hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => setExpandedIndex(isExpanded ? null : i)}
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                        <feature.icon className="h-7 w-7 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-xl font-semibold mb-2">{feature.title}</h3>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-muted-foreground mb-4">{feature.description}</p>
                      <div className={`grid sm:grid-cols-2 gap-2 overflow-hidden transition-all duration-300 ${
                        isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                      }`}>
                        {feature.details.map((detail) => (
                          <div key={detail} className="flex items-start gap-2 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </div>
  );
}
