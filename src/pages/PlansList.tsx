import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Eye, Trash2, MoreVertical, Share2, Copy, Ban, Activity, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/utils/mediaAssets";
import { getPlanStatusColor, formatDate } from "@/utils/plans";
import { toast } from "@/hooks/use-toast";

export default function PlansList() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchPlans();
    
    const channel = supabase
      .channel('plans-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plans'
        },
        () => {
          fetchPlans();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsAdmin(data?.role === 'admin');
    }
  };

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch plans",
        variant: "destructive",
      });
    } else {
      setPlans(data || []);
    }
    setLoading(false);
  };

  const filteredPlans = plans.filter(plan => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      plan.id?.toLowerCase().includes(term) ||
      plan.client_name?.toLowerCase().includes(term) ||
      plan.plan_name?.toLowerCase().includes(term)
    );
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;

    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete plan",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Plan deleted successfully",
      });
      fetchPlans();
    }
  };

  const handleShare = async (plan: any) => {
    let shareToken = plan.share_token;
    
    if (!shareToken) {
      const { data } = await supabase.rpc('generate_share_token');
      shareToken = data;
      
      await supabase
        .from('plans')
        .update({ share_token: shareToken })
        .eq('id', plan.id);
    }

    const shareUrl = `${window.location.origin}/admin/plans/${plan.id}/share/${shareToken}`;
    await navigator.clipboard.writeText(shareUrl);
    
    toast({
      title: "Public Link Copied",
      description: "Share link copied to clipboard",
    });
  };

  const handleCopy = async (id: string) => {
    await navigator.clipboard.writeText(id);
    toast({
      title: "Copied",
      description: "Plan ID copied to clipboard",
    });
  };

  const handleBlock = async (id: string) => {
    const { error } = await supabase
      .from('plans')
      .update({ status: 'Rejected' })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject plan",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Plan rejected successfully",
      });
      fetchPlans();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Plans & Quotations</h1>
            <p className="text-muted-foreground mt-1">
              Manage client proposals and quotations
            </p>
          </div>
          {isAdmin && (
            <Button
              onClick={() => navigate('/admin/plans/new')}
              variant="gradient"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Plan
            </Button>
          )}
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, client name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan ID</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Plan Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Grand Total</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredPlans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No plans found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.id}</TableCell>
                    <TableCell>{plan.client_name}</TableCell>
                    <TableCell>{plan.plan_type}</TableCell>
                    <TableCell>
                      <Badge className={getPlanStatusColor(plan.status)}>
                        {plan.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{plan.duration_days} days</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(plan.grand_total)}
                    </TableCell>
                    <TableCell>{formatDate(plan.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/admin/plans/${plan.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {isAdmin && (
                              <>
                                <DropdownMenuItem onClick={() => handleDelete(plan.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleBlock(plan.id)}>
                                  <Ban className="mr-2 h-4 w-4" />
                                  Reject
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => handleCopy(plan.id)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy ID
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleShare(plan)}>
                              <Share2 className="mr-2 h-4 w-4" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleShare(plan)}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Public Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/admin/plans/${plan.id}`)}>
                              <Activity className="mr-2 h-4 w-4" />
                              Activity
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
