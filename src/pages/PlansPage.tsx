import { useState } from "react";
import { Check, Shield, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import AnimatedSection from "@/components/AnimatedSection";

const plans = [
  {
    name: "Low Risk Route",
    price: "₹50",
    period: "/week",
    risk: "Low",
    color: "text-success",
    bgColor: "bg-success/10",
    maxComp: "₹200",
    features: [
      "Weather disruption coverage",
      "Basic pollution alerts",
      "Standard payout speed",
      "Up to ₹200 compensation/event",
      "Email notifications",
    ],
  },
  {
    name: "Medium Risk Route",
    price: "₹60",
    period: "/week",
    risk: "Medium",
    color: "text-accent",
    bgColor: "bg-accent/10",
    popular: true,
    maxComp: "₹400",
    features: [
      "All Low Risk features",
      "Traffic disruption coverage",
      "Pollution risk coverage",
      "Up to ₹400 compensation/event",
      "Push + SMS notifications",
      "AI route suggestions",
    ],
  },
  {
    name: "High Risk Route",
    price: "₹80",
    period: "/week",
    risk: "High",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    maxComp: "₹600",
    features: [
      "All Medium Risk features",
      "Priority payout processing",
      "Full disruption coverage",
      "Up to ₹600 compensation/event",
      "Priority support",
      "Advanced AI risk alerts",
      "Route optimization",
    ],
  },
];

export default function PlansPage() {
  const [selected, setSelected] = useState(1);
  const [weeks, setWeeks] = useState(52);

  const selectedPlan = plans[selected];
  const weeklyPremium = parseInt(selectedPlan.price.replace("₹", ""));
  const annualRevenue = weeklyPremium * weeks;
  const estPayout = Math.round(annualRevenue * 0.29);
  const platformCost = Math.round(annualRevenue * 0.07);
  const profit = annualRevenue - estPayout - platformCost;

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-16">
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">Insurance Plans</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              AI-driven pricing based on your delivery route risk. Higher risk zones get higher coverage.
            </p>
          </div>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <AnimatedSection key={plan.name} delay={i * 100}>
              <div
                className={`glass-card rounded-xl p-6 relative transition-all hover:shadow-xl cursor-pointer h-full ${
                  i === selected ? "ring-2 ring-primary scale-105" : ""
                }`}
                onClick={() => setSelected(i)}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <div className={`inline-flex items-center gap-1.5 ${plan.bgColor} ${plan.color} rounded-full px-3 py-1 text-xs font-medium mb-4`}>
                  <Shield className="h-3 w-3" />
                  {plan.risk} Risk
                </div>
                <h3 className="font-display text-xl font-bold mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="font-display text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/dashboard">
                  <Button className="w-full" variant={i === selected ? "default" : "outline"}>
                    Select Plan
                  </Button>
                </Link>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* Interactive Unit Economics Calculator */}
        <AnimatedSection>
          <div className="max-w-2xl mx-auto mt-20">
            <h2 className="font-display text-2xl font-bold text-center mb-2 flex items-center justify-center gap-2">
              <Calculator className="h-6 w-6 text-primary" />
              Unit Economics Calculator
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Adjust the duration to see projected economics for the <strong>{selectedPlan.name}</strong> plan.
            </p>
            <div className="glass-card rounded-xl p-6">
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">Duration: {weeks} weeks</label>
                <input
                  type="range"
                  min={4}
                  max={104}
                  value={weeks}
                  onChange={(e) => setWeeks(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1 month</span>
                  <span>1 year</span>
                  <span>2 years</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="font-display text-xl font-bold">₹{weeklyPremium}/week</div>
                  <div className="text-xs text-muted-foreground mt-1">Premium per worker</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="font-display text-xl font-bold">₹{annualRevenue.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total revenue ({weeks}wk)</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="font-display text-xl font-bold">₹{estPayout.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">Est. payouts</div>
                </div>
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <div className="font-display text-xl font-bold text-primary">₹{profit.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">Est. profit/worker</div>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
