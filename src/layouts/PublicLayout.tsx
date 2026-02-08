import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { AnnouncementBanner } from "@/components/landing/AnnouncementBanner";
import { PremiumFooter } from "@/components/landing/cosmic/PremiumFooter";
import { DarkModeToggle } from "@/components/landing/god-mode/DarkModeToggle";
import { useNavigate } from "react-router-dom";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      {/* Announcement Banner */}
      <AnnouncementBanner />

      {/* Header - matches Landing page */}
      <nav 
        className="sticky top-0 z-50 transition-all duration-350 border-b border-border/10 bg-white/85 dark:bg-gray-900/90 backdrop-blur-md"
        style={{
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src="/logo.png" 
                alt="Go-Ads 360° Logo" 
                className="h-10 w-auto object-contain md:h-12 cursor-pointer"
                onClick={() => navigate("/")}
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
                Explore Media
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#F4C542] group-hover:w-full transition-all duration-300" />
              </button>
              <DarkModeToggle />
              <Button
                onClick={() => navigate("/auth")}
                size="sm"
                variant="outline"
                className="font-medium rounded-xl px-6"
              >
                Sign In
              </Button>
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
              <button className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center" onClick={() => navigate("/auth")}>
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer - matches Landing page */}
      <PremiumFooter />
    </div>
  );
}
