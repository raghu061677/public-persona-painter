import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { AnnouncementBanner } from "@/components/landing/AnnouncementBanner";
import { HeroCosmicMode } from "@/components/landing/cosmic/HeroCosmicMode";
import { ScenesCarousel } from "@/components/landing/cosmic/ScenesCarousel";
import { WhoItsFor } from "@/components/landing/cosmic/WhoItsFor";
import { AIFeatureStrip } from "@/components/landing/cosmic/AIFeatureStrip";
import { MarketplacePreview } from "@/components/landing/god-mode/MarketplacePreview";
import { EnhancedValueProposition } from "@/components/landing/god-mode/EnhancedValueProposition";
import { SocialProofSection } from "@/components/landing/god-mode/SocialProofSection";
import { CaseStudySection } from "@/components/landing/god-mode/CaseStudySection";
import { CompactSteps } from "@/components/landing/cosmic/CompactSteps";
import { ConversionBanner } from "@/components/landing/ConversionBanner";
import { EnhancedSecurity } from "@/components/landing/god-mode/EnhancedSecurity";
import { EnhancedFAQ } from "@/components/landing/god-mode/EnhancedFAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { PremiumFooter } from "@/components/landing/god-mode/PremiumFooter";
import { DarkModeToggle } from "@/components/landing/god-mode/DarkModeToggle";
import { MobileStickyCTA } from "@/components/landing/cosmic/MobileStickyCTA";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Announcement Banner */}
      <AnnouncementBanner />

      {/* Navbar - Compact & Premium */}
      <nav className="border-b border-border/50 bg-background/98 backdrop-blur-md supports-[backdrop-filter]:bg-background/95 sticky top-0 z-50 shadow-navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center">
              <img 
                src="/logo.png" 
                alt="Go-Ads 360° Logo" 
                className="h-12 w-auto object-contain sm:h-14 md:h-16 drop-shadow-sm"
                style={{ padding: '6px 0' }}
              />
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => navigate("/")} 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Home
              </button>
              <button 
                onClick={() => navigate("/marketplace")} 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Marketplace
              </button>
              <button 
                onClick={() => navigate("/marketplace")} 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Explore Media
              </button>
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <DarkModeToggle />
              <Button variant="ghost" onClick={() => navigate("/auth")} className="font-medium">Sign In</Button>
              <Button variant="gradient" onClick={() => navigate("/auth")} className="rounded-xl font-semibold">Get Started</Button>
            </div>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Cosmic Mode */}
        <HeroCosmicMode />

        {/* Scenes Carousel */}
        <ScenesCarousel />

        {/* Who It's For */}
        <WhoItsFor />

        {/* AI Feature Strip */}
        <AIFeatureStrip />

        {/* Marketplace Preview */}
        <MarketplacePreview />

        {/* Enhanced Value Proposition */}
        <EnhancedValueProposition />

        {/* Compact Steps */}
        <CompactSteps />

        {/* Social Proof */}
        <SocialProofSection />

        {/* Case Study */}
        <CaseStudySection />

        {/* Mid-Page Conversion Banner */}
        <ConversionBanner />

        {/* Enhanced Security */}
        <EnhancedSecurity />

        {/* Enhanced FAQ */}
        <EnhancedFAQ />

        {/* Final CTA */}
        <FinalCTA />
      </main>

      {/* Premium Footer */}
      <PremiumFooter />

      {/* Mobile Sticky CTA */}
      <MobileStickyCTA />
    </div>
  );
};

export default Landing;
