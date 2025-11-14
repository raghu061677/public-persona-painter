import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Download, Upload, Users, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DashboardSharingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  dashboardName: string;
  widgets: any[];
}

export function DashboardSharingDialog({ 
  open, 
  onOpenChange, 
  dashboardId, 
  dashboardName, 
  widgets 
}: DashboardSharingDialogProps) {
  const [shareEmail, setShareEmail] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const handleShareWithTeam = async () => {
    if (!shareEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setIsSharing(true);
    try {
      // Get the user with this email from company_users
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to share');
        return;
      }

      const { data: currentUserCompany } = await supabase
        .from('company_users' as any)
        .select('company_id')
        .eq('user_id', user.id)
        .single() as any;

      if (!currentUserCompany) {
        toast.error('Company not found');
        return;
      }

      // Find the target user by email
      const { data: targetUser } = await supabase
        .from('company_users' as any)
        .select('user_id')
        .eq('company_id', currentUserCompany.company_id)
        .limit(1)
        .single() as any;

      if (!targetUser) {
        toast.error('User not found in your company');
        return;
      }

      // Create a copy of the dashboard for the target user
      const { error } = await supabase
        .from('dashboard_configurations' as any)
        .insert({
          user_id: targetUser.user_id,
          company_id: currentUserCompany.company_id,
          name: `${dashboardName} (Shared)`,
          layout: widgets,
          is_default: false
        }) as any;

      if (error) throw error;

      toast.success('Dashboard shared successfully!');
      setShareEmail('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error sharing dashboard:', error);
      toast.error('Failed to share dashboard');
    } finally {
      setIsSharing(false);
    }
  };

  const handleExportJSON = () => {
    const exportData = {
      name: dashboardName,
      version: '1.0',
      widgets: widgets,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${dashboardName.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Dashboard exported successfully!');
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importData = JSON.parse(text);

        if (!importData.widgets || !Array.isArray(importData.widgets)) {
          toast.error('Invalid dashboard file format');
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: companyData } = await supabase
          .from('company_users' as any)
          .select('company_id')
          .eq('user_id', user.id)
          .single() as any;

        const { error } = await supabase
          .from('dashboard_configurations' as any)
          .insert({
            user_id: user.id,
            company_id: companyData?.company_id,
            name: importData.name || 'Imported Dashboard',
            layout: importData.widgets,
            is_default: false
          }) as any;

        if (error) throw error;

        toast.success('Dashboard imported successfully!');
        onOpenChange(false);
        window.location.reload();
      } catch (error) {
        console.error('Error importing dashboard:', error);
        toast.error('Failed to import dashboard');
      }
    };

    input.click();
  };

  const handleCopyShareLink = () => {
    const shareLink = `${window.location.origin}/admin/custom-dashboard?shared=${dashboardId}`;
    navigator.clipboard.writeText(shareLink);
    toast.success('Share link copied to clipboard!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Dashboard</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Share with Team */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Share with Team Member
            </Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="team@example.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
              />
              <Button onClick={handleShareWithTeam} disabled={isSharing}>
                Share
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Creates a copy of this dashboard for the team member
            </p>
          </div>

          {/* Copy Share Link */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Share Link
            </Label>
            <Button variant="outline" className="w-full" onClick={handleCopyShareLink}>
              Copy Share Link
            </Button>
            <p className="text-xs text-muted-foreground">
              Copy a link to view this dashboard
            </p>
          </div>

          {/* Export/Import */}
          <div className="space-y-3 pt-4 border-t">
            <Label>Export & Import</Label>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleExportJSON}>
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleImportJSON}>
                <Upload className="h-4 w-4 mr-2" />
                Import JSON
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Export to save or share dashboard configuration files
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
