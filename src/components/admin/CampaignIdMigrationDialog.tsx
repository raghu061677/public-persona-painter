import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Database, CheckCircle2, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CampaignIdMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PreviewCampaign {
  id: string;
  campaign_code: string | null;
  campaign_name: string;
  client_name: string;
  created_at: string;
}

interface MigrationResult {
  old_id: string;
  new_code: string;
  status: string;
}

export function CampaignIdMigrationDialog({ open, onOpenChange }: CampaignIdMigrationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<{ total: number; nonCanonical: PreviewCampaign[] } | null>(null);
  const [results, setResults] = useState<MigrationResult[] | null>(null);
  const { toast } = useToast();

  const handlePreview = async () => {
    setIsLoading(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke('migrate-campaign-ids', {
        body: { mode: 'preview' },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      setPreview({ total: data.total_campaigns, nonCanonical: data.campaigns });
    } catch (err: any) {
      toast({ title: "Preview failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('migrate-campaign-ids', {
        body: { mode: 'execute' },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      setResults(data.results);
      toast({
        title: "Migration complete",
        description: `${data.migrated} campaigns migrated, ${data.skipped} skipped.`,
      });
    } catch (err: any) {
      toast({ title: "Migration failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state when dialog closes
  const handleOpenChange = (o: boolean) => {
    if (!o) { setPreview(null); setResults(null); }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Migrate Campaign IDs to Canonical Format
          </DialogTitle>
          <DialogDescription>
            Convert old campaign codes (e.g. CAM-2026-February-002) to the canonical <code>CAM-YYYYMM-####</code> format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Step 1: Preview */}
          {!preview && !results && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">
                Click below to scan for campaigns with non-canonical IDs.
              </p>
              <Button onClick={handlePreview} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Scan Campaigns
              </Button>
            </div>
          )}

          {/* Preview Results */}
          {preview && !results && (
            <>
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex justify-between text-sm">
                  <span>Total campaigns: <strong>{preview.total}</strong></span>
                  <span>Non-canonical: <strong>{preview.nonCanonical.length}</strong></span>
                </div>
              </div>

              {preview.nonCanonical.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600 py-4 justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">All campaign IDs are already in canonical format!</span>
                </div>
              ) : (
                <>
                  <ScrollArea className="h-[300px] rounded border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Current Code</TableHead>
                          <TableHead>Campaign Name</TableHead>
                          <TableHead>Client</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.nonCanonical.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">
                                {c.campaign_code || c.id}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{c.campaign_name}</TableCell>
                            <TableCell className="text-sm">{c.client_name}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>

                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>This will update <strong>campaign_code</strong> only. Primary keys and references remain unchanged.</span>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleExecute} disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Migrate {preview.nonCanonical.length} Campaign(s)
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Execution Results */}
          {results && (
            <>
              <ScrollArea className="h-[300px] rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Old Code</TableHead>
                      <TableHead>New Code</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{r.old_id}</TableCell>
                        <TableCell className="font-mono text-xs">{r.new_code}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'migrated' ? 'default' : 'destructive'} className="text-xs">
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <div className="flex justify-end">
                <Button onClick={() => handleOpenChange(false)}>Done</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
