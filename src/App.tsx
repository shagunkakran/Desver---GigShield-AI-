import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkerProvider } from "@/contexts/WorkerContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Existing pages
import HomePage from "@/pages/HomePage";
import FeaturesPage from "@/pages/FeaturesPage";
import HowItWorksPage from "@/pages/HowItWorksPage";
import PlansPage from "@/pages/PlansPage";
import DashboardPage from "@/pages/DashboardPage";
import ArchitecturePage from "@/pages/ArchitecturePage";
import RoadmapPage from "@/pages/RoadmapPage";
import TeamPage from "@/pages/TeamPage";
import AntiSpoofingPage from "@/pages/AntiSpoofingPage";
import NotFound from "@/pages/NotFound";

// Phase 2 — new pages
import RegistrationPage from "@/pages/RegistrationPage";
import PolicyPage from "@/pages/PolicyPage";
import PremiumPage from "@/pages/PremiumPage";
import ClaimsPage from "@/pages/ClaimsPage";

const queryClient = new QueryClient();

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
              <Routes>
                {/* ── Existing routes ── */}
                <Route path="/"             element={<HomePage />} />
                <Route path="/features"     element={<FeaturesPage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/plans"        element={<PlansPage />} />
                <Route path="/dashboard"    element={<DashboardPage />} />
                <Route path="/architecture" element={<ArchitecturePage />} />
                <Route path="/roadmap"      element={<RoadmapPage />} />
                <Route path="/team"         element={<TeamPage />} />
                <Route path="/anti-spoofing" element={<AntiSpoofingPage />} />

                {/* ── Phase 2 routes ── */}
                <Route path="/register"          element={<RegistrationPage />} />
                <Route path="/policy"            element={<PolicyPage />} />
                <Route path="/premium"           element={<PremiumPage />} />
                <Route path="/claims-management" element={<ClaimsPage />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </WorkerProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;