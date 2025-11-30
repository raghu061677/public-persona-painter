import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Eye, Clock, IndianRupee, User, Building2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface PendingApproval {
  id: string;
  plan_id: string;
  approval_level: string;
  required_role: string;
  status: string;
  created_at: string;
  plans: {
    id: string;
    plan_name: string;
    client_name: string;
    grand_total: number;
    plan_type: string;
    created_by: string;
    start_date: string;
    end_date: string;
  };
}

export default function ApprovalsQueue() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [filteredApprovals, setFilteredApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [comments, setComments] = useState("");
  const [processingAction, setProcessingAction] = useState(false);
  
  // Filters
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [valueFilter, setValueFilter] = useState<string>("all");
  
  const { user } = useAuth();
  const { company } = useCompany();
  const { toast } = useToast();

  useEffect(() => {
    if (user && company) {
      fetchPendingApprovals();
    }
  }, [user, company]);

  useEffect(() => {
    applyFilters();
  }, [approvals, levelFilter, valueFilter]);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      
      // Get user's roles
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id);

      if (!userRoles || userRoles.length === 0) {
        setApprovals([]);
        return;
      }

      const roles = userRoles.map(ur => ur.role);

      // Fetch pending approvals that match user's roles
      const { data, error } = await supabase
        .from("plan_approvals")
        .select(`
          *,
          plans (
            id,
            plan_name,
            client_name,
            grand_total,
            plan_type,
            created_by,
            start_date,
            end_date
          )
        `)
        .eq("status", "pending")
        .in("required_role", roles)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setApprovals(data as any || []);
    } catch (error: any) {
      console.error("Error fetching approvals:", error);
      toast({
        title: "Error",
        description: "Failed to fetch pending approvals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...approvals];

    if (levelFilter !== "all") {
      filtered = filtered.filter(a => a.required_role === levelFilter);
    }

    if (valueFilter !== "all") {
      filtered = filtered.filter(a => {
        const total = a.plans.grand_total;
        if (valueFilter === "low") return total < 100000;
        if (valueFilter === "medium") return total >= 100000 && total <= 500000;
        if (valueFilter === "high") return total > 500000;
        return true;
      });
    }

    setFilteredApprovals(filtered);
  };

  const handleReview = (approval: PendingApproval) => {
    setSelectedApproval(approval);
    setComments("");
    setDrawerOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedApproval) return;
    
    try {
      setProcessingAction(true);
      
      const { error } = await supabase
        .from("plan_approvals")
        .update({
          status: "approved",
          approver_id: user?.id,
          approved_at: new Date().toISOString(),
          comments: comments || null,
        })
        .eq("id", selectedApproval.id);

      if (error) throw error;

      toast({
        title: "Approved",
        description: "Plan approval successfully processed",
      });

      setDrawerOpen(false);
      fetchPendingApprovals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve plan",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval || !comments.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setProcessingAction(true);
      
      const { error } = await supabase
        .from("plan_approvals")
        .update({
          status: "rejected",
          approver_id: user?.id,
          approved_at: new Date().toISOString(),
          comments: comments,
        })
        .eq("id", selectedApproval.id);

      if (error) throw error;

      toast({
        title: "Rejected",
        description: "Plan approval rejected",
      });

      setDrawerOpen(false);
      fetchPendingApprovals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject plan",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getLevelBadge = (role: string) => {
    const badges: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      sales: { label: "L1 Sales", variant: "default" },
      finance: { label: "L2 Finance", variant: "secondary" },
      operations: { label: "L2 Operations", variant: "secondary" },
      admin: { label: "Director", variant: "outline" },
    };
    
    const badge = badges[role] || { label: role, variant: "default" };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
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
          <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve pending plans
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {filteredApprovals.length} Pending
        </Badge>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="sales">L1 Sales</SelectItem>
                <SelectItem value="finance">L2 Finance</SelectItem>
                <SelectItem value="operations">L2 Operations</SelectItem>
                <SelectItem value="admin">Director</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={valueFilter} onValueChange={setValueFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Value" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Values</SelectItem>
                <SelectItem value="low">&lt; ₹1L</SelectItem>
                <SelectItem value="medium">₹1L - ₹5L</SelectItem>
                <SelectItem value="high">&gt; ₹5L</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Approvals Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Pending Since</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApprovals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No pending approvals found
                </TableCell>
              </TableRow>
            ) : (
              filteredApprovals.map((approval) => (
                <TableRow key={approval.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{approval.plans.plan_name}</div>
                      <div className="text-sm text-muted-foreground">{approval.plans.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>{approval.plans.client_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <IndianRupee className="h-4 w-4" />
                      {formatCurrency(approval.plans.grand_total)}
                    </div>
                  </TableCell>
                  <TableCell>{getLevelBadge(approval.required_role)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReview(approval)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Approval Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Approval Review</SheetTitle>
            <SheetDescription>
              Review plan details and take approval action
            </SheetDescription>
          </SheetHeader>

          {selectedApproval && (
            <div className="mt-6 space-y-6">
              {/* Plan Summary */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Plan Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan Name:</span>
                    <span className="font-medium">{selectedApproval.plans.plan_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan Code:</span>
                    <span className="font-mono">{selectedApproval.plans.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client:</span>
                    <span className="font-medium">{selectedApproval.plans.client_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant="outline">{selectedApproval.plans.plan_type}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>
                      {new Date(selectedApproval.plans.start_date).toLocaleDateString()} - {new Date(selectedApproval.plans.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-muted-foreground font-medium">Total Amount:</span>
                    <span className="text-lg font-bold">{formatCurrency(selectedApproval.plans.grand_total)}</span>
                  </div>
                </div>
              </Card>

              {/* Approval Level */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Approval Level</h3>
                <div className="flex items-center gap-2">
                  {getLevelBadge(selectedApproval.required_role)}
                  <span className="text-sm text-muted-foreground">
                    Level {selectedApproval.approval_level}
                  </span>
                </div>
              </Card>

              {/* Comments */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Comments {selectedApproval && <span className="text-muted-foreground">(Required for rejection)</span>}
                </label>
                <Textarea
                  placeholder="Add your comments here..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleApprove}
                  disabled={processingAction}
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={processingAction}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>

              {/* View Full Plan Link */}
              <div className="pt-2 border-t">
                <Link to={`/admin/plans/${selectedApproval.plan_id}`}>
                  <Button variant="outline" className="w-full">
                    View Full Plan Details
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
