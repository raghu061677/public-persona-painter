import { Outlet } from "react-router-dom";
import { SettingsSidebar } from "@/components/settings/zoho-style/SettingsSidebar";

export function SettingsLayout() {
  return (
    <div className="flex h-full min-h-0 bg-muted/30 overflow-hidden">
      <SettingsSidebar />
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden ios-scroll">
        <div className="max-w-7xl mx-auto px-10 py-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
