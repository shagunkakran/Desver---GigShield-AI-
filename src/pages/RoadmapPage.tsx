import { useState } from "react";
import { CheckCircle, Circle, ArrowRight } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";

const phases = [
  {
    phase: "Phase 1",
    title: "MVP",
    status: "current",
    items: [
      { label: "Weather disruption detection", done: true },
      { label: "Pollution risk detection", done: true },
      { label: "Traffic disruption handling", done: true },
      { label: "Kafka event processing", done: true },
      { label: "AI risk prediction", done: true },
    ],
  },
  {
    phase: "Phase 2",
    title: "Platform Integration",
    status: "upcoming",
    items: [
      { label: "Swiggy integration", done: false },
      { label: "Zomato integration", done: false },
      { label: "Blinkit integration", done: false },
      { label: "Uber Eats integration", done: false },
    ],
  },
  {
    phase: "Phase 3",
    title: "Advanced AI",
    status: "future",
    items: [
      { label: "Delivery demand forecasting", done: false },
      { label: "Restaurant reliability scoring", done: false },
      { label: "Dynamic premium pricing", done: false },
      { label: "Enhanced fraud detection", done: false },
    ],
  },
  {
    phase: "Phase 4",
    title: "Gig Worker Financial Ecosystem",
    status: "future",
    items: [
      { label: "Emergency micro-loans", done: false },
      { label: "Smart savings tools", done: false },
      { label: "AI disruption prediction alerts", done: false },
      { label: "Financial dashboard", done: false },
    ],
  },
  {
    phase: "Phase 5",
    title: "Global Expansion",
    status: "future",
    items: [
      { label: "Southeast Asia markets", done: false },
      { label: "European markets", done: false },
      { label: "Latin American markets", done: false },
    ],
  },
];

export default function RoadmapPage() {
  const [expandedPhase, setExpandedPhase] = useState<string | null>("Phase 1");

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-16">
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">Roadmap</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our journey from MVP to the global AI-powered financial protection layer for gig workers. Click on a phase to expand.
            </p>
          </div>
        </AnimatedSection>

        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border hidden md:block" />

            <div className="space-y-6">
              {phases.map((phase, i) => {
                const isExpanded = expandedPhase === phase.phase;
                return (
                  <AnimatedSection key={phase.phase} delay={i * 80}>
                    <div className="relative flex gap-6 cursor-pointer" onClick={() => setExpandedPhase(isExpanded ? null : phase.phase)}>
                      <div className="hidden md:flex flex-shrink-0 w-12 h-12 rounded-full items-center justify-center z-10 transition-colors"
                        style={{
                          background: phase.status === "current" ? "hsl(var(--primary))" : "hsl(var(--muted))",
                          color: phase.status === "current" ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                        }}
                      >
                        {phase.status === "current" ? (
                          <ArrowRight className="h-5 w-5" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </div>

                      <div className={`flex-1 glass-card rounded-xl p-6 transition-all ${
                        phase.status === "current" ? "ring-2 ring-primary/30" : ""
                      } ${isExpanded ? "shadow-lg" : ""}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                            {phase.phase}
                          </span>
                          <h3 className="font-display text-lg font-semibold">{phase.title}</h3>
                          {phase.status === "current" && (
                            <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">In Progress</span>
                          )}
                        </div>
                        <div className={`space-y-2 overflow-hidden transition-all duration-300 ${
                          isExpanded ? "max-h-96 opacity-100 mt-3" : "max-h-0 opacity-0"
                        }`}>
                          {phase.items.map((item) => (
                            <div key={item.label} className="flex items-center gap-2 text-sm">
                              {item.done ? (
                                <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                              )}
                              <span className={item.done ? "" : "text-muted-foreground"}>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </AnimatedSection>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
