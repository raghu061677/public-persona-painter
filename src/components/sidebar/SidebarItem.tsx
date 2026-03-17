import { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  collapsed?: boolean;
  badge?: number;
}

export function SidebarItem({ icon: Icon, label, href, collapsed, badge }: SidebarItemProps) {
  return (
    <NavLink
      to={href}
      end={href === "/admin/dashboard"}
      className={({ isActive }) =>
        cn(
          "group flex items-center rounded-md text-[13px] transition-all duration-150 relative",
          collapsed ? "justify-center p-2 mx-auto w-9 h-9" : "gap-2.5 px-3 py-[6px]",
          // Hover — unified muted bg
          "hover:bg-muted",
          // Active state
          isActive && [
            "bg-primary/[0.08] text-primary font-semibold",
            !collapsed && "border-l-[3px] border-primary ml-0 pl-[9px]",
            collapsed && "ring-1 ring-primary/20"
          ],
          // Inactive state
          !isActive && "text-foreground/70 font-medium",
        )
      }
      title={collapsed ? label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <span className="flex-1 truncate leading-none">{label}</span>
      )}
      {!collapsed && badge !== undefined && badge > 0 && (
        <Badge 
          variant="secondary" 
          className="ml-auto h-[18px] min-w-[18px] px-1 text-[10px] font-semibold rounded-full bg-primary/10 text-primary border-0"
        >
          {badge > 99 ? "99+" : badge}
        </Badge>
      )}
    </NavLink>
  );
}
