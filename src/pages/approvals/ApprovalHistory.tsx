import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Clock, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface ApprovalRecord {
  id: string;
  plan_id: string;
  approval_level: string;
  required_role: string;
  status: string;
  approver_id: string | null;
  approved_at: string | null;
  comments: string | null;
  created_at: string;
  plans: {
    id: string;
    plan_name: string;
    client_name: string;
    grand_total: number;
  };
}

export default function ApprovalHistory() {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [filteredApprovals, setFilteredApprovals] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  
  const { company } = useCompany();

  useEffect(() => {
    if (company) {
      fetchApprovalHistory();
    }
  }, [company]);

  useEffect(() => {
    applyFilters();
  }, [approvals, searchQuery, statusFilter, levelFilter]);

  const fetchApprovalHistory = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("plan_approvals")
        .select(`
          *,
          plans (
            id,
            plan_name,
            client_name,
            grand_total
          )
        `)
        .in("status", ["approved", "rejected"])
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      setApprovals(data as any || []);
    } catch (error) {
      console.error("Error fetching approval history:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...approvals];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        a =>
          a.plans.plan_name?.toLowerCase().includes(query) ||
          a.plans.id?.toLowerCase().includes(query) ||
          a.plans.client_name?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    // Level filter
    if (levelFilter !== "all") {
      filtered = filtered.filter(a => a.required_role === levelFilter);
    }

    setFilteredApprovals(filtered);
  };

  const getStatusBadge = (status: string) => {
    if (status === "approved") {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    }
    if (status === "rejected") {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approval History</h1>
        <p className="text-muted-foreground mt-1">
          View past approval decisions and timeline
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by plan, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-48">
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Level" />
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
        </div>
      </Card>

      {/* History Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date/Time</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApprovals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No approval history found
                </TableCell>
              </TableRow>
            ) : (
              filteredApprovals.map((approval) => (
                <TableRow key={approval.id}>
                  <TableCell>
                    <div className="text-sm">
                      <div>{new Date(approval.approved_at || approval.created_at).toLocaleDateString()}</div>
                      <div className="text-muted-foreground">
                        {formatDistanceToNow(new Date(approval.approved_at || approval.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{approval.plans.plan_name}</div>
                      <div className="text-sm text-muted-foreground">{approval.plans.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>{approval.plans.client_name}</TableCell>
                  <TableCell>{getLevelBadge(approval.required_role)}</TableCell>
                  <TableCell>{getStatusBadge(approval.status)}</TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate text-sm text-muted-foreground">
                      {approval.comments || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/admin/plans/${approval.plan_id}`}>
                      <Button variant="ghost" size="sm">
                        View Plan
                      </Button>
                    </Link>
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
