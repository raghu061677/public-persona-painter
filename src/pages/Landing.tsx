import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { AnnouncementBanner } from "@/components/landing/AnnouncementBanner";
import { HeroCosmicMode } from "@/components/landing/cosmic/HeroCosmicMode";
import { CosmicMetrics } from "@/components/landing/cosmic/CosmicMetrics";
import { WhyGoAdsMatters } from "@/components/landing/cosmic/WhyGoAdsMatters";
import { ForAgenciesOwners } from "@/components/landing/cosmic/ForAgenciesOwners";
import { AIFeaturesGrid } from "@/components/landing/cosmic/AIFeaturesGrid";
import { CategoryBrowser } from "@/components/landing/cosmic/CategoryBrowser";
import { ThreeStepFlow } from "@/components/landing/cosmic/ThreeStepFlow";
import { CosmicProofGallery } from "@/components/landing/cosmic/CosmicProofGallery";
import { EnhancedSecurity } from "@/components/landing/god-mode/EnhancedSecurity";
import { SocialProofSection } from "@/components/landing/god-mode/SocialProofSection";
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
        {/* Hero Section */}
        <HeroCosmicMode />

        {/* How Go-Ads Changes Your Day */}
        <CosmicMetrics />

        {/* Why Go-Ads Matters Now */}
        <WhyGoAdsMatters />

        {/* Built for Agencies & Media Owners */}
        <ForAgenciesOwners />

        {/* Powered by AI at Every Step */}
        <AIFeaturesGrid />

        {/* Discover Media Across India */}
        <CategoryBrowser />

        {/* From Lead to Live Campaign */}
        <ThreeStepFlow />

        {/* Live Asset Portfolio */}
        <CosmicProofGallery />

        {/* Enhanced Security */}
        <EnhancedSecurity />

        {/* Social Proof */}
        <SocialProofSection />

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
