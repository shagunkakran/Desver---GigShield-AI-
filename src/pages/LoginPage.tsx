import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle, ChevronRight, LogIn, Shield, User, UserCog } from "lucide-react";
import { toast } from "sonner";
import AnimatedSection from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { consumeSessionExpiredToastFlag, loginApi } from "@/lib/api";
import { type RiskLevel, type WorkerType, useWorker } from "@/contexts/WorkerContext";

type RoleOption = "worker" | "admin";
const WORKER_TYPES: WorkerType[] = ["delivery", "driver", "courier", "freelance"];
const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high"];

export default function LoginPage() {
  const navigate = useNavigate();
  const { role: roleParam } = useParams();
  const { login } = useWorker();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: roleParam === "admin" ? "admin" : ("worker" as RoleOption),
  });

  const redirectPath = useMemo(
    () => (form.role === "admin" ? "/admin/dashboard" : "/worker/dashboard"),
    [form.role]
  );

  useEffect(() => {
    if (consumeSessionExpiredToastFlag()) {
      toast.error("Session expired. Please login again.");
    }
  }, []);

  async function handleSubmit() {
    if (!form.email.trim() || !form.password || loading) return;
    setLoading(true);
    try {
      const res = await loginApi({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      });
      const workerType = WORKER_TYPES.includes(res.workerType as WorkerType)
        ? (res.workerType as WorkerType)
        : "freelance";
      const riskLevel = RISK_LEVELS.includes(res.riskLevel as RiskLevel)
        ? (res.riskLevel as RiskLevel)
        : "medium";
      login({
        name: res.name,
        email: res.email,
        workerType,
        location: res.location,
        riskLevel,
        riskScore: Number(res.riskScore ?? 50),
        serverId: res.id,
        role: res.role,
        authToken: res.token,
      });
      setSubmitted(true);
      setTimeout(() => navigate(redirectPath), 700);
    } catch {
      toast.error("Login failed. Account not found for selected role. Please register first.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="py-16">
      <div className="container mx-auto px-4 max-w-2xl">
        <AnimatedSection>
          <div className="glass-card-premium rounded-2xl p-8 card-lift">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Shield className="h-4 w-4" />
              Secure Sign In
            </div>
            <h1 className="font-display text-3xl font-bold mb-2">Login to Desver</h1>
            <p className="text-muted-foreground mb-6">
              Access your Worker or Admin dashboard with your registered profile name.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, role: "worker" }))}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-2 ${
                      form.role === "worker"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <User className="h-4 w-4" /> Worker
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, role: "admin" }))}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-2 ${
                      form.role === "admin"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <UserCog className="h-4 w-4" /> Admin
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder={form.role === "admin" ? "e.g. admin@desver.com" : "e.g. worker@desver.com"}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div className="mt-6">
              {submitted ? (
                <div className="flex items-center gap-3 text-success bg-success/10 rounded-lg p-4 animate-fade-in">
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  <div className="text-sm">Login successful. Redirecting...</div>
                </div>
              ) : (
                <Button onClick={handleSubmit} className="w-full gap-2" disabled={!form.email.trim() || !form.password || loading}>
                  <LogIn className="h-4 w-4" />
                  {loading ? "Signing in..." : "Sign In"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            <p className="mt-4 text-sm text-muted-foreground text-center">
              New user?{" "}
              <Link to={form.role === "admin" ? "/register/admin" : "/register/worker"} className="text-primary hover:underline">
                Create {form.role === "admin" ? "Admin" : "Worker"} account
              </Link>
            </p>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
