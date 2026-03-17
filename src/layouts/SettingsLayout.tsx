import { Outlet, useNavigate } from "react-router-dom";
import { SettingsSidebar } from "@/components/settings/zoho-style/SettingsSidebar";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SettingsLayout() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen bg-muted/30 overflow-hidden">
      {/* Top header with back-to-dashboard */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/40 bg-background shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/admin/dashboard")}
        >
          <ArrowLeft className="h-4 w-4" />
          <LayoutDashboard className="h-4 w-4" />
          <span className="text-sm font-medium">Back to Dashboard</span>
        </Button>
        <span className="text-sm font-semibold text-foreground">Company Settings</span>
      </div>
      {/* Main content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <SettingsSidebar />
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden ios-scroll">
          <div className="max-w-7xl mx-auto px-10 py-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
