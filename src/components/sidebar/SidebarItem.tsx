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
          "group flex items-center rounded-lg text-[13px] font-medium transition-all duration-150 relative",
          collapsed ? "justify-center p-2 mx-auto w-9 h-9" : "gap-2.5 px-3 py-[7px]",
          // Hover
          "hover:bg-accent/80 hover:text-accent-foreground",
          // Active
          isActive && [
            "bg-primary/8 text-primary font-semibold",
            "shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.12)]",
            !collapsed && "before:absolute before:left-0 before:top-[6px] before:bottom-[6px] before:w-[3px] before:bg-primary before:rounded-full"
          ],
          // Inactive
          !isActive && "text-muted-foreground/80"
        )
      }
      title={collapsed ? label : undefined}
    >
      <Icon className={cn(
        "shrink-0 transition-colors",
        collapsed ? "h-[18px] w-[18px]" : "h-4 w-4"
      )} />
      {!collapsed && (
        <span className="flex-1 truncate leading-tight">{label}</span>
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
