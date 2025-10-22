import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Globe } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-subtle border-t border-border">
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg" />
              <span className="text-xl font-bold">Go-Ads 360°</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Complete OOH media management platform transforming outdoor advertising operations with automated workflows and real-time tracking.
            </p>
            <Button variant="gradient" size="sm">
              Get Started Today
            </Button>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-smooth">Features</a></li>
              <li><a href="#technology" className="hover:text-foreground transition-smooth">Technology</a></li>
              <li><a href="#integrations" className="hover:text-foreground transition-smooth">Integrations</a></li>
              <li><a href="#security" className="hover:text-foreground transition-smooth">Security</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#documentation" className="hover:text-foreground transition-smooth">Documentation</a></li>
              <li><a href="#api" className="hover:text-foreground transition-smooth">API Reference</a></li>
              <li><a href="#help" className="hover:text-foreground transition-smooth">Help Center</a></li>
              <li><a href="#status" className="hover:text-foreground transition-smooth">System Status</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <div className="space-y-3 text-muted-foreground">
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-accent" />
                <span className="text-sm">contact@go-ads360.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-accent" />
                <span className="text-sm">+91 (000) 000-0000</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-accent" />
                <span className="text-sm">Hyderabad, India</span>
              </div>
              <div className="flex items-center space-x-3">
                <Globe className="w-4 h-4 text-accent" />
                <span className="text-sm">24/7 Support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-muted-foreground">
            © {currentYear} Go-Ads. All rights reserved.
          </div>
          <div className="flex space-x-6 text-sm text-muted-foreground">
            <a href="#privacy" className="hover:text-foreground transition-smooth">Privacy Policy</a>
            <a href="#terms" className="hover:text-foreground transition-smooth">Terms of Service</a>
            <a href="#cookies" className="hover:text-foreground transition-smooth">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;