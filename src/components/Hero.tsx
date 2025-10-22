import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Star } from "lucide-react";
import heroImage from "@/assets/hero-professional.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="OOH advertising displays in modern cityscape" 
          className="w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/30" />
      </div>
      
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-primary rounded-full opacity-10 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-accent/20 to-primary/20 rounded-full opacity-15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 container mx-auto px-6 text-center">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <Badge variant="secondary" className="px-4 py-2 text-sm font-medium bg-gradient-subtle border-0 shadow-card">
            <Star className="w-4 h-4 mr-2 text-accent" />
            Complete OOH Management Platform
          </Badge>
        </div>

        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent leading-tight">
          Transform Your<br />
          <span className="text-foreground">Outdoor Advertising</span>
        </h1>

        {/* Subheading */}
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
          Go-Ads 360° streamlines your entire OOH workflow from media planning to campaign execution with 
          <span className="font-semibold text-accent"> automated processes</span>, 
          <span className="font-semibold text-accent"> real-time tracking</span>, and 
          <span className="font-semibold text-accent"> comprehensive reporting</span>.
        </p>

        {/* Key features list */}
        <div className="flex flex-wrap justify-center gap-4 mb-12 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full" />
            Firebase-Powered Scalability
          </span>
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full" />
            Multi-Role Access Control
          </span>
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full" />
            Automated Quotations & Invoices
          </span>
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full" />
            Real-time Proof Management
          </span>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button variant="hero" size="lg" className="group">
            Get Started Today
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button variant="outline" size="lg" className="group">
            <Play className="w-5 h-5 mr-2" />
            Watch Demo
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-8 border-t border-border">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">360°</div>
            <div className="text-sm text-muted-foreground mt-1">Complete Coverage</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">99.9%</div>
            <div className="text-sm text-muted-foreground mt-1">Uptime SLA</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">5min</div>
            <div className="text-sm text-muted-foreground mt-1">Setup Time</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">24/7</div>
            <div className="text-sm text-muted-foreground mt-1">Support</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;