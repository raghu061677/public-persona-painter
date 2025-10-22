import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/store/sidebarStore";
import {
  Home, Users, Map, Layers, Briefcase, Wrench,
  Wallet, BarChart2, Settings, Menu, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const MENU = [
  { label: "Dashboard", icon: Home, path: "/dashboard" },
  { label: "Clients", icon: Users, path: "/admin/clients" },
  { label: "Media Assets", icon: Map, path: "/admin/media-assets" },
  { label: "Plans", icon: Layers, path: "/admin/plans" },
  { label: "Campaigns", icon: Briefcase, path: "/admin/campaigns" },
  { label: "Operations", icon: Wrench, path: "/operations" },
  { label: "Finance", icon: Wallet, path: "/finance" },
  { label: "Reports", icon: BarChart2, path: "/reports" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { open, toggle } = useSidebarStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      });
      navigate("/auth");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log out. Please try again.",
      });
    }
  };

  return (
    <aside
      className={cn(
        "h-screen transition-all duration-300 bg-sidebar-background border-r border-sidebar-border flex flex-col",
        open ? "w-60" : "w-16"
      )}
    >
      <div className="flex items-center justify-between p-3 border-b border-sidebar-border">
        <Button variant="ghost" size="icon" onClick={toggle}>
          <Menu className="w-4 h-4" />
        </Button>
      </div>
      
      <nav className="flex-1 flex flex-col space-y-1 px-2 py-4 overflow-y-auto">
        {MENU.map(({ label, icon: Icon, path }) => (
          <NavLink
            key={label}
            to={path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground"
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {open && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size={open ? "default" : "icon"}
          className="w-full justify-start text-sidebar-foreground hover:text-sidebar-accent-foreground"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          {open && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
