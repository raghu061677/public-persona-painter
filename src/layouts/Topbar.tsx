import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { QuickAddDrawer } from "@/components/ui/quick-add-drawer";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ROUTES } from "@/lib/routes";
import ThemePicker from "@/components/ThemePicker";
import { GlobalLayoutSettings } from "@/components/settings/GlobalLayoutSettings";
import { Bell, Search, Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { SmartSearch } from "@/components/common/SmartSearch";

export default function Topbar({ onSearchOpen }: { onSearchOpen: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [userEmail, setUserEmail] = useState<string>("");
  const isMobile = useIsMobile();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
      }
    });
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      });
      navigate(ROUTES.AUTH);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log out.",
      });
    }
  };

  const getInitials = () => {
    if (!userEmail) return "U";
    return userEmail.charAt(0).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between bg-card/95 backdrop-blur-md border-b border-border h-14 md:h-16 px-3 md:px-4 lg:px-6 shadow-sm w-full shrink-0">
      {/* Left: Brand */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <span className="font-semibold text-foreground text-sm md:text-base truncate">Go-Ads 360°</span>
        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuLink asChild>
            <Link
              to="/marketplace"
              className={cn(
                "group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
                location.pathname === "/marketplace" && "bg-accent"
              )}
            >
              Marketplace
            </Link>
          </NavigationMenuLink>
          <NavigationMenuLink asChild>
            <Link
              to="/admin/booking-requests"
              className={cn(
                "group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
                location.pathname === "/admin/booking-requests" && "bg-accent"
              )}
            >
              Booking Requests
            </Link>
          </NavigationMenuLink>
        </NavigationMenu>
      </div>

      {/* Middle: Search */}
      <div className="flex-1 max-w-md mx-2 md:mx-4 min-w-0">
        <SmartSearch />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        {/* Global Layout Settings */}
        <GlobalLayoutSettings />
        
        {/* Quick Create - Desktop only */}
        <div className="hidden md:block">
          <QuickAddDrawer
            trigger={
              <Button variant="default" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden lg:inline">Quick Create</span>
              </Button>
            }
          />
        </div>

        <ThemePicker />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 md:h-10 md:w-10">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-2 p-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium leading-none">My Account</p>
                <p className="text-xs text-muted-foreground truncate">
                  {userEmail}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(ROUTES.PROFILE_SETTINGS)}>
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS)}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.DASHBOARD)}>
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
