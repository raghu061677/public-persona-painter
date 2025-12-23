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
import { useState, useEffect } from "react";

export function ModernAppLayout({ children }: { children: React.ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);

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

  return (
    <ThemeContextProvider>
      <OnboardingGate>
        <BreadcrumbProvider>
          <SidebarProvider defaultOpen={true}>
            <div className="flex min-h-[100dvh] w-full bg-background transition-colors duration-300">
              {/* Responsive Sidebar */}
              <ResponsiveSidebar />

              {/* Main Content Area */}
              <div className="flex flex-col flex-1 min-w-0">
                {/* Top Navigation */}
                <ModernTopNav />

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
                  <div className="w-full max-w-[1800px] mx-auto">
                    <BreadcrumbNav />
                    <div className="mt-4">
                      {children}
                    </div>
                  </div>
                </main>
              </div>
            </div>

            {/* Mobile FAB - Quick Create */}
            <div className="md:hidden fixed bottom-6 right-6 z-50">
              <QuickAddDrawer
                trigger={
                  <Button
                    size="lg"
                    className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
                  >
                    <Plus className="w-6 h-6" />
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
