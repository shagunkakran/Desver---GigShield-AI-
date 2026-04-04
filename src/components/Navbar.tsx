import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Shield, Menu, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorker } from "@/contexts/WorkerContext";

// ── Nav items grouped by section ─────────────────────────────────────────────

const primaryNav = [
  { label: "Home",        path: "/" },
  { label: "Features",    path: "/features" },
  { label: "How It Works", path: "/how-it-works" },
  { label: "Plans",       path: "/plans" },
  { label: "Dashboard",   path: "/dashboard" },
];

const phase2Nav = [
  { label: "Register",  path: "/register" },
  { label: "Policy",    path: "/policy" },
  { label: "Premium",   path: "/premium" },
  { label: "Claims",    path: "/claims-management" },
];

const moreNav = [
  { label: "Anti-Spoofing", path: "/anti-spoofing" },
  { label: "Architecture",  path: "/architecture" },
  { label: "Roadmap",       path: "/roadmap" },
  { label: "Team",          path: "/team" },
];

const allNavItems = [...primaryNav, ...phase2Nav, ...moreNav];

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile } = useWorker();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 glass-card border-b">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl flex-shrink-0">
          <Shield className="h-7 w-7 text-primary" />
          <span className="text-gradient">GigShield</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden xl:flex items-center gap-0.5">
          {primaryNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Phase 2 divider */}
          <div className="w-px h-5 bg-border mx-1" />
          <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1">
            <Zap className="h-3 w-3 text-primary" /> Phase 2
          </span>

          {phase2Nav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}

          <div className="w-px h-5 bg-border mx-1" />

          {moreNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden xl:flex items-center gap-2">
          {profile?.registered ? (
            <Link to="/dashboard">
              <Button size="sm" className="gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                {profile.name.split(" ")[0]}
              </Button>
            </Link>
          ) : (
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="xl:hidden p-2 rounded-md hover:bg-muted"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="xl:hidden border-t bg-card px-4 pb-4 max-h-[80vh] overflow-y-auto">
          <div className="py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Main
          </div>
          {primaryNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}

          <div className="py-2 mt-2 text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1">
            <Zap className="h-3 w-3" /> Phase 2
          </div>
          {phase2Nav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}

          <div className="py-2 mt-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            More
          </div>
          {moreNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}

          <div className="mt-3">
            {profile?.registered ? (
              <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full">Dashboard — {profile.name.split(" ")[0]}</Button>
              </Link>
            ) : (
              <Link to="/register" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full">Get Started</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
