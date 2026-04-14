import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, UserCog, MapPin, ChevronRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedSection from "@/components/AnimatedSection";
import { toast } from "sonner";
import { useWorker } from "@/contexts/WorkerContext";
import { registerAdminApi } from "@/lib/api";
import { getLocations } from "@/utils/riskEngine";

export default function AdminRegistrationPage() {
  const navigate = useNavigate();
  const { register } = useWorker();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", location: "Delhi" });
  const locations = getLocations();

  async function handleSubmit() {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) return;
    try {
      const res = await registerAdminApi({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        location: form.location,
      });
      register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        workerType: "freelance",
        location: form.location,
        serverId: res.id,
        role: "admin",
        authToken: res.token,
      });
      setSubmitted(true);
      setTimeout(() => navigate("/admin/dashboard"), 900);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Admin registration failed.";
      if (/email already registered/i.test(message)) {
        toast.error("This admin email is already registered. Please login instead.");
      } else {
        toast.error(message);
      }
    }
  }

  return (
    <div className="py-16">
      <div className="container mx-auto px-4 max-w-2xl">
        <AnimatedSection>
          <div className="glass-card-premium rounded-2xl p-8 card-lift">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Shield className="h-4 w-4" />
              Admin Onboarding
            </div>
            <h1 className="font-display text-3xl font-bold mb-2">Admin Registration</h1>
            <p className="text-muted-foreground mb-6">Create admin profile to access insurer dashboard.</p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                  <UserCog className="h-4 w-4 text-primary" /> Full Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="e.g. Operations Admin"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="e.g. admin@desver.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="At least 6 characters"
                />
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                  <MapPin className="h-4 w-4 text-primary" /> Location
                </label>
                <select
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              {submitted ? (
                <div className="flex items-center gap-3 text-success bg-success/10 rounded-lg p-4 animate-fade-in">
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  <div className="text-sm">Admin registered. Redirecting to dashboard...</div>
                </div>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="w-full gap-2"
                  disabled={!form.name.trim() || !form.email.trim() || form.password.length < 6}
                >
                  Create Admin Access
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
