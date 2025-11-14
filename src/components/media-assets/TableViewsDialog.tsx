import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Star, Trash2, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TableView {
  id: string;
  view_name: string;
  is_default: boolean;
  configuration: any;
  created_at: string;
}

interface TableViewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableKey: string;
  currentConfig: any;
  onLoadView: (config: any) => void;
}

export function TableViewsDialog({
  open,
  onOpenChange,
  tableKey,
  currentConfig,
  onLoadView,
}: TableViewsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [views, setViews] = useState<TableView[]>([]);
  const [newViewName, setNewViewName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadViews();
    }
  }, [open, tableKey]);

  const loadViews = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("table_views")
        .select("*")
        .eq("table_key", tableKey)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setViews(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load saved views",
        variant: "destructive",
      });
    }
  };

  const handleSaveView = async () => {
    if (!newViewName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a view name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("table_views").insert({
        user_id: user.id,
        table_key: tableKey,
        view_name: newViewName,
        configuration: currentConfig,
        is_default: views.length === 0, // First view is default
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `View "${newViewName}" saved successfully`,
      });

      setNewViewName("");
      loadViews();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save view",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadView = async (view: TableView) => {
    onLoadView(view.configuration);
    toast({
      title: "View Loaded",
      description: `Applied "${view.view_name}" configuration`,
    });
    onOpenChange(false);
  };

  const handleSetDefault = async (viewId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Unset all defaults
      await supabase
        .from("table_views")
        .update({ is_default: false })
        .eq("table_key", tableKey)
        .eq("user_id", user.id);

      // Set new default
      const { error } = await supabase
        .from("table_views")
        .update({ is_default: true })
        .eq("id", viewId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Default view updated",
      });

      loadViews();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to set default view",
        variant: "destructive",
      });
    }
  };

  const handleDeleteView = async (viewId: string) => {
    try {
      const { error } = await supabase
        .from("table_views")
        .delete()
        .eq("id", viewId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "View deleted successfully",
      });

      loadViews();
      setDeleteConfirm(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete view",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Table Views</DialogTitle>
            <DialogDescription>
              Save and load custom table configurations including column order, visibility, widths, and sorting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Save New View */}
            <div className="space-y-2">
              <Label>Save Current View</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter view name..."
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveView();
                  }}
                />
                <Button onClick={handleSaveView} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Saved Views List */}
            <div className="space-y-2">
              <Label>Saved Views ({views.length})</Label>
              <ScrollArea className="h-[300px] border rounded-md">
                <div className="p-4 space-y-2">
                  {views.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No saved views yet. Save your current configuration above.
                    </p>
                  ) : (
                    views.map((view) => (
                      <div
                        key={view.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {view.is_default && (
                            <Star className="h-4 w-4 fill-primary text-primary" />
                          )}
                          <div>
                            <p className="font-medium">{view.view_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(view.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleLoadView(view)}
                            title="Load this view"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSetDefault(view.id)}
                            disabled={view.is_default}
                            title="Set as default"
                          >
                            <Star className={view.is_default ? "h-4 w-4 fill-primary text-primary" : "h-4 w-4"} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteConfirm(view.id)}
                            title="Delete view"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete View?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The saved view will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDeleteView(deleteConfirm)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
