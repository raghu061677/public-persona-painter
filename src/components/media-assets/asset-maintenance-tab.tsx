import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Wrench } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface AssetMaintenanceTabProps {
  assetId: string;
  isAdmin?: boolean;
}

export function AssetMaintenanceTab({ assetId, isAdmin }: AssetMaintenanceTabProps) {
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaintenance();
  }, [assetId]);

  const fetchMaintenance = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('asset_maintenance')
      .select('*')
      .eq('asset_id', assetId)
      .order('maintenance_date', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch maintenance records",
        variant: "destructive",
      });
    } else {
      setMaintenance(data || []);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'In Progress':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'Scheduled':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getMaintenanceTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Repair': 'bg-red-100 text-red-800 border-red-200',
      'Cleaning': 'bg-blue-100 text-blue-800 border-blue-200',
      'Painting': 'bg-purple-100 text-purple-800 border-purple-200',
      'Electrical': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Structural': 'bg-orange-100 text-orange-800 border-orange-200',
      'Other': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[type] || colors['Other'];
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading maintenance records...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Maintenance History</h3>
        {isAdmin && (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Maintenance
          </Button>
        )}
      </div>

      {maintenance.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No maintenance records yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {maintenance.map((record) => (
            <Card key={record.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">
                        {format(new Date(record.maintenance_date), 'dd MMM yyyy')}
                      </CardTitle>
                      <Badge className={getMaintenanceTypeColor(record.maintenance_type)} variant="outline">
                        {record.maintenance_type}
                      </Badge>
                    </div>
                    {record.description && (
                      <p className="text-sm text-muted-foreground">{record.description}</p>
                    )}
                  </div>
                  <Badge className={getStatusColor(record.status)}>
                    {record.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {record.vendor_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">Vendor</p>
                      <p className="font-medium">{record.vendor_name}</p>
                    </div>
                  )}
                  {record.cost > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Cost</p>
                      <p className="font-medium text-lg">{formatCurrency(record.cost)}</p>
                    </div>
                  )}
                </div>
                {record.notes && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm">{record.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
