import { Outlet } from "react-router-dom";
import { SettingsSidebar } from "@/components/settings/zoho-style/SettingsSidebar";

export function SettingsLayout() {
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-muted/30">
      <SettingsSidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-10 py-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
