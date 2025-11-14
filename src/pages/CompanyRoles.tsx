import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, InfoAlert, InputRow } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Shield, Plus, Edit, Trash2 } from "lucide-react";
import { RolePermissionsMatrix } from "@/components/users/RolePermissionsMatrix";

const DEFAULT_ROLES = [
  { name: "admin", label: "Administrator", description: "Full system access", color: "destructive" },
  { name: "sales", label: "Sales", description: "Manage clients, plans, campaigns", color: "default" },
  { name: "operations", label: "Operations", description: "Handle installations and proofs", color: "default" },
  { name: "finance", label: "Finance", description: "Manage invoices and expenses", color: "default" },
  { name: "viewer", label: "Viewer", description: "Read-only access", color: "secondary" },
];

export default function CompanyRoles() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Roles & Permissions</h1>
        <p className="text-sm text-muted-foreground">
          Manage user roles and their access permissions
        </p>
      </div>

      <InfoAlert>
        <strong>Role-Based Access Control:</strong> Define what each role can access and modify in the system. Users are assigned roles during invitation.
      </InfoAlert>

      <SettingsCard>
        <SectionHeader
          title="System Roles"
          description="Default roles with predefined permissions"
        />

        <div className="space-y-4">
          {DEFAULT_ROLES.map((role) => (
            <div
              key={role.name}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-medium">{role.label}</h3>
                  <Badge variant={role.color as any}>{role.name}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </div>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="Permission Matrix"
          description="Detailed view of what each role can access"
        />
        <RolePermissionsMatrix />
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="Role Settings"
          description="Configure role-based features"
        />

        <InputRow
          label="Allow Role Switching"
          description="Let admins temporarily switch to other roles for testing"
        >
          <Switch />
        </InputRow>

        <InputRow
          label="Enforce Role Hierarchy"
          description="Lower roles cannot modify data created by higher roles"
        >
          <Switch />
        </InputRow>
      </SettingsCard>
    </div>
  );
}
