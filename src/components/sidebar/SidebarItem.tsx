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
      className={({ isActive }) =>
        cn(
          "flex items-center transition-all duration-200 relative rounded-xl text-sm font-medium",
          collapsed ? "justify-center p-2.5 mx-1" : "gap-3 px-4 py-2.5 mx-2",
          "hover:bg-primary/10 hover:text-primary",
          isActive && [
            "bg-primary/10 text-primary font-semibold",
            !collapsed && "before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:bg-primary before:rounded-r-full"
          ],
          !isActive && "text-muted-foreground"
        )
      }
      title={collapsed ? label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && (
        <span className="flex-1 truncate">{label}</span>
      )}
      {!collapsed && badge !== undefined && badge > 0 && (
        <Badge variant="secondary" className="ml-auto h-5 min-w-[20px] px-1.5 text-xs">
          {badge > 99 ? "99+" : badge}
        </Badge>
      )}
    </NavLink>
  );
}
