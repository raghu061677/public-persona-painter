import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DeleteClientDialogProps {
  client: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientDeleted: () => void;
}

interface RelatedRecords {
  plans: number;
  campaigns: number;
  estimations: number;
  invoices: number;
}

export function DeleteClientDialog({ 
  client, 
  open, 
  onOpenChange,
  onClientDeleted 
}: DeleteClientDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [relatedRecords, setRelatedRecords] = useState<RelatedRecords>({
    plans: 0,
    campaigns: 0,
    estimations: 0,
    invoices: 0,
  });

  useEffect(() => {
    if (open && client) {
      checkRelatedRecords();
    }
  }, [open, client]);

  const checkRelatedRecords = async () => {
    if (!client?.id) return;

    setChecking(true);
    try {
      // Check for related plans
      const { count: plansCount } = await supabase
        .from('plans')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id);

      // Check for related campaigns
      const { count: campaignsCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id);

      // Check for related estimations
      const { count: estimationsCount } = await supabase
        .from('estimations')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id);

      // Check for related invoices
      const { count: invoicesCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id);

      setRelatedRecords({
        plans: plansCount || 0,
        campaigns: campaignsCount || 0,
        estimations: estimationsCount || 0,
        invoices: invoicesCount || 0,
      });
    } catch (error) {
      console.error("Error checking related records:", error);
    } finally {
      setChecking(false);
    }
  };

  const handleDelete = async () => {
    if (!client?.id) return;

    setDeleting(true);

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Client deleted successfully",
      });

      onOpenChange(false);
      onClientDeleted();
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete client. There may be related records.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const hasRelatedRecords = Object.values(relatedRecords).some(count => count > 0);
  const totalRelated = Object.values(relatedRecords).reduce((sum, count) => sum + count, 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Client
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{client?.name}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {checking ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Checking related records...</span>
            </div>
          ) : hasRelatedRecords ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning: Related Records Found</AlertTitle>
              <AlertDescription>
                <p className="mb-2">This client has {totalRelated} related record(s):</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {relatedRecords.plans > 0 && (
                    <li>{relatedRecords.plans} Plan(s)</li>
                  )}
                  {relatedRecords.campaigns > 0 && (
                    <li>{relatedRecords.campaigns} Campaign(s)</li>
                  )}
                  {relatedRecords.estimations > 0 && (
                    <li>{relatedRecords.estimations} Estimation(s)</li>
                  )}
                  {relatedRecords.invoices > 0 && (
                    <li>{relatedRecords.invoices} Invoice(s)</li>
                  )}
                </ul>
                <p className="mt-2 font-medium">
                  Deleting this client may cause data integrity issues. Consider archiving instead of deleting.
                </p>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertDescription>
                This client has no related records and can be safely deleted.
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-muted-foreground">
            <p><strong>Client ID:</strong> {client?.id}</p>
            <p><strong>Company:</strong> {client?.company || 'N/A'}</p>
            <p><strong>Email:</strong> {client?.email || 'N/A'}</p>
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>Note:</strong> This action cannot be undone. All client data and audit logs will be permanently deleted.
            </AlertDescription>
          </Alert>
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || checking}
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Delete Client
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
