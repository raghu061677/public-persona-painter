import * as React from "react";
import { Plus, FileText, Users, LayoutGrid, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    label: "New Plan",
    description: "Create media plan",
    icon: <FileText className="w-6 h-6" />,
    path: "/admin/plans/new",
    color: "bg-primary text-primary-foreground",
  },
  {
    label: "New Client",
    description: "Add client profile",
    icon: <Users className="w-6 h-6" />,
    path: "/admin/clients/new",
    color: "bg-accent text-accent-foreground",
  },
  {
    label: "New Asset",
    description: "Add media asset",
    icon: <LayoutGrid className="w-6 h-6" />,
    path: "/admin/media-assets/new",
    color: "bg-secondary text-secondary-foreground",
  },
  {
    label: "New Campaign",
    description: "Launch campaign",
    icon: <Megaphone className="w-6 h-6" />,
    path: "/admin/campaigns",
    color: "bg-muted text-muted-foreground",
  },
];

interface QuickAddDrawerProps {
  trigger?: React.ReactNode;
}

export function QuickAddDrawer({ trigger }: QuickAddDrawerProps) {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  const handleAction = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {trigger || (
          <Button size="icon" className="rounded-full shadow-glow">
            <Plus className="w-5 h-5" />
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Quick Create</DrawerTitle>
          <DrawerDescription>Choose what you want to create</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 pb-8">
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => handleAction(action.path)}
                className={cn(
                  "flex flex-col items-center justify-center p-6 rounded-2xl",
                  "transition-all duration-300 hover:scale-105 hover:shadow-elegant",
                  "touch-manipulation",
                  action.color
                )}
              >
                <div className="mb-3">{action.icon}</div>
                <div className="font-semibold text-sm mb-1">{action.label}</div>
                <div className="text-xs opacity-80">{action.description}</div>
              </button>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
