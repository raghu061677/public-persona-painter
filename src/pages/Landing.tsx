import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  BarChart3, 
  MapPin, 
  FileText, 
  TrendingUp, 
  Users, 
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Menu
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-professional.jpg";
import iconMedia from "@/assets/icon-media.jpg";
import iconCampaigns from "@/assets/icon-campaigns.jpg";
import iconAutomation from "@/assets/icon-automation.jpg";

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: MapPin,
      title: "Media Asset Management",
      description: "Manage your entire OOH inventory with GPS tracking, real-time availability, and detailed asset profiles.",
      image: iconMedia
    },
    {
      icon: FileText,
      title: "Smart Campaign Planning",
      description: "Create data-driven media plans with AI-powered rate suggestions and instant quotations.",
      image: iconCampaigns
    },
    {
      icon: Zap,
      title: "Automated Operations",
      description: "Streamline mounting, proof uploads, and client approvals with mobile-first workflows.",
      image: iconAutomation
    }
  ];

  const benefits = [
    { icon: BarChart3, text: "Real-time analytics and reporting" },
    { icon: Shield, text: "Enterprise-grade security" },
    { icon: Users, text: "Multi-tenant architecture" },
    { icon: TrendingUp, text: "Revenue optimization tools" },
    { icon: CheckCircle, text: "99.9% uptime SLA" },
    { icon: Zap, text: "Lightning-fast performance" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img src="/favicon-192x192.png" alt="Go-Ads 360°" className="w-8 h-8" />
              <span className="text-xl font-bold text-foreground">Go-Ads 360°</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#benefits" className="text-muted-foreground hover:text-foreground transition-colors">Benefits</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <Button variant="ghost" onClick={() => navigate("/auth")}>Sign In</Button>
              <Button onClick={() => navigate("/auth")}>Get Started</Button>
            </div>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 z-0" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Zap className="w-4 h-4 mr-2" />
                The Future of OOH Advertising
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Complete OOH Media
                <span className="block text-primary">Management Platform</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Streamline your outdoor advertising operations from lead to campaign completion. Built for media owners and agencies.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" onClick={() => navigate("/auth")} className="text-lg">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/install")} className="text-lg">
                  Install App
                </Button>
              </div>
              <div className="flex items-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span>14-day free trial</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-2xl blur-3xl" />
              <img 
                src={heroImage} 
                alt="Go-Ads 360° Dashboard" 
                className="relative rounded-2xl shadow-2xl border border-border w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Manage OOH Media
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From asset tracking to campaign execution, all in one powerful platform
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
                <CardContent className="p-6 space-y-4">
                  <div className="w-full h-48 rounded-lg overflow-hidden bg-muted">
                    <img src={feature.image} alt={feature.title} className="w-full h-full object-cover" />
                  </div>
                  <feature.icon className="w-12 h-12 text-primary" />
                  <h3 className="text-xl font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose Go-Ads 360°
            </h2>
            <p className="text-xl text-muted-foreground">
              Built for performance, security, and scale
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-4 p-6 rounded-lg bg-card border border-border hover:border-primary/50 transition-all">
                <benefit.icon className="w-8 h-8 text-primary flex-shrink-0" />
                <span className="text-foreground font-medium">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Transform Your OOH Business?
          </h2>
          <p className="text-xl opacity-90">
            Join leading media owners and agencies already using Go-Ads 360°
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" onClick={() => navigate("/auth")} className="text-lg">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/install")} className="text-lg bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
              Install Mobile App
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <img src="/favicon-192x192.png" alt="Go-Ads 360°" className="w-8 h-8" />
                <span className="text-lg font-bold">Go-Ads 360°</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Complete OOH media management for the modern era
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="/install" className="hover:text-foreground transition-colors">Mobile App</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Go-Ads 360°. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
