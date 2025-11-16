import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { AnnouncementBanner } from "@/components/landing/AnnouncementBanner";
import { HeroCosmicMode } from "@/components/landing/cosmic/HeroCosmicMode";
import { WhyGoAdsExists } from "@/components/landing/cosmic/WhyGoAdsExists";
import { WhyGoAds360Matters } from "@/components/landing/cosmic/WhyGoAds360Matters";
import { ForAgenciesOwners } from "@/components/landing/cosmic/ForAgenciesOwners";
import { AIFeaturesGrid } from "@/components/landing/cosmic/AIFeaturesGrid";
import { CategoryBrowser } from "@/components/landing/cosmic/CategoryBrowser";
import { ThreeStepFlow } from "@/components/landing/cosmic/ThreeStepFlow";
import { CosmicProofGallery } from "@/components/landing/cosmic/CosmicProofGallery";
import { EnhancedSecurity } from "@/components/landing/god-mode/EnhancedSecurity";
import { SocialProofSection } from "@/components/landing/god-mode/SocialProofSection";
import { EnhancedFAQ } from "@/components/landing/god-mode/EnhancedFAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { PremiumFooter } from "@/components/landing/cosmic/PremiumFooter";
import { DarkModeToggle } from "@/components/landing/god-mode/DarkModeToggle";
import { MobileStickyCTA } from "@/components/landing/cosmic/MobileStickyCTA";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Announcement Banner */}
      <AnnouncementBanner />

      {/* Navbar - Sticky with Blur */}
      <nav 
        className="sticky top-0 z-50 transition-all duration-350"
        style={{
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src="/logo.png" 
                alt="Go-Ads 360° Logo" 
                className="h-10 w-auto object-contain md:h-12"
                style={{ filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))" }}
              />
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => navigate("/")} 
                className="text-foreground/70 hover:text-foreground font-medium transition-all duration-300 relative group"
              >
                Home
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#F4C542] group-hover:w-full transition-all duration-300" />
              </button>
              <button 
                onClick={() => navigate("/marketplace")} 
                className="text-foreground/70 hover:text-foreground font-medium transition-all duration-300 relative group"
              >
                Marketplace
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#F4C542] group-hover:w-full transition-all duration-300" />
              </button>
              <DarkModeToggle />
              <Button
                onClick={() => navigate("/auth")}
                size="sm"
                className="font-bold rounded-xl px-6"
                style={{
                  background: "linear-gradient(135deg, #0061FF, #00A3FF)",
                  boxShadow: "0 4px 12px rgba(0, 97, 255, 0.25)",
                }}
              >
                Get Started
              </Button>
            </div>

            <div className="md:hidden flex items-center gap-2">
              <DarkModeToggle />
              <button className="p-2">
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <HeroCosmicMode />

        {/* Why Go-Ads Exists - The Problem We Solve */}
        <WhyGoAdsExists />

        {/* Why Go-Ads 360° Matters */}
        <WhyGoAds360Matters />

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
