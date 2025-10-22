import { useState, useEffect } from "react";
import SidebarLayout from "@/layouts/SidebarLayout";
import Topbar from "@/layouts/Topbar";
import CommandPalette from "@/components/CommandPalette";

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
      <div className="flex h-screen w-full overflow-hidden">
        <SidebarLayout>
          <div className="flex flex-col flex-1 h-full">
            <Topbar onSearchOpen={() => setCommandOpen(true)} />
            <main className="flex-1 overflow-y-auto bg-background p-6">
              {children}
            </main>
          </div>
        </SidebarLayout>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
