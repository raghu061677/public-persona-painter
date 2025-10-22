import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AssetDetails } from "@/components/media-assets/asset-details";

export default function MediaAssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchAsset();
  }, [id]);

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

  const fetchAsset = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('media_assets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      toast({
        title: "Error",
        description: "Failed to fetch asset details",
        variant: "destructive",
      });
      navigate('/admin/media-assets');
    } else {
      setAsset(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading asset details...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Asset not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <AssetDetails asset={asset} isAdmin={isAdmin} />
    </div>
  );
}
