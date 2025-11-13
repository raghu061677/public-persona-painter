import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, FileText, Users, Settings as SettingsIcon, 
  Upload, Palette, Shield, HelpCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeCustomization } from "@/components/settings/ThemeCustomization";
import { ColorLegend } from "@/components/settings/ColorLegend";
import { UserManagementSettings } from "@/components/settings/UserManagementSettings";
import { InvoiceTemplateSettings } from "@/components/settings/InvoiceTemplateSettings";
import { DocumentTemplatesSettings } from "@/components/settings/DocumentTemplatesSettings";
import { BrandingSettings } from "@/components/settings/BrandingSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { PPTTemplateSettings } from "@/components/settings/PPTTemplateSettings";

export default function OrganizationSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roles = rolesData?.map(r => r.role) || [];
      const hasAdmin = roles.includes("admin");
      
      if (!hasAdmin) {
        toast({
          title: "Access Denied",
          description: "Only administrators can access organization settings",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your organization configuration, users, templates, and branding
        </p>
      </div>

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="branding">
            <Building2 className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users & Roles
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="help">
            <HelpCircle className="h-4 w-4 mr-2" />
            Help
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6 mt-6">
          <BrandingSettings />
        </TabsContent>

        <TabsContent value="users" className="space-y-6 mt-6">
          <UserManagementSettings />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <CardTitle>Invoice Templates</CardTitle>
              </div>
              <CardDescription>
                Configure invoice PDF templates and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InvoiceTemplateSettings />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <CardTitle>Document Templates</CardTitle>
              </div>
              <CardDescription>
                Manage PPT, Excel templates and terms & conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentTemplatesSettings />
            </CardContent>
          </Card>

          <PPTTemplateSettings />
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6 mt-6">
          <ThemeCustomization />
          <ColorLegend />
        </TabsContent>

        <TabsContent value="security" className="space-y-6 mt-6">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="help" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Help & Support</CardTitle>
              <CardDescription>
                Get help with using Go-Ads 360°
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Documentation</h3>
                <p className="text-sm text-muted-foreground">
                  Access comprehensive guides for all features
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Contact Support</h3>
                <p className="text-sm text-muted-foreground">
                  Email: support@goads360.com<br />
                  Phone: +91 1800-XXX-XXXX
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
