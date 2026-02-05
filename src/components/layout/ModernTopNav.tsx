import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { ROUTES } from "@/lib/routes";
import { Plus, Menu } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { SmartSearch } from "@/components/common/SmartSearch";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useIsMobile } from "@/hooks/use-mobile";

export function ModernTopNav() {
  const navigate = useNavigate();
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
    <header className="sticky top-0 z-[100] flex items-center justify-between bg-card/98 backdrop-blur-lg border-b border-border h-14 sm:h-16 px-2 sm:px-4 lg:px-6 shadow-sm transition-colors duration-300 pt-safe">
      {/* Left: Sidebar Toggle + Brand */}
      <div className="flex items-center gap-1 sm:gap-3">
        <SidebarTrigger className="relative">
          <Menu className="h-5 w-5" aria-hidden="true" />
        </SidebarTrigger>
      </div>

      {/* Middle: Search */}
      <div className="flex-1 max-w-md mx-2 sm:mx-4 hidden sm:block">
        <SmartSearch />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Notifications */}
        <NotificationCenter />
        
        {/* Quick Create - Desktop only */}
        <div className="hidden lg:block">
          <QuickAddDrawer
            trigger={
              <Button variant="default" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden lg:inline">Quick Create</span>
              </Button>
            }
          />
        </div>

        {/* Theme Switcher */}
        <div className="hidden sm:block">
          <ThemeSwitcher />
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-10 w-10 min-h-[44px] min-w-[44px] touch-manipulation"
            >
              <Avatar className="w-8 h-8 sm:w-8 sm:h-8">
                <AvatarFallback className="text-xs font-semibold bg-primary/10">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 touch-manipulation">
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
            <DropdownMenuItem onClick={() => navigate(ROUTES.PROFILE_SETTINGS)} className="py-3 touch-manipulation">
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS)} className="py-3 touch-manipulation">
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.DASHBOARD)} className="py-3 touch-manipulation">
              Dashboard
            </DropdownMenuItem>
            {isMobile && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="py-3 touch-manipulation">
                  <ThemeSwitcher />
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive py-3 touch-manipulation">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
