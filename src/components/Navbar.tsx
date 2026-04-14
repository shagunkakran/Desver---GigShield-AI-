import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Shield, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorker } from "@/contexts/WorkerContext";

const publicNav = [
  { label: "Home", path: "/" },
  { label: "Features", path: "/features" },
  { label: "Plans", path: "/plans" },
];

const workerNav = [
  { label: "Dashboard", path: "/worker/dashboard" },
  { label: "Policy", path: "/worker/policy" },
  { label: "Premium", path: "/worker/premium" },
  { label: "Claims", path: "/worker/claims" },
];

const adminNav = [{ label: "Dashboard", path: "/admin/dashboard" }];

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, reset } = useWorker();
  const registered = Boolean(profile?.registered);
  const isAdmin = profile?.role === "admin";
  const signedInNav = isAdmin ? adminNav : workerNav;
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 glass-card border-b">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl flex-shrink-0">
          <Shield className="h-7 w-7 text-primary" />
          <span className="text-gradient">Desver</span>
        </Link>

        <div className="hidden xl:flex items-center gap-0.5">
          {(registered ? signedInNav : publicNav).map((item) => (
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

        <div className="hidden xl:flex items-center gap-2">
          {profile?.registered ? (
            <>
              <Link to={profile.role === "admin" ? "/admin/dashboard" : "/worker/dashboard"}>
                <Button size="sm" className="gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  {profile.name.split(" ")[0]}
                </Button>
              </Link>
              <Button size="sm" variant="outline" onClick={reset}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button size="sm" variant="outline">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>

        <button className="xl:hidden p-2 rounded-md hover:bg-muted" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="xl:hidden border-t bg-card px-4 pb-4 max-h-[80vh] overflow-y-auto">
          {(registered ? signedInNav : publicNav).map((item) => (
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
              <>
                <Link to={profile.role === "admin" ? "/admin/dashboard" : "/worker/dashboard"} onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full mb-2">
                    Dashboard - {profile.name.split(" ")[0]}
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    reset();
                    setMobileOpen(false);
                  }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full mb-2" variant="outline">
                    Login
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
