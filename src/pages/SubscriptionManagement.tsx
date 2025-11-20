import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const AVAILABLE_MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'media_assets', label: 'Media Assets' },
  { id: 'clients', label: 'Clients' },
  { id: 'plans', label: 'Plans' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'operations', label: 'Operations' },
  { id: 'finance', label: 'Finance' },
  { id: 'reports', label: 'Reports' },
  { id: 'ai_assistant', label: 'AI Assistant' },
  { id: 'marketplace', label: 'Marketplace' },
];

export default function SubscriptionManagement() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [formData, setFormData] = useState({
    tier: 'free',
    user_limit: 3,
    asset_limit: 10,
    campaign_limit: 5,
    modules: ['dashboard', 'media_assets', 'clients'],
    billing_cycle: 'monthly',
    amount: 0,
    auto_renew: true,
  });

  useEffect(() => {
    fetchCompaniesWithSubscriptions();
  }, []);

  const fetchCompaniesWithSubscriptions = async () => {
    setLoading(true);
    try {
      const { data: companiesData, error } = await supabase
        .from('companies')
        .select(`
          *,
          company_subscriptions (
            id,
            tier,
            status,
            user_limit,
            asset_limit,
            campaign_limit,
            modules,
            billing_cycle,
            amount,
            start_date,
            end_date,
            auto_renew
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(companiesData || []);
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Error",
        description: "Failed to fetch companies and subscriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (company: any) => {
    setSelectedCompany(company);
    const subscription = company.company_subscriptions?.[0];
    
    if (subscription) {
      setFormData({
        tier: subscription.tier,
        user_limit: subscription.user_limit || 3,
        asset_limit: subscription.asset_limit,
        campaign_limit: subscription.campaign_limit,
        modules: subscription.modules || ['dashboard'],
        billing_cycle: subscription.billing_cycle,
        amount: subscription.amount,
        auto_renew: subscription.auto_renew,
      });
    } else {
      setFormData({
        tier: 'free',
        user_limit: 3,
        asset_limit: 10,
        campaign_limit: 5,
        modules: ['dashboard', 'media_assets', 'clients'],
        billing_cycle: 'monthly',
        amount: 0,
        auto_renew: true,
      });
    }
    
    setDialogOpen(true);
  };

  const handleSaveSubscription = async () => {
    if (!selectedCompany) return;

    try {
      const subscription = selectedCompany.company_subscriptions?.[0];
      const today = new Date().toISOString().split('T')[0];
      
      if (subscription) {
        // Update existing subscription
        const { error } = await supabase
          .from('company_subscriptions')
          .update({
            tier: formData.tier,
            user_limit: formData.user_limit,
            asset_limit: formData.asset_limit,
            campaign_limit: formData.campaign_limit,
            modules: formData.modules,
            billing_cycle: formData.billing_cycle,
            amount: formData.amount,
            auto_renew: formData.auto_renew,
          })
          .eq('id', subscription.id);

        if (error) throw error;
      } else {
        // Create new subscription
        const { error } = await supabase
          .from('company_subscriptions')
          .insert({
            company_id: selectedCompany.id,
            tier: formData.tier,
            status: 'active',
            user_limit: formData.user_limit,
            asset_limit: formData.asset_limit,
            campaign_limit: formData.campaign_limit,
            modules: formData.modules,
            billing_cycle: formData.billing_cycle,
            amount: formData.amount,
            auto_renew: formData.auto_renew,
            start_date: today,
            end_date: null,
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Subscription updated successfully",
      });
      
      setDialogOpen(false);
      fetchCompaniesWithSubscriptions();
    } catch (error: any) {
      console.error('Error saving subscription:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save subscription",
        variant: "destructive",
      });
    }
  };

  const handleToggleModule = (moduleId: string) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.includes(moduleId)
        ? prev.modules.filter(m => m !== moduleId)
        : [...prev.modules, moduleId]
    }));
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'free': return 'secondary';
      case 'pro': return 'default';
      case 'enterprise': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Subscription Management</h1>
          <p className="text-muted-foreground">
            Manage company subscriptions, user limits, and module access
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {companies.map((company) => {
          const subscription = company.company_subscriptions?.[0];
          const usage = subscription ? {
            users: 0, // Would need to query company_users count
            assets: 0, // Would need to query media_assets count
            campaigns: 0, // Would need to query campaigns count
          } : null;

          return (
            <Card key={company.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle>{company.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <span>{company.slug}</span>
                        <Badge variant="outline">{company.type}</Badge>
                        {subscription && (
                          <Badge variant={getTierBadgeVariant(subscription.tier)}>
                            {subscription.tier.toUpperCase()}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <Button onClick={() => handleOpenDialog(company)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Manage Subscription
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {subscription ? (
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">User Limit</div>
                      <div className="font-medium">{subscription.user_limit || 'Unlimited'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Asset Limit</div>
                      <div className="font-medium">{subscription.asset_limit || 'Unlimited'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Campaign Limit</div>
                      <div className="font-medium">{subscription.campaign_limit || 'Unlimited'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Active Modules</div>
                      <div className="font-medium">{subscription.modules?.length || 0} modules</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No active subscription</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Subscription - {selectedCompany?.name}</DialogTitle>
            <DialogDescription>
              Configure subscription tier, limits, and enabled modules
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subscription Tier</Label>
                <Select value={formData.tier} onValueChange={(value) => setFormData({ ...formData, tier: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select value={formData.billing_cycle} onValueChange={(value) => setFormData({ ...formData, billing_cycle: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>User Limit</Label>
                <Input
                  type="number"
                  value={formData.user_limit}
                  onChange={(e) => setFormData({ ...formData, user_limit: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Asset Limit</Label>
                <Input
                  type="number"
                  value={formData.asset_limit || ''}
                  onChange={(e) => setFormData({ ...formData, asset_limit: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label>Campaign Limit</Label>
                <Input
                  type="number"
                  value={formData.campaign_limit || ''}
                  onChange={(e) => setFormData({ ...formData, campaign_limit: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.auto_renew}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_renew: checked })}
              />
              <Label>Auto-renew subscription</Label>
            </div>

            <div className="space-y-2">
              <Label>Enabled Modules</Label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_MODULES.map((module) => (
                  <div key={module.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.modules.includes(module.id)}
                      onCheckedChange={() => handleToggleModule(module.id)}
                    />
                    <label className="text-sm">{module.label}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSubscription}>Save Subscription</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
