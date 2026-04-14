import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg mb-3">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-primary font-semibold">Desver</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Parametric micro-insurance protecting gig delivery workers from income loss.
            </p>
          </div>
          <div>
            <h4 className="font-display font-semibold mb-3 text-sm">Product</h4>
            <div className="flex flex-col gap-2">
              <Link to="/features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link>
              <Link to="/plans" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Insurance Plans</Link>
              <Link to="/worker/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Worker Dashboard</Link>
            </div>
          </div>
          <div>
            <h4 className="font-display font-semibold mb-3 text-sm">Access</h4>
            <div className="flex flex-col gap-2">
              <Link to="/login/worker" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Worker Login</Link>
              <Link to="/login/admin" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Admin Login</Link>
              <Link to="/register" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Create Account</Link>
            </div>
          </div>
          <div>
            <h4 className="font-display font-semibold mb-3 text-sm">Resources</h4>
            <div className="flex flex-col gap-2">
              <Link to="/worker/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
            </div>
          </div>
        </div>
        <div className="border-t border-border mt-8 pt-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Desver. Built for the gig economy.
        </div>
      </div>
    </footer>
  );
}
