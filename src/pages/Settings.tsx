import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Shield, Key, Palette, Upload, Image, Hash, Zap } from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [orgSettings, setOrgSettings] = useState<any>(null);
  const [orgName, setOrgName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [heroPreview, setHeroPreview] = useState<string>("");

  const isAdmin = roles.includes("admin");

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setUsername(profileData.username || "");
      }

      // Load roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (rolesData) {
        setRoles(rolesData.map((r) => r.role));
      }

      // Load organization settings
      const { data: orgData } = await supabase
        .from("organization_settings")
        .select("*")
        .single();

      if (orgData) {
        setOrgSettings(orgData);
        setOrgName(orgData.organization_name || "");
        setLogoPreview(orgData.logo_url || "");
        setHeroPreview(orgData.hero_image_url || "");
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!profile) return;
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username })
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleHeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHeroFile(file);
      setHeroPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadBranding = async () => {
    if (!isAdmin) {
      toast({
        title: "Permission denied",
        description: "Only admins can update branding.",
        variant: "destructive",
      });
      return;
    }

    if (!orgSettings) return;

    setUploading(true);
    try {
      let logoUrl = orgSettings.logo_url;
      let heroUrl = orgSettings.hero_image_url;

      // Upload logo if changed
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("logos")
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("logos")
          .getPublicUrl(fileName);

        logoUrl = publicUrl;
      }

      // Upload hero image if changed
      if (heroFile) {
        const fileExt = heroFile.name.split(".").pop();
        const fileName = `hero-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("hero-images")
          .upload(fileName, heroFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("hero-images")
          .getPublicUrl(fileName);

        heroUrl = publicUrl;
      }

      // Update organization settings
      const { error } = await supabase
        .from("organization_settings")
        .update({
          organization_name: orgName,
          logo_url: logoUrl,
          hero_image_url: heroUrl,
        })
        .eq("id", orgSettings.id);

      if (error) throw error;

      toast({
        title: "Branding updated",
        description: "Your branding assets have been updated successfully.",
      });

      // Reload data
      await loadUserData();
      setLogoFile(null);
      setHeroFile(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (email?: string) => {
    if (!email) return "U";
    return email.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <CardTitle>Profile Information</CardTitle>
              </div>
              <CardDescription>
                Update your profile information and avatar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="text-lg">
                    {getInitials(profile?.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="mt-2"
                  />
                </div>
              </div>
              <Button onClick={handleUpdateProfile} disabled={updating}>
                {updating ? "Updating..." : "Update Profile"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <CardTitle>User Roles</CardTitle>
              </div>
              <CardDescription>Your current role assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {roles.length > 0 ? (
                  roles.map((role) => (
                    <Badge key={role} variant="secondary" className="capitalize">
                      {role}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No roles assigned</p>
                )}
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    <CardTitle>Code Management</CardTitle>
                  </div>
                  <CardDescription>
                    Monitor and manage automatic code generation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    View counter sequences, generation history, and statistics for all entity codes (Assets, Plans, Campaigns, Clients, Invoices, etc.)
                  </p>
                  <Button onClick={() => navigate('/admin/code-management')} variant="outline">
                    <Hash className="mr-2 h-4 w-4" />
                    Open Code Management
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    <CardTitle>Power Bills Dashboard</CardTitle>
                  </div>
                  <CardDescription>
                    Bulk fetch and manage electricity bills for all assets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Fetch TGSPDCL bills for multiple media assets at once, view total dues, and track payment status across your entire inventory.
                  </p>
                  <Button onClick={() => navigate('/admin/power-bills')} variant="outline">
                    <Zap className="mr-2 h-4 w-4" />
                    Open Power Bills
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="branding" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                <CardTitle>Organization Branding</CardTitle>
              </div>
              <CardDescription>
                Upload your company logo and hero images for landing page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Enter organization name"
                  className="mt-2"
                  disabled={!isAdmin}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="logo-upload" className="flex items-center gap-2 mb-2">
                    <Upload className="h-4 w-4" />
                    Company Logo
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Used in dashboard, invoices, and documents (recommended: 200x60px)
                  </p>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="cursor-pointer"
                    disabled={!isAdmin}
                  />
                  {logoPreview && (
                    <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-16 object-contain"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="hero-upload" className="flex items-center gap-2 mb-2">
                    <Image className="h-4 w-4" />
                    Hero Section Image
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Used in landing page hero section (recommended: 1920x1080px)
                  </p>
                  <Input
                    id="hero-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleHeroChange}
                    className="cursor-pointer"
                    disabled={!isAdmin}
                  />
                  {heroPreview && (
                    <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                      <img
                        src={heroPreview}
                        alt="Hero preview"
                        className="w-full max-w-md object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={handleUploadBranding}
                disabled={uploading || !isAdmin || (!logoFile && !heroFile && orgName === orgSettings?.organization_name)}
              >
                {uploading ? "Uploading..." : "Save Branding"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                <CardTitle>Change Password</CardTitle>
              </div>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="mt-2"
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={updating || !newPassword || !confirmPassword}
              >
                {updating ? "Updating..." : "Change Password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
