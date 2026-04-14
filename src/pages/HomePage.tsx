import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Shield, CloudRain, Wind, TrafficCone, Route, TrendingUp,
  ArrowRight, Zap, Users, IndianRupee, Fingerprint,
  BarChart3
} from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import { useScrollAnimation, useCountUp } from "@/hooks/useScrollAnimation";
import { HeroIllustration, MapWalletIllustration } from "@/components/Illustrations";

const features = [
  {
    icon: CloudRain,
    title: "Weather Disruption Insurance",
    description: "Automatic compensation when extreme weather impacts your deliveries.",
    link: "/features",
  },
  {
    icon: Wind,
    title: "Pollution Risk Coverage",
    description: "Protection when pollution levels exceed safe thresholds and reduce activity.",
    link: "/features",
  },
  {
    icon: TrafficCone,
    title: "Road & Traffic Detection",
    description: "Compensation for blocked routes, traffic restrictions, and city disruptions.",
    link: "/features",
  },
  {
    icon: Route,
    title: "AI Route Risk Predictor",
    description: "Smart route analysis to identify risky paths and suggest safer alternatives.",
    link: "/features",
  },
  {
    icon: Fingerprint,
    title: "Anti-Spoofing Defense",
    description: "Multi-signal fraud detection preventing GPS spoofing and coordinated attacks.",
    link: "/features",
  },
  {
    icon: BarChart3,
    title: "Smart Claim Processing",
    description: "AI-powered claim validation with fair review for flagged submissions.",
    link: "/features",
  },
];

const sections = [
  { icon: Shield, label: "Features", path: "/features", desc: "Explore all platform capabilities" },
  { icon: IndianRupee, label: "Insurance Plans", path: "/plans", desc: "Route-based pricing tiers" },
  { icon: BarChart3, label: "Worker Dashboard", path: "/worker/dashboard", desc: "Worker operations panel" },
  { icon: Fingerprint, label: "Admin Dashboard", path: "/admin/dashboard", desc: "Insurer analytics panel" },
];

export default function HomePage() {
  const statsRef = useScrollAnimation();
  const workers = useCountUp(10, 1200, statsRef.isVisible);
  const payout = useCountUp(5, 1000, statsRef.isVisible);

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 to-rose-950 opacity-90" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-6xl mx-auto grid gap-8 md:grid-cols-2 items-center">
            <div className="text-center md:text-left">
              <AnimatedSection>
                <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                  <Shield className="h-4 w-4" />
                  Parametric Micro-Insurance
                </div>
              </AnimatedSection>

              <AnimatedSection delay={100}>
                <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-6 text-foreground">
                  Predict. Protect. <span className="text-primary">Pay.</span>
                </h1>
              </AnimatedSection>

              <AnimatedSection delay={200}>
                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl">
                  Desver protects gig delivery workers from income loss caused by weather disruptions,
                  pollution spikes, and traffic blockages — automatically.
                </p>
              </AnimatedSection>

              <AnimatedSection delay={300}>
                <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                  <Link to="/worker/dashboard">
                    <Button size="lg" className="gap-2 w-full sm:w-auto">
                      Open Dashboard <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/features">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                      Explore Features
                    </Button>
                  </Link>
                </div>
              </AnimatedSection>
            </div>

            {/* Illustration (right column on md+) */}
            <div className="hidden md:flex items-center justify-center">
              <HeroIllustration className="w-full max-w-[520px] h-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card">
        <div className="container mx-auto px-4 py-12" ref={statsRef.ref}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatItem icon={Users} value={`${workers}M+`} label="Gig Workers in India" />
            <StatItem icon={IndianRupee} value="₹80/wk" label="Starting Premium" />
            <StatItem icon={Zap} value={`<${payout} min`} label="Payout Speed" />
            <StatItem icon={TrendingUp} value="₹2,660" label="Yearly Profit / Worker" />
          </div>
        </div>
      </section>

      {/* Quick Navigation Hub */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-foreground">Explore Desver</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Navigate to any section of the platform — every feature is clearly organized.</p>
            </div>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {sections.map((section, i) => (
              <AnimatedSection key={section.path} delay={i * 60}>
                <Link
                  to={section.path}
                  className="rounded-xl p-5 hover:shadow-lg transition-all hover:-translate-y-1 group block h-full bg-card border border-border"
                >
                  <section.icon className="h-8 w-8 text-indigo-600 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-display font-semibold text-sm mb-1">{section.label}</h3>
                  <p className="text-xs text-muted-foreground">{section.desc}</p>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-background border-t border-border">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <div className="text-center mb-8">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-foreground">Comprehensive Protection</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Desver monitors delivery events in real time and automatically compensates workers when disruptions cause income loss.
              </p>
            </div>
          </AnimatedSection>

          {/* small decorative banner */}
          <div className="mx-auto mb-8 max-w-3xl">
            <MapWalletIllustration className="w-full h-auto" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {features.map((feature, i) => (
              <AnimatedSection key={feature.title} delay={i * 80}>
                <Link
                  to={feature.link}
                  className="rounded-lg p-6 hover:shadow-lg transition-all hover:-translate-y-1 group block h-full bg-card border border-border"
                >
                  <feature.icon className="h-10 w-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="font-display text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                  <div className="mt-3 text-xs text-indigo-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Learn more <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* How it works summary */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">How Desver Works</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                From disruption detection to automatic payout in under 5 minutes.
              </p>
            </div>
          </AnimatedSection>
          <div className="grid md:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {[
              { step: "1", title: "Disruption Detected", desc: "Weather API detects extreme conditions" },
              { step: "2", title: "Event Processing", desc: "Kafka streams the event for analysis" },
              { step: "3", title: "AI Risk Analysis", desc: "ML model evaluates severity & impact" },
              { step: "4", title: "Trigger Check", desc: "Parametric engine validates thresholds" },
              { step: "5", title: "Auto Payout", desc: "Compensation credited to worker wallet" },
            ].map((item, i) => (
              <AnimatedSection key={item.step} delay={i * 120}>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-lg mx-auto mb-3">
                    {item.step}
                  </div>
                  <h4 className="font-display font-semibold text-sm mb-1">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/features">
              <Button className="gap-2">
                Explore Full Features <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <div className="max-w-2xl mx-auto text-center bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-10 border border-primary/20">
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
                Ready to protect your income?
              </h2>
              <p className="text-muted-foreground mb-6">
                Join thousands of gig workers who trust Desver for daily income protection.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Link to="/plans">
                  <Button size="lg">View Plans</Button>
                </Link>
                <Link to="/register">
                  <Button variant="outline" size="lg">Register Now</Button>
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}

function StatItem({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div className="text-center">
      <Icon className="h-6 w-6 text-primary mx-auto mb-2" />
      <div className="font-display text-2xl md:text-3xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

