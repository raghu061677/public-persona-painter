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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Shield, Key, Palette, Upload, Image as ImageIcon } from "lucide-react";

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
  const [organizationName, setOrganizationName] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const isAdmin = roles.includes("admin");

  useEffect(() => {
    loadUserData();
    loadOrgSettings();
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
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrgSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .single();

      if (error) throw error;

      if (data) {
        setOrgSettings(data);
        setOrganizationName(data.organization_name || "");
        if (data.logo_url) setLogoPreview(data.logo_url);
        if (data.hero_image_url) setHeroPreview(data.hero_image_url);
      }
    } catch (error) {
      console.error("Error loading organization settings:", error);
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

  const handleFileUpload = async (file: File, bucketName: string, fileType: 'logo' | 'hero') => {
    if (!isAdmin) {
      toast({
        title: "Permission denied",
        description: "Only admins can upload branding assets.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${fileType}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      // Update organization settings
      const updateData = fileType === 'logo' 
        ? { logo_url: publicUrl }
        : { hero_image_url: publicUrl };

      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: updateError } = await supabase
        .from("organization_settings")
        .update({ ...updateData, updated_by: user?.id })
        .eq("id", orgSettings.id);

      if (updateError) throw updateError;

      toast({
        title: "Upload successful",
        description: `${fileType === 'logo' ? 'Logo' : 'Hero image'} has been updated.`,
      });

      // Update preview
      if (fileType === 'logo') {
        setLogoPreview(publicUrl);
      } else {
        setHeroPreview(publicUrl);
      }

      loadOrgSettings();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateOrgSettings = async () => {
    if (!isAdmin) {
      toast({
        title: "Permission denied",
        description: "Only admins can update organization settings.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("organization_settings")
        .update({
          organization_name: organizationName,
          updated_by: user?.id,
        })
        .eq("id", orgSettings.id);

      if (error) throw error;

      toast({
        title: "Settings updated",
        description: "Organization settings have been updated successfully.",
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

      <Separator />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
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

      {/* Roles Section */}
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
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                <CardTitle>Organization Branding</CardTitle>
              </div>
              <CardDescription>
                Upload your logo and hero images for dashboards, invoices, and templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Enter organization name"
                  className="mt-2"
                  disabled={!isAdmin}
                />
              </div>

              {/* Logo Upload */}
              <div className="space-y-3">
                <Label>Company Logo</Label>
                <p className="text-sm text-muted-foreground">
                  Used in dashboard header, invoices, PPT, and Excel exports
                </p>
                {logoPreview && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="max-h-24 object-contain"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'logos', 'logo');
                    }}
                    disabled={!isAdmin || uploading}
                    className="cursor-pointer"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Hero Image Upload */}
              <div className="space-y-3">
                <Label>Hero Section Image</Label>
                <p className="text-sm text-muted-foreground">
                  Used in landing page hero section
                </p>
                {heroPreview && (
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={heroPreview}
                      alt="Hero image preview"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'hero-images', 'hero');
                    }}
                    disabled={!isAdmin || uploading}
                    className="cursor-pointer"
                  />
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {isAdmin && (
                <Button onClick={handleUpdateOrgSettings} disabled={updating || uploading}>
                  {updating || uploading ? "Updating..." : "Save Settings"}
                </Button>
              )}

              {!isAdmin && (
                <p className="text-sm text-muted-foreground">
                  Only administrators can update branding settings.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
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
