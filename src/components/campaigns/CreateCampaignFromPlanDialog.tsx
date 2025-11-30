import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { FileText, Search, Rocket } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { formatDate } from "@/utils/plans";
import { getPlanStatusConfig } from "@/utils/statusBadges";
import { generateCampaignCode } from "@/lib/codeGenerator";

interface CreateCampaignFromPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateCampaignFromPlanDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCampaignFromPlanDialogProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchApprovedPlans();
    }
  }, [open]);

  const fetchApprovedPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("status", "Approved")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch approved plans",
        variant: "destructive",
      });
    } else {
      setPlans(data || []);
    }
    setLoading(false);
  };

  const handleConvertToCampaign = async (plan: any) => {
    setConverting(true);

    try {
      // Call the Edge Function to handle conversion with asset booking
      const { data, error } = await supabase.functions.invoke('convert-plan-to-campaign', {
        body: { plan_id: plan.id }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to convert plan');
      }

      toast({
        title: "Success",
        description: `Campaign ${data.campaign_code} created successfully`,
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error converting plan to campaign:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to convert plan to campaign",
        variant: "destructive",
      });
    } finally {
      setConverting(false);
    }
  };

  const filteredPlans = plans.filter((plan) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      plan.id?.toLowerCase().includes(term) ||
      plan.plan_name?.toLowerCase().includes(term) ||
      plan.client_name?.toLowerCase().includes(term)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Campaign from Plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Plan ID, name, or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Plans Table */}
          <div className="flex-1 overflow-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan ID</TableHead>
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-muted-foreground">Loading plans...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-12 w-12 text-muted-foreground/50" />
                        <p className="text-muted-foreground font-medium">No approved plans found</p>
                        <p className="text-sm text-muted-foreground">
                          {searchTerm
                            ? "Try adjusting your search criteria"
                            : "Approved plans ready for conversion will appear here"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.id}</TableCell>
                      <TableCell>{plan.plan_name}</TableCell>
                      <TableCell>{plan.client_name}</TableCell>
                      <TableCell>
                        {formatDate(plan.start_date)} - {formatDate(plan.end_date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPlanStatusConfig(plan.status).className}>
                          {getPlanStatusConfig(plan.status).label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(plan.grand_total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleConvertToCampaign(plan)}
                          disabled={converting}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Rocket className="h-4 w-4 mr-1" />
                          Convert
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
