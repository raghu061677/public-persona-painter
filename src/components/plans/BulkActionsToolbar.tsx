import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { 
  Trash2, 
  Download, 
  CheckCircle2, 
  XCircle,
  Loader2,
  MoreHorizontal
} from "lucide-react";
import * as XLSX from 'xlsx';

interface BulkActionsToolbarProps {
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onRefresh: () => void;
  allPlans: any[];
}

export function BulkActionsToolbar({
  selectedIds,
  onClearSelection,
  onRefresh,
  allPlans,
}: BulkActionsToolbarProps) {
  const [loading, setLoading] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  const selectedPlans = allPlans.filter(plan => selectedIds.has(plan.id));
  const selectedCount = selectedIds.size;

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCount} plan(s)? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      // Delete plan items first
      const { error: itemsError } = await supabase
        .from('plan_items')
        .delete()
        .in('plan_id', Array.from(selectedIds));

      if (itemsError) throw itemsError;

      // Then delete plans
      const { error: plansError } = await supabase
        .from('plans')
        .delete()
        .in('id', Array.from(selectedIds));

      if (plansError) throw plansError;

      toast({
        title: "Success",
        description: `${selectedCount} plan(s) deleted successfully`,
      });

      onClearSelection();
      onRefresh();
    } catch (error: any) {
      console.error("Error deleting plans:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusUpdate = async (newStatus: "Draft" | "Sent" | "Approved" | "Rejected" | "Converted") => {
    setStatusUpdateLoading(true);
    try {
      const { error } = await supabase
        .from('plans')
        .update({ status: newStatus as any })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedCount} plan(s) updated to ${newStatus}`,
      });

      onClearSelection();
      onRefresh();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleBulkExport = () => {
    try {
      const exportData = selectedPlans.map(plan => ({
        'Plan ID': plan.id,
        'Client Name': plan.client_name,
        'Plan Name': plan.plan_name,
        'Type': plan.plan_type,
        'Status': plan.status,
        'Start Date': plan.start_date,
        'End Date': plan.end_date,
        'Duration (Days)': plan.duration_days,
        'Total Amount': plan.total_amount,
        'GST Amount': plan.gst_amount,
        'Grand Total': plan.grand_total,
        'Created At': new Date(plan.created_at).toLocaleDateString(),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Plans');

      // Auto-size columns
      const maxWidth = 20;
      const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.min(maxWidth, Math.max(key.length, 10))
      }));
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `plans_export_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: "Success",
        description: `${selectedCount} plan(s) exported successfully`,
      });
    } catch (error: any) {
      console.error("Error exporting plans:", error);
      toast({
        title: "Error",
        description: "Failed to export plans",
        variant: "destructive",
      });
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-medium">
          {selectedCount} plan{selectedCount !== 1 ? 's' : ''} selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Select onValueChange={handleBulkStatusUpdate} disabled={statusUpdateLoading}>
          <SelectTrigger className="h-9 bg-primary-foreground text-primary hover:bg-primary-foreground/90">
            <SelectValue placeholder="Update Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Converted">Converted</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleBulkExport}
          disabled={loading}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleBulkDelete} disabled={loading} className="text-destructive">
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Selected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/10"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>
    </div>
  );
}