import { useState, useEffect } from "react";
import SidebarLayout from "@/layouts/SidebarLayout";
import Topbar from "@/layouts/Topbar";
import CommandPalette from "@/components/CommandPalette";
import { QuickAddDrawer } from "@/components/ui/quick-add-drawer";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
    <>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <SidebarLayout>
          <div className="flex flex-col flex-1 h-full w-full min-w-0">
            <Topbar onSearchOpen={() => setCommandOpen(true)} />
            <main className="flex-1 overflow-y-auto overflow-x-hidden bg-secondary/20 p-3 sm:p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
              <div className="w-full max-w-[1600px] mx-auto">
                {children}
              </div>
            </main>
          </div>
        </SidebarLayout>
      </div>
      
      {/* Mobile FAB - Quick Create */}
      <div className="md:hidden fixed bottom-6 right-6 z-50 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <QuickAddDrawer
          trigger={
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-glow hover:shadow-elegant transition-all duration-300 hover:scale-110 animate-pulse-glow"
            >
              <Plus className="w-6 h-6" />
            </Button>
          }
        />
      </div>
      
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
