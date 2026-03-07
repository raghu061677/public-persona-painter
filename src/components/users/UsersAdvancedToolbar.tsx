import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Upload, Mail, RefreshCw, Filter, X } from "lucide-react";
import { getRoleLabel } from "@/lib/rbac/roleNormalization";

interface UsersAdvancedToolbarProps {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  roleFilter: string;
  onRoleFilterChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  onAddUser: () => void;
  onBulkImport: () => void;
  onInvite: () => void;
  onRefresh: () => void;
}

const QUICK_ROLES = [
  { key: "", label: "All Roles" },
  { key: "admin", label: "Admins" },
  { key: "sales", label: "Sales" },
  { key: "operations", label: "Operations" },
  { key: "finance", label: "Finance" },
  { key: "mounting", label: "Mounting" },
  { key: "monitoring", label: "Monitoring" },
  { key: "viewer", label: "Viewers" },
];

export default function UsersAdvancedToolbar({
  searchTerm, onSearchChange,
  roleFilter, onRoleFilterChange,
  statusFilter, onStatusFilterChange,
  onAddUser, onBulkImport, onInvite, onRefresh,
}: UsersAdvancedToolbarProps) {
  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={onAddUser}>
            <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add User
          </Button>
          <Button size="sm" variant="outline" onClick={onInvite}>
            <Mail className="h-3.5 w-3.5 mr-1.5" /> Invite
          </Button>
          <Button size="sm" variant="outline" onClick={onBulkImport}>
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Import
          </Button>
          <Button size="sm" variant="ghost" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {QUICK_ROLES.map(r => (
          <Badge
            key={r.key}
            variant={roleFilter === r.key ? "default" : "outline"}
            className="cursor-pointer text-xs px-2.5 py-0.5 hover:bg-accent transition-colors"
            onClick={() => onRoleFilterChange(r.key)}
          >
            {r.label}
          </Badge>
        ))}
        <span className="text-muted-foreground mx-1">|</span>
        <Badge
          variant={statusFilter === "" ? "default" : "outline"}
          className="cursor-pointer text-xs px-2.5 py-0.5 hover:bg-accent transition-colors"
          onClick={() => onStatusFilterChange("")}
        >
          All Status
        </Badge>
        <Badge
          variant={statusFilter === "Active" ? "default" : "outline"}
          className="cursor-pointer text-xs px-2.5 py-0.5 hover:bg-accent transition-colors"
          onClick={() => onStatusFilterChange("Active")}
        >
          Active
        </Badge>
        <Badge
          variant={statusFilter === "Suspended" ? "default" : "outline"}
          className="cursor-pointer text-xs px-2.5 py-0.5 hover:bg-accent transition-colors"
          onClick={() => onStatusFilterChange("Suspended")}
        >
          Suspended
        </Badge>
        {(roleFilter || statusFilter) && (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { onRoleFilterChange(""); onStatusFilterChange(""); }}>
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}
