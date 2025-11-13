import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Split } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SharedBillExpensesButtonProps {
  billId: string;
  billAmount: number;
  sharedAssetCount?: number;
}

export function SharedBillExpensesButton({ 
  billId, 
  billAmount, 
  sharedAssetCount = 0 
}: SharedBillExpensesButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSplitExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('split-power-bill-expenses', {
        body: { bill_id: billId, action: 'create' }
      });

      if (error) throw error;

      const result = data as { success: boolean; expenses_created?: number; error?: string };

      if (result.success) {
        toast({
          title: "Success",
          description: `Generated ${result.expenses_created || 0} expense records for shared assets`,
        });
      } else {
        throw new Error(result.error || 'Failed to split expenses');
      }
    } catch (error) {
      console.error('Error splitting expenses:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to split expenses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Split className="h-4 w-4 mr-2" />
          )}
          Split Expenses
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Generate Split Expenses?</AlertDialogTitle>
          <AlertDialogDescription>
            This will create individual expense records for each asset sharing this power
            connection based on their configured percentages.
            {sharedAssetCount > 0 && (
              <div className="mt-2 p-2 bg-muted rounded-md">
                <p className="font-medium">Split Details:</p>
                <p className="text-sm">Total Bill: ₹{billAmount.toFixed(2)}</p>
                <p className="text-sm">Shared with: {sharedAssetCount} asset(s)</p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSplitExpenses}>
            Generate Expenses
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
