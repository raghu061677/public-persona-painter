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
  const { toast } = useToast();

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
      // Update media_assets without company_id
      const { data: assets, error: assetsError } = await supabase
        .from('media_assets')
        .update({ company_id: selectedCompanyId })
        .is('company_id', null)
        .select('id');

      if (assetsError) throw assetsError;

      // Update clients without company_id
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .update({ company_id: selectedCompanyId })
        .is('company_id', null)
        .select('id');

      if (clientsError) throw clientsError;

      // Update leads without company_id
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .update({ company_id: selectedCompanyId })
        .is('company_id', null)
        .select('id');

      if (leadsError) throw leadsError;

      // Update campaigns without company_id
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .update({ company_id: selectedCompanyId })
        .is('company_id', null)
        .select('id');

      if (campaignsError) throw campaignsError;

      toast({
        title: "Migration successful",
        description: `Migrated ${assets?.length || 0} assets, ${clients?.length || 0} clients, ${leads?.length || 0} leads, and ${campaigns?.length || 0} campaigns`,
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
