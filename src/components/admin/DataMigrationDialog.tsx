import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Database } from "lucide-react";

interface DataMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Array<{ id: string; name: string }>;
}

export function DataMigrationDialog({ open, onOpenChange, companies }: DataMigrationDialogProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [previewCounts, setPreviewCounts] = useState<any>(null);
  const { toast } = useToast();

  const checkUnassignedRecords = async () => {
    setIsChecking(true);
    try {
      // Using service role via edge function to check counts
      const { data, error } = await supabase.functions.invoke('check-unassigned-records');
      
      if (error) throw error;
      
      setPreviewCounts(data.counts);
    } catch (error: any) {
      console.error('Check error:', error);
      toast({
        title: "Error checking records",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Check for unassigned records when dialog opens
  if (open && !previewCounts && !isChecking) {
    checkUnassignedRecords();
  }

  const handleMigration = async () => {
    if (!selectedCompanyId) {
      toast({
        title: "Select a company",
        description: "Please select a company to migrate data to",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('migrate-company-data', {
        body: { targetCompanyId: selectedCompanyId },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Migration failed');
      }

      const { results } = data;
      const totalMigrated = 
        (results.assets || 0) + 
        (results.clients || 0) + 
        (results.leads || 0) + 
        (results.campaigns || 0) +
        (results.plans || 0);

      toast({
        title: "Migration successful",
        description: `Migrated ${totalMigrated} records: ${results.assets || 0} assets, ${results.clients || 0} clients, ${results.leads || 0} leads, ${results.campaigns || 0} campaigns, ${results.plans || 0} plans`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Migration error:', error);
      toast({
        title: "Migration failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Migrate Unassigned Data
          </DialogTitle>
          <DialogDescription>
            Assign existing media assets, clients, leads, and campaigns without a company to a specific company.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isChecking ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Checking for unassigned records...</span>
            </div>
          ) : previewCounts ? (
            <>
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <h4 className="text-sm font-medium">Records Without Company Assignment:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Media Assets: <strong>{previewCounts.assets}</strong></div>
                  <div>Clients: <strong>{previewCounts.clients}</strong></div>
                  <div>Plans: <strong>{previewCounts.plans}</strong></div>
                  <div>Campaigns: <strong>{previewCounts.campaigns}</strong></div>
                  <div>Leads: <strong>{previewCounts.leads || 0}</strong></div>
                </div>
                {(previewCounts.assets + previewCounts.clients + previewCounts.plans + previewCounts.campaigns + (previewCounts.leads || 0)) === 0 && (
                  <p className="text-sm text-green-600 mt-2">✓ All records already have company assignments!</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Company</label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleMigration} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Migrate Data
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
