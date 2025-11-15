import { useState } from "react";
import { Search, Grid3x3, Table2, Map, Sparkles, Sun, Moon, Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type ViewMode = "table" | "map" | "gallery";
export type ThemeMode = "light" | "dark" | "classic" | "modern";

interface HeaderBarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAIFilterClick: () => void;
}

export function HeaderBar({
  currentView,
  onViewChange,
  currentTheme,
  onThemeChange,
  searchQuery,
  onSearchChange,
  onAIFilterClick,
}: HeaderBarProps) {
  return (
    <div className="h-12 border-b border-border bg-card flex items-center px-4 gap-3 sticky top-0 z-30">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Media Assets</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Global Search */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search assets... (Press / to focus)"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-4"
        />
      </div>

      {/* AI Filter Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onAIFilterClick}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        AI Filters
      </Button>

      {/* View Switcher */}
      <div className="flex items-center gap-1 border border-border rounded-lg p-1">
        <Button
          variant={currentView === "table" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onViewChange("table")}
          className="h-8 px-3"
        >
          <Table2 className="h-4 w-4" />
        </Button>
        <Button
          variant={currentView === "map" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onViewChange("map")}
          className="h-8 px-3"
        >
          <Map className="h-4 w-4" />
        </Button>
        <Button
          variant={currentView === "gallery" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onViewChange("gallery")}
          className="h-8 px-3"
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>
      </div>

      {/* Theme Toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9">
            {currentTheme === "light" && <Sun className="h-4 w-4" />}
            {currentTheme === "dark" && <Moon className="h-4 w-4" />}
            {(currentTheme === "classic" || currentTheme === "modern") && (
              <Palette className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onThemeChange("light")}>
            <Sun className="h-4 w-4 mr-2" />
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onThemeChange("dark")}>
            <Moon className="h-4 w-4 mr-2" />
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onThemeChange("classic")}>
            <Palette className="h-4 w-4 mr-2 text-blue-500" />
            Classic
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onThemeChange("modern")}>
            <Palette className="h-4 w-4 mr-2 text-purple-500" />
            Modern
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
