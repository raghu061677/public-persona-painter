import { SidebarProvider } from "@/components/ui/sidebar";
import { ResponsiveSidebar } from "@/components/layout/ResponsiveSidebar";
import { ModernTopNav } from "@/components/layout/ModernTopNav";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import { BreadcrumbProvider } from "@/contexts/BreadcrumbContext";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { ThemeContextProvider } from "@/contexts/ThemeContext";
import CommandPalette from "@/components/CommandPalette";
import { QuickAddDrawer } from "@/components/ui/quick-add-drawer";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function ModernAppLayout({ children }: { children: React.ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const location = useLocation();
  const mainContentRef = useRef<HTMLElement>(null);

  // Keyboard shortcut for Command Palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Safety scroll unlock on route change - ensures no stuck scroll state
  useEffect(() => {
    // Reset body scroll state on route change (safety net)
    const resetBodyScroll = () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      document.body.style.width = '';
      document.body.style.paddingRight = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
    };
    
    // Small delay to let any closing animations complete
    const timer = setTimeout(resetBodyScroll, 100);
    
    // Scroll main content to top on route change
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
    
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <ThemeContextProvider>
      <OnboardingGate>
        <BreadcrumbProvider>
          <SidebarProvider defaultOpen={true}>
            <div className="flex h-[100dvh] w-full bg-background transition-colors duration-300 overflow-hidden pointer-events-auto app-viewport">
              {/* Responsive Sidebar */}
              <ResponsiveSidebar />

              {/* Main Content Area */}
              <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden pointer-events-auto">
                {/* Top Navigation */}
                <ModernTopNav />

                {/* Page Content */}
                <main 
                  ref={mainContentRef}
                  className="flex-1 min-h-0 p-2 sm:p-4 md:p-6 lg:p-8 overflow-y-auto overflow-x-hidden pb-safe pointer-events-auto app-scroll ios-scroll"
                >
                  <div className="w-full max-w-[1800px] mx-auto">
                    <BreadcrumbNav />
                    <div className="mt-2 sm:mt-4">
                      {children}
                    </div>
                  </div>
                </main>
              </div>
            </div>

            {/* Mobile FAB - Quick Create - positioned above safe area */}
            <div className="md:hidden fixed bottom-6 right-4 z-50 pb-safe">
              <QuickAddDrawer
                trigger={
                  <Button
                    size="lg"
                    className="h-14 w-14 min-h-[56px] min-w-[56px] rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 touch-manipulation pointer-events-auto"
                    aria-label="Quick create menu"
                  >
                    <Plus className="w-6 h-6" aria-hidden="true" />
                  </Button>
                }
              />
            </div>

            {/* Command Palette */}
            <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
          </SidebarProvider>
        </BreadcrumbProvider>
      </OnboardingGate>
    </ThemeContextProvider>
  );
}
