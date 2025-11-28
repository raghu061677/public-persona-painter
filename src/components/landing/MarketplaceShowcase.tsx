import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Shield, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: CheckCircle,
    title: "Verified Listings",
    description: "Every asset includes GPS coordinates, photos, dimensions, and real-time availability. No surprises."
  },
  {
    icon: TrendingUp,
    title: "Transparent Pricing",
    description: "See card rates, negotiate directly, or use AI rate suggestions based on 100,000+ historical bookings."
  },
  {
    icon: Shield,
    title: "Secure Transactions",
    description: "2% platform fee covers escrow, dispute resolution, and guaranteed proof delivery within 48 hours."
  }
];

export const MarketplaceShowcase = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* Apple-Style Premium Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(var(--primary)/0.15),transparent_70%)] animate-[pulse_8s_ease-in-out_infinite]" />
        
        {/* Floating Particles Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-[float_20s_ease-in-out_infinite]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-[float_25s_ease-in-out_infinite_reverse]" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Main Title with Fade-Up Animation */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6 animate-fade-up [animation-delay:100ms] opacity-0 [animation-fill-mode:forwards]">
            <span className="bg-gradient-to-br from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
              Explore Premium
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              Outdoor Media
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-xl md:text-2xl lg:text-3xl text-muted-foreground max-w-4xl mx-auto mb-12 animate-fade-up [animation-delay:300ms] opacity-0 [animation-fill-mode:forwards] font-light leading-relaxed">
            Book billboards in seconds, anywhere across India.
            <br className="hidden md:block" />
            50,000+ verified media assets in 200+ cities.
          </p>

          {/* Apple-Style Pill Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-up [animation-delay:500ms] opacity-0 [animation-fill-mode:forwards]">
            <Button
              size="lg"
              onClick={() => navigate("/marketplace")}
              className="group relative px-8 py-6 text-lg font-semibold rounded-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary hover:scale-105 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_40px_rgba(var(--primary)/0.4)] border-0"
            >
              <span className="relative z-10">Explore Media</span>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
              className="group relative px-8 py-6 text-lg font-semibold rounded-full border-2 hover:scale-105 transition-all duration-300 backdrop-blur-sm bg-background/50 hover:bg-background/80 shadow-lg"
            >
              <span className="relative z-10">Book Campaign</span>
            </Button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-foreground/20 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-foreground/40 rounded-full animate-[scroll_2s_ease-in-out_infinite]" />
          </div>
        </div>
      </section>

      {/* Floating Stats Cards */}
      <section className="relative -mt-20 z-20 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="group relative text-center bg-card/80 backdrop-blur-xl border-border/50 hover:border-primary/50 transition-all duration-500 hover:scale-105 hover:shadow-[0_20px_60px_rgba(0,0,0,0.15)] animate-fade-up overflow-hidden"
                style={{ animationDelay: `${(index + 1) * 150}ms`, opacity: 0, animationFillMode: 'forwards' }}
              >
                {/* Glossy Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <CardHeader className="relative">
                  <div className="mx-auto p-4 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 text-primary w-fit mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                    <feature.icon className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors duration-300">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>

                {/* Glow Effect on Hover */}
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-accent/20 blur-xl" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};
