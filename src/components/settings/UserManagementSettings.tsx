import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Shield, Palette } from "lucide-react";
import { CompanyBrandingSettings } from "./CompanyBrandingSettings";

export function UserManagementSettings() {
  const navigate = useNavigate();

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>User Management</CardTitle>
          </div>
          <CardDescription>
            Manage team members, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add users, assign roles (Sales, Planning, Operations, Finance, Admin), and control access to different modules.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => navigate('/admin/users')} variant="default">
              <Users className="mr-2 h-4 w-4" />
              Manage Users
            </Button>
            <Button onClick={() => navigate('/admin/users')} variant="outline">
              <UserPlus className="mr-2 h-4 w-4" />
              Add New User
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Role & Permission Matrix</CardTitle>
          </div>
          <CardDescription>
            Configure role-based access control for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Admin</p>
                <p className="text-sm text-muted-foreground">Full system access</p>
              </div>
              <Button variant="ghost" size="sm">Configure</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sales</p>
                <p className="text-sm text-muted-foreground">Plans, Clients, Campaigns</p>
              </div>
              <Button variant="ghost" size="sm">Configure</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Operations</p>
                <p className="text-sm text-muted-foreground">Field app, Proof uploads</p>
              </div>
              <Button variant="ghost" size="sm">Configure</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Finance</p>
                <p className="text-sm text-muted-foreground">Invoices, Payments, Expenses</p>
              </div>
              <Button variant="ghost" size="sm">Configure</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Branding */}
      <CompanyBrandingSettings />
    </>
  );
}
