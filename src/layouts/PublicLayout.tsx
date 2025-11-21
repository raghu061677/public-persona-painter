import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Building2, Mail, Phone, MapPin } from "lucide-react";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Go-Ads 360°</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium transition-colors hover:text-primary">
              Home
            </Link>
            <Link to="/marketplace" className="text-sm font-medium transition-colors hover:text-primary">
              Marketplace
            </Link>
            <Link to="/auth" className="text-sm font-medium transition-colors hover:text-primary">
              Login
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Button asChild variant="default" size="sm" className="hidden md:inline-flex">
              <Link to="/register-company">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/auth">Login</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container py-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="font-bold">Go-Ads 360°</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Complete OOH media management platform for media owners and advertising agencies.
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="font-semibold">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/marketplace" className="text-muted-foreground hover:text-primary transition-colors">
                    Marketplace
                  </Link>
                </li>
                <li>
                  <Link to="/auth" className="text-muted-foreground hover:text-primary transition-colors">
                    Login
                  </Link>
                </li>
                <li>
                  <Link to="/register-company" className="text-muted-foreground hover:text-primary transition-colors">
                    Register
                  </Link>
                </li>
              </ul>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <h3 className="font-semibold">Features</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Media Asset Management</li>
                <li>Campaign Planning</li>
                <li>Operations Tracking</li>
                <li>Financial Management</li>
                <li>Analytics & Reports</li>
              </ul>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="font-semibold">Contact Us</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <a href="mailto:info@goads360.com" className="hover:text-primary transition-colors">
                    info@goads360.com
                  </a>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <a href="tel:+911234567890" className="hover:text-primary transition-colors">
                    +91 123 456 7890
                  </a>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <span>Hyderabad, India</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Go-Ads 360°. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
