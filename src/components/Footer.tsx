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
              <span className="text-primary font-semibold">GigShield</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Parametric micro-insurance protecting gig delivery workers from income loss.
            </p>
          </div>
          <div>
            <h4 className="font-display font-semibold mb-3 text-sm">Product</h4>
            <div className="flex flex-col gap-2">
              <Link to="/features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link>
              <Link to="/how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
              <Link to="/plans" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Insurance Plans</Link>
              <Link to="/anti-spoofing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Anti-Spoofing</Link>
            </div>
          </div>
          <div>
            <h4 className="font-display font-semibold mb-3 text-sm">Company</h4>
            <div className="flex flex-col gap-2">
              <Link to="/team" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Team</Link>
              <Link to="/architecture" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Architecture</Link>
              <Link to="/roadmap" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Roadmap</Link>
            </div>
          </div>
          <div>
            <h4 className="font-display font-semibold mb-3 text-sm">Resources</h4>
            <div className="flex flex-col gap-2">
              <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
            </div>
          </div>
        </div>
        <div className="border-t border-border mt-8 pt-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} GigShield. Built for the gig economy.
        </div>
      </div>
    </footer>
  );
}
