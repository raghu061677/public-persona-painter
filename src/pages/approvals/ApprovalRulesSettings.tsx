import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface ApprovalRule {
  id: string;
  name: string;
  description: string | null;
  min_amount: number | null;
  max_amount: number | null;
  min_discount_percent: number | null;
  client_type: string | null;
  plan_type: string | null;
  require_sales_approval: boolean;
  require_finance_approval: boolean;
  require_operations_approval: boolean;
  require_director_approval: boolean;
  priority: number;
  is_active: boolean;
}

const emptyRule: Partial<ApprovalRule> = {
  name: "",
  description: "",
  min_amount: null,
  max_amount: null,
  min_discount_percent: null,
  client_type: "",
  plan_type: "",
  require_sales_approval: true,
  require_finance_approval: false,
  require_operations_approval: false,
  require_director_approval: false,
  priority: 100,
  is_active: true,
};

export default function ApprovalRulesSettings() {
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<ApprovalRule>>(emptyRule);
  const [saving, setSaving] = useState(false);
  
  const { user } = useAuth();
  const { company } = useCompany();
  const { toast } = useToast();

  useEffect(() => {
    if (company) {
      fetchRules();
    }
  }, [company]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("approval_rules")
        .select("*")
        .eq("company_id", company?.id)
        .order("priority", { ascending: true });

      if (error) throw error;
      setRules(data || []);
    } catch (error: any) {
      console.error("Error fetching rules:", error);
      toast({
        title: "Error",
        description: "Failed to fetch approval rules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRule = async () => {
    if (!editingRule.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Rule name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      
      const ruleData: any = {
        name: editingRule.name,
        description: editingRule.description || null,
        company_id: company?.id,
        created_by: user?.id,
        min_amount: editingRule.min_amount || null,
        max_amount: editingRule.max_amount || null,
        min_discount_percent: editingRule.min_discount_percent || null,
        client_type: editingRule.client_type?.trim() || null,
        plan_type: editingRule.plan_type?.trim() || null,
        require_sales_approval: editingRule.require_sales_approval,
        require_finance_approval: editingRule.require_finance_approval,
        require_operations_approval: editingRule.require_operations_approval,
        require_director_approval: editingRule.require_director_approval,
        priority: editingRule.priority,
        is_active: editingRule.is_active,
      };

      if (editingRule.id) {
        // Update existing rule
        const { error } = await supabase
          .from("approval_rules")
          .update(ruleData)
          .eq("id", editingRule.id);

        if (error) throw error;
      } else {
        // Create new rule
        const { error } = await supabase
          .from("approval_rules")
          .insert(ruleData);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Rule ${editingRule.id ? "updated" : "created"} successfully`,
      });

      setDialogOpen(false);
      setEditingRule(emptyRule);
      fetchRules();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save rule",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditRule = (rule: ApprovalRule) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      const { error } = await supabase
        .from("approval_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Rule deleted successfully",
      });

      fetchRules();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete rule",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (rule: ApprovalRule) => {
    try {
      const { error } = await supabase
        .from("approval_rules")
        .update({ is_active: !rule.is_active })
        .eq("id", rule.id);

      if (error) throw error;

      fetchRules();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to toggle rule status",
        variant: "destructive",
      });
    }
  };

  const formatAmount = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRequiredLevels = (rule: ApprovalRule) => {
    const levels: string[] = [];
    if (rule.require_sales_approval) levels.push("Sales");
    if (rule.require_finance_approval) levels.push("Finance");
    if (rule.require_operations_approval) levels.push("Operations");
    if (rule.require_director_approval) levels.push("Director");
    return levels.join(", ") || "None";
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card className="p-6">
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Approval Rules</h1>
          <p className="text-muted-foreground mt-1">
            Configure conditional approval workflows based on plan attributes
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingRule(emptyRule)}>
              <Plus className="h-4 w-4 mr-2" />
              New Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRule.id ? "Edit" : "Create"} Approval Rule</DialogTitle>
              <DialogDescription>
                Define conditions and required approval levels
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="space-y-2">
                <Label htmlFor="name">Rule Name *</Label>
                <Input
                  id="name"
                  value={editingRule.name || ""}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  placeholder="e.g., High Value Government Plans"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingRule.description || ""}
                  onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                  placeholder="Describe when this rule applies"
                  rows={2}
                />
              </div>

              {/* Conditions */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Conditions</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_amount">Min Amount (₹)</Label>
                    <Input
                      id="min_amount"
                      type="number"
                      value={editingRule.min_amount || ""}
                      onChange={(e) => setEditingRule({ ...editingRule, min_amount: e.target.value ? Number(e.target.value) : null })}
                      placeholder="No minimum"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_amount">Max Amount (₹)</Label>
                    <Input
                      id="max_amount"
                      type="number"
                      value={editingRule.max_amount || ""}
                      onChange={(e) => setEditingRule({ ...editingRule, max_amount: e.target.value ? Number(e.target.value) : null })}
                      placeholder="No maximum"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_discount">Min Discount %</Label>
                    <Input
                      id="min_discount"
                      type="number"
                      value={editingRule.min_discount_percent || ""}
                      onChange={(e) => setEditingRule({ ...editingRule, min_discount_percent: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g., 20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={editingRule.priority || 100}
                      onChange={(e) => setEditingRule({ ...editingRule, priority: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client_type">Client Type</Label>
                    <Input
                      id="client_type"
                      value={editingRule.client_type || ""}
                      onChange={(e) => setEditingRule({ ...editingRule, client_type: e.target.value })}
                      placeholder="e.g., Government"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plan_type">Plan Type</Label>
                    <Input
                      id="plan_type"
                      value={editingRule.plan_type || ""}
                      onChange={(e) => setEditingRule({ ...editingRule, plan_type: e.target.value })}
                      placeholder="e.g., Quotation"
                    />
                  </div>
                </div>
              </div>

              {/* Required Levels */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Required Approval Levels</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sales">Sales Approval</Label>
                    <Switch
                      id="sales"
                      checked={editingRule.require_sales_approval}
                      onCheckedChange={(checked) => setEditingRule({ ...editingRule, require_sales_approval: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="finance">Finance Approval</Label>
                    <Switch
                      id="finance"
                      checked={editingRule.require_finance_approval}
                      onCheckedChange={(checked) => setEditingRule({ ...editingRule, require_finance_approval: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="operations">Operations Approval</Label>
                    <Switch
                      id="operations"
                      checked={editingRule.require_operations_approval}
                      onCheckedChange={(checked) => setEditingRule({ ...editingRule, require_operations_approval: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="director">Director Approval</Label>
                    <Switch
                      id="director"
                      checked={editingRule.require_director_approval}
                      onCheckedChange={(checked) => setEditingRule({ ...editingRule, require_director_approval: checked })}
                    />
                  </div>
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center justify-between border-t pt-4">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={editingRule.is_active}
                  onCheckedChange={(checked) => setEditingRule({ ...editingRule, is_active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveRule} disabled={saving}>
                {saving ? "Saving..." : "Save Rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule Name</TableHead>
              <TableHead>Amount Range</TableHead>
              <TableHead>Min Discount</TableHead>
              <TableHead>Required Levels</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No approval rules configured. Create your first rule to get started.
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{rule.name}</div>
                      {rule.description && (
                        <div className="text-sm text-muted-foreground">{rule.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {rule.min_amount && <div>Min: {formatAmount(rule.min_amount)}</div>}
                      {rule.max_amount && <div>Max: {formatAmount(rule.max_amount)}</div>}
                      {!rule.min_amount && !rule.max_amount && "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {rule.min_discount_percent ? `${rule.min_discount_percent}%` : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{getRequiredLevels(rule)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{rule.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => handleToggleActive(rule)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRule(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
