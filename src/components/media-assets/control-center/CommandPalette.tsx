import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Users,
  Layers,
  FileText,
  Camera,
  DollarSign,
  BarChart3,
  Settings,
  Table2,
  Map,
  Grid3x3,
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onViewChange?: (view: "table" | "map" | "gallery") => void;
}

export function CommandPalette({
  isOpen,
  onOpenChange,
  onViewChange,
}: CommandPaletteProps) {
  const navigate = useNavigate();

  const commands = [
    {
      group: "Navigation",
      items: [
        { icon: LayoutDashboard, label: "Go to Dashboard", action: () => navigate("/dashboard") },
        { icon: Users, label: "Go to Clients", action: () => navigate("/clients") },
        { icon: Layers, label: "Go to Media Assets", action: () => navigate("/media-assets") },
        { icon: FileText, label: "Go to Plans", action: () => navigate("/plans") },
        { icon: Camera, label: "Go to Campaigns", action: () => navigate("/campaigns") },
        { icon: DollarSign, label: "Go to Finance", action: () => navigate("/finance/invoices") },
        { icon: BarChart3, label: "Go to Reports", action: () => navigate("/reports/vacant-media") },
        { icon: Settings, label: "Go to Settings", action: () => navigate("/settings") },
      ],
    },
    {
      group: "Views",
      items: [
        {
          icon: Table2,
          label: "Switch to Table View",
          action: () => {
            onViewChange?.("table");
            onOpenChange(false);
          },
        },
        {
          icon: Map,
          label: "Switch to Map View",
          action: () => {
            onViewChange?.("map");
            onOpenChange(false);
          },
        },
        {
          icon: Grid3x3,
          label: "Switch to Gallery View",
          action: () => {
            onViewChange?.("gallery");
            onOpenChange(false);
          },
        },
      ],
    },
  ];

  return (
    <CommandDialog open={isOpen} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {commands.map((group) => (
          <CommandGroup key={group.group} heading={group.group}>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.label}
                  onSelect={() => {
                    item.action();
                    onOpenChange(false);
                  }}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
