import { lazy, Suspense, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkerProvider } from "@/contexts/WorkerContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useWorker } from "@/contexts/WorkerContext";

// Existing pages
const HomePage = lazy(() => import("@/pages/HomePage"));
const FeaturesPage = lazy(() => import("@/pages/FeaturesPage"));
const PlansPage = lazy(() => import("@/pages/PlansPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const RegistrationPage = lazy(() => import("@/pages/RegistrationPage"));
const RegisterChoicePage = lazy(() => import("@/pages/RegisterChoicePage"));
const AdminRegistrationPage = lazy(() => import("@/pages/AdminRegistrationPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const PolicyPage = lazy(() => import("@/pages/PolicyPage"));
const PremiumPage = lazy(() => import("@/pages/PremiumPage"));
const ClaimsPage = lazy(() => import("@/pages/ClaimsPage"));
const AdminDashboardPage = lazy(() => import("@/pages/AdminDashboardPage"));

const queryClient = new QueryClient();

function AdminOnly({ children }: { children: ReactNode }) {
  const { profile } = useWorker();
  if (profile?.registered && profile.role === "admin") return <>{children}</>;
  return <Navigate to="/login/admin" replace />;
}

function WorkerOnly({ children }: { children: ReactNode }) {
  const { profile } = useWorker();
  if (profile?.registered && profile.role === "worker") return <>{children}</>;
  return <Navigate to="/login/worker" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* WorkerProvider wraps everything so any page can access worker state */}
      <WorkerProvider>
        <BrowserRouter>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">
              <AnimatedRoutes />
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </WorkerProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <div key={location.pathname} className="animate-fade-in">
      <Suspense fallback={<div className="py-10 text-center text-muted-foreground">Loading page...</div>}>
        <Routes>
          {/* Public routes */}
          <Route path="/"             element={<HomePage />} />
          <Route path="/features"     element={<FeaturesPage />} />
          <Route path="/plans"        element={<PlansPage />} />
          <Route path="/login"             element={<LoginPage />} />
          <Route path="/login/:role"       element={<LoginPage />} />
          <Route path="/register"          element={<RegisterChoicePage />} />
          <Route path="/register/worker"   element={<RegistrationPage />} />
          <Route path="/register/admin"    element={<AdminRegistrationPage />} />

          {/* Worker app */}
          <Route path="/worker/dashboard"  element={<WorkerOnly><DashboardPage /></WorkerOnly>} />
          <Route path="/worker/policy"     element={<WorkerOnly><PolicyPage /></WorkerOnly>} />
          <Route path="/worker/premium"    element={<WorkerOnly><PremiumPage /></WorkerOnly>} />
          <Route path="/worker/claims"     element={<WorkerOnly><ClaimsPage /></WorkerOnly>} />

          {/* Admin app */}
          <Route path="/admin/dashboard"   element={<AdminOnly><AdminDashboardPage /></AdminOnly>} />

          {/* Backward compatibility redirects */}
          <Route path="/dashboard" element={<Navigate to="/worker/dashboard" replace />} />
          <Route path="/policy" element={<Navigate to="/worker/policy" replace />} />
          <Route path="/premium" element={<Navigate to="/worker/premium" replace />} />
          <Route path="/claims-management" element={<Navigate to="/worker/claims" replace />} />
          <Route path="/admin-dashboard" element={<Navigate to="/admin/dashboard" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
}