import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { MediaAssetsTable } from "@/components/media-assets/media-assets-table";
import { ImportDialog } from "@/components/media-assets/import-dialog";

export default function MediaAssetsList() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchAssets();
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

  const fetchAssets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('media_assets')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch media assets",
        variant: "destructive",
      });
    } else {
      setAssets(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Media Assets</h1>
            <p className="text-muted-foreground">Manage your complete media inventory</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <ImportDialog onImportComplete={fetchAssets} />
                <Button onClick={() => navigate('/admin/media-assets/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Asset
                </Button>
              </>
            )}
          </div>
        </div>

        <MediaAssetsTable assets={assets} onRefresh={fetchAssets} />
      </div>
    </div>
  );
}
