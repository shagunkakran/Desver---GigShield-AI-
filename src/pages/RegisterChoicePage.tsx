import { Link } from "react-router-dom";
import { Shield, User, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedSection from "@/components/AnimatedSection";

export default function RegisterChoicePage() {
  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Shield className="h-4 w-4" />
              Registration Portal
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-3">Choose Registration Type</h1>
            <p className="text-muted-foreground">Worker and Admin onboarding are now separate.</p>
          </div>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <AnimatedSection>
            <div className="glass-card-premium rounded-2xl p-7 card-lift">
              <User className="h-8 w-8 text-primary mb-4" />
              <h2 className="font-display text-xl font-bold mb-2">Worker Registration</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Delivery/courier worker onboarding with risk scoring and policy flow.
              </p>
              <Link to="/register/worker">
                <Button className="w-full">Register as Worker</Button>
              </Link>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={100}>
            <div className="glass-card-premium rounded-2xl p-7 card-lift">
              <UserCog className="h-8 w-8 text-secondary mb-4" />
              <h2 className="font-display text-xl font-bold mb-2">Admin Registration</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Insurer/admin access for portfolio analytics and operations dashboard.
              </p>
              <Link to="/register/admin">
                <Button className="w-full" variant="secondary">Register as Admin</Button>
              </Link>
            </div>
          </AnimatedSection>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Already registered?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
