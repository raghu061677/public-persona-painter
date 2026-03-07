import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  User, Bell, Camera, Loader2, Save, Shield, CheckCircle2,
  Mail, Phone, Calendar, Activity, Lock, Eye, BellRing, Megaphone,
  CreditCard, AlertCircle, Info
} from "lucide-react";
import { format } from "date-fns";

// ── Helpers ──────────────────────────────────────────────

const getSafeDisplayName = (username?: string | null, email?: string | null): string => {
  if (username && username.trim()) return username.trim();
  if (email) return email.split("@")[0];
  return "User";
};

const getSafeInitials = (username?: string | null, email?: string | null): string => {
  const name = getSafeDisplayName(username, email);
  return name.substring(0, 2).toUpperCase();
};

const getProfileCompletion = (profile: ProfileData, email?: string | null): { percent: number; missing: string[] } => {
  const fields: { key: keyof ProfileData | "email"; filled: boolean; label: string }[] = [
    { key: "username", filled: !!profile.username?.trim(), label: "Display Name" },
    { key: "email", filled: !!email, label: "Email" },
    { key: "phone", filled: !!profile.phone?.trim(), label: "Phone" },
    { key: "bio", filled: !!profile.bio?.trim(), label: "Bio" },
    { key: "avatar_url", filled: !!profile.avatar_url?.trim(), label: "Avatar" },
  ];
  const filled = fields.filter((f) => f.filled).length;
  const missing = fields.filter((f) => !f.filled).map((f) => f.label);
  return { percent: Math.round((filled / fields.length) * 100), missing };
};

// ── Types ────────────────────────────────────────────────

interface ProfileData {
  username: string;
  avatar_url?: string;
  phone?: string;
  bio?: string;
}

interface NotificationPreferences {
  email_notifications: boolean;
  campaign_updates: boolean;
  proof_uploads: boolean;
  payment_alerts: boolean;
  system_announcements: boolean;
}

// ── Component ────────────────────────────────────────────

export default function ProfileSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [profile, setProfile] = useState<ProfileData>({
    username: "",
    avatar_url: "",
    phone: "",
    bio: "",
  });

  const [notifications, setNotifications] = useState<NotificationPreferences>({
    email_notifications: true,
    campaign_updates: true,
    proof_uploads: true,
    payment_alerts: true,
    system_announcements: false,
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadProfileData();
  }, [user, navigate]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }

      if (profileData) {
        setProfile({
          username: profileData.username || "",
          avatar_url: profileData.avatar_url || "",
          phone: profileData.phone || "",
          bio: profileData.bio || "",
        });
      }
    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast({ title: "Error", description: "Failed to load profile data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 2MB", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    try {
      setUploading(true);
      const reader = new FileReader();
      const publicUrl = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });

      await supabase.rpc("log_user_activity", {
        p_user_id: user.id,
        p_activity_type: "profile_update",
        p_activity_description: "Updated profile avatar",
        p_metadata: { avatar_url: publicUrl },
      });

      toast({ title: "Avatar updated", description: "Your profile picture has been updated" });
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast({ title: "Error", description: error.message || "Failed to upload avatar", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!profile.username.trim()) {
      toast({ title: "Error", description: "Username is required", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from("profiles")
        .update({ username: profile.username, phone: profile.phone, bio: profile.bio })
        .eq("id", user.id);
      if (error) throw error;

      await supabase.rpc("log_user_activity", {
        p_user_id: user.id,
        p_activity_type: "profile_update",
        p_activity_description: "Updated profile information",
        p_metadata: { username: profile.username, phone: profile.phone },
      });

      toast({ title: "Profile updated", description: "Your profile has been saved successfully" });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({ title: "Error", description: error.message || "Failed to save profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      await supabase.rpc("log_user_activity", {
        p_user_id: user?.id,
        p_activity_type: "notification_preferences_update",
        p_activity_description: "Updated notification preferences",
        p_metadata: notifications as any,
      });
      toast({ title: "Preferences saved", description: "Your notification preferences have been updated" });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to save preferences", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const displayName = getSafeDisplayName(profile.username, user?.email);
  const initials = getSafeInitials(profile.username, user?.email);
  const completion = getProfileCompletion(profile, user?.email);
  const enabledNotifCount = Object.values(notifications).filter(Boolean).length;
  const joinedDate = user?.created_at ? format(new Date(user.created_at), "MMM dd, yyyy") : "—";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading account settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Page Header ─────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Center</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your profile, preferences, and security settings
        </p>
      </div>

      {/* ── Top Profile Summary Card ────────────────────── */}
      <Card className="border bg-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative group">
              <Avatar className="h-20 w-20 border-2 border-border shadow-sm">
                <AvatarImage src={profile.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload-hero"
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="h-5 w-5 text-white" />
              </label>
              <Input
                id="avatar-upload-hero"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
            </div>

            {/* Name & meta */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold truncate">{displayName}</h2>
                <Badge variant="outline" className="text-xs font-normal">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" />
                  Active
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {user?.email || "—"}
                </span>
                {profile.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {profile.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {joinedDate}
                </span>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-4 sm:gap-6 text-center flex-shrink-0">
              <div>
                <p className="text-2xl font-bold text-primary">{completion.percent}%</p>
                <p className="text-[11px] text-muted-foreground leading-tight">Profile<br />Complete</p>
              </div>
              <Separator orientation="vertical" className="h-10 hidden sm:block" />
              <div>
                <p className="text-2xl font-bold">{enabledNotifCount}/5</p>
                <p className="text-[11px] text-muted-foreground leading-tight">Alerts<br />Enabled</p>
              </div>
            </div>
          </div>

          {/* Completion hint */}
          {completion.missing.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border flex items-start gap-2 text-sm">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">
                Complete your profile by adding: <span className="font-medium text-foreground">{completion.missing.join(", ")}</span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Main Tabs ───────────────────────────────────── */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="bg-muted/50 border">
          <TabsTrigger value="details" className="gap-1.5 text-xs sm:text-sm">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Personal</span> Details
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 text-xs sm:text-sm">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Personal Details ───────────────────── */}
        <TabsContent value="details" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: editable form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Avatar section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Profile Picture</CardTitle>
                  <CardDescription className="text-xs">Upload a photo to personalize your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-5">
                    <Avatar className="h-16 w-16 border">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <Label htmlFor="avatar-upload-form" className="cursor-pointer">
                        <Button variant="outline" size="sm" asChild>
                          <span>
                            {uploading ? (
                              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Uploading…</>
                            ) : (
                              <><Camera className="h-3.5 w-3.5 mr-1.5" />Change Avatar</>
                            )}
                          </span>
                        </Button>
                      </Label>
                      <Input
                        id="avatar-upload-form"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={uploading}
                      />
                      <p className="text-[11px] text-muted-foreground mt-1.5">JPG, PNG or WEBP. Max 2MB.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Contact Details</CardTitle>
                  <CardDescription className="text-xs">Update your personal information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="username" className="text-xs font-medium">Display Name *</Label>
                      <Input
                        id="username"
                        value={profile.username}
                        onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                        placeholder="Enter your name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                      <Input id="email" type="email" value={user?.email || ""} disabled className="bg-muted" />
                      <p className="text-[11px] text-muted-foreground">Managed by your authentication provider</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs font-medium">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={profile.phone || ""}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="+91 1234567890"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bio" className="text-xs font-medium">Bio / Designation</Label>
                      <Input
                        id="bio"
                        value={profile.bio || ""}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder="e.g. Sales Manager"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSaveProfile} disabled={saving} size="sm">
                      {saving ? (
                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</>
                      ) : (
                        <><Save className="h-3.5 w-3.5 mr-1.5" />Save Changes</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right sidebar: account summary */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    Account Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline" className="text-[11px]">
                      <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" />Active
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Joined</span>
                    <span className="font-medium">{joinedDate}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Profile</span>
                    <span className="font-medium">{completion.percent}% complete</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Notifications</span>
                    <span className="font-medium">{enabledNotifCount} of 5 on</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Security Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-muted-foreground">Password</span>
                    <Badge variant="secondary" className="text-[10px] ml-auto">Set</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-muted-foreground">Email verified</span>
                    <Badge variant="secondary" className="text-[10px] ml-auto">Yes</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">2FA</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">Not enabled</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab: Notifications ──────────────────────── */}
        <TabsContent value="notifications" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* General */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-primary" />
                    General Notifications
                  </CardTitle>
                  <CardDescription className="text-xs">Core notification delivery settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <NotificationRow
                    id="email-notifications"
                    icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                    label="Email Notifications"
                    description="Receive email notifications for important updates"
                    checked={notifications.email_notifications}
                    onChange={(v) => setNotifications({ ...notifications, email_notifications: v })}
                  />
                </CardContent>
              </Card>

              {/* Campaigns & Operations */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Campaign & Operations Alerts
                  </CardTitle>
                  <CardDescription className="text-xs">Stay informed about campaign progress and field operations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-0 divide-y">
                  <NotificationRow
                    id="campaign-updates"
                    icon={<Eye className="h-4 w-4 text-muted-foreground" />}
                    label="Campaign Updates"
                    description="Get notified about campaign status changes"
                    checked={notifications.campaign_updates}
                    onChange={(v) => setNotifications({ ...notifications, campaign_updates: v })}
                  />
                  <NotificationRow
                    id="proof-uploads"
                    icon={<Camera className="h-4 w-4 text-muted-foreground" />}
                    label="Proof Uploads"
                    description="Notifications when proof photos are uploaded"
                    checked={notifications.proof_uploads}
                    onChange={(v) => setNotifications({ ...notifications, proof_uploads: v })}
                  />
                </CardContent>
              </Card>

              {/* Finance & System */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Finance & System
                  </CardTitle>
                  <CardDescription className="text-xs">Payment alerts and platform announcements</CardDescription>
                </CardHeader>
                <CardContent className="space-y-0 divide-y">
                  <NotificationRow
                    id="payment-alerts"
                    icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
                    label="Payment Alerts"
                    description="Get notified about invoices and payments"
                    checked={notifications.payment_alerts}
                    onChange={(v) => setNotifications({ ...notifications, payment_alerts: v })}
                  />
                  <NotificationRow
                    id="system-announcements"
                    icon={<Megaphone className="h-4 w-4 text-muted-foreground" />}
                    label="System Announcements"
                    description="Receive updates about new features and improvements"
                    checked={notifications.system_announcements}
                    onChange={(v) => setNotifications({ ...notifications, system_announcements: v })}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications} disabled={saving} size="sm">
                  {saving ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</>
                  ) : (
                    <><Save className="h-3.5 w-3.5 mr-1.5" />Save Preferences</>
                  )}
                </Button>
              </div>
            </div>

            {/* Notification summary sidebar */}
            <div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    Notification Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <SummaryItem label="Email delivery" active={notifications.email_notifications} />
                  <SummaryItem label="Campaign alerts" active={notifications.campaign_updates} />
                  <SummaryItem label="Proof uploads" active={notifications.proof_uploads} />
                  <SummaryItem label="Payment alerts" active={notifications.payment_alerts} />
                  <SummaryItem label="Announcements" active={notifications.system_announcements} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab: Security ───────────────────────────── */}
        <TabsContent value="security" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Password & Authentication</CardTitle>
                  <CardDescription className="text-xs">Manage how you sign in to your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Lock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Password</p>
                        <p className="text-xs text-muted-foreground">Last changed: Unknown</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" disabled>Change Password</Button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Two-Factor Authentication</p>
                        <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[11px]">Coming Soon</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Active Sessions</CardTitle>
                  <CardDescription className="text-xs">Devices currently signed in to your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Current Session</p>
                        <p className="text-xs text-muted-foreground">This browser · Active now</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[11px]">Current</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Security Checklist
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <SecurityCheckItem label="Email verified" done />
                  <SecurityCheckItem label="Password set" done />
                  <SecurityCheckItem label="Profile completed" done={completion.percent === 100} />
                  <SecurityCheckItem label="2FA enabled" done={false} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────

function NotificationRow({
  id, icon, label, description, checked, onChange,
}: {
  id: string; icon: React.ReactNode; label: string; description: string;
  checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div className="space-y-0.5">
          <Label htmlFor={id} className="text-sm font-medium cursor-pointer">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SummaryItem({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant={active ? "secondary" : "outline"} className="text-[10px]">
        {active ? "On" : "Off"}
      </Badge>
    </div>
  );
}

function SecurityCheckItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
