import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, MapPin } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { getStatusColor } from "@/utils/mediaAssets";
import { toast } from "@/hooks/use-toast";

export default function VacantMediaReport() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    totalVacant: 0,
    avgCardRate: 0,
    totalValue: 0,
  });

  useEffect(() => {
    fetchVacantAssets();
  }, []);

  const fetchVacantAssets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('media_assets')
      .select('*')
      .eq('status', 'Available')
      .order('city', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch vacant media",
        variant: "destructive",
      });
    } else {
      const vacantAssets = data || [];
      const totalValue = vacantAssets.reduce((sum, asset) => sum + Number(asset.card_rate || 0), 0);
      const avgRate = vacantAssets.length > 0 ? totalValue / vacantAssets.length : 0;

      setAssets(vacantAssets);
      setStats({
        totalVacant: vacantAssets.length,
        avgCardRate: avgRate,
        totalValue,
      });
    }
    setLoading(false);
  };

  const filteredAssets = assets.filter(asset => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      asset.id?.toLowerCase().includes(term) ||
      asset.location?.toLowerCase().includes(term) ||
      asset.city?.toLowerCase().includes(term) ||
      asset.media_type?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Vacant Media Report</h1>
          <p className="text-muted-foreground mt-1">
            Available inventory across all locations
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Vacant</div>
              <div className="text-3xl font-bold mt-2">{stats.totalVacant}</div>
              <div className="text-xs text-muted-foreground mt-1">Assets available</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Average Card Rate</div>
              <div className="text-3xl font-bold mt-2">{formatCurrency(stats.avgCardRate)}</div>
              <div className="text-xs text-muted-foreground mt-1">Per month</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Potential Value</div>
              <div className="text-3xl font-bold mt-2">{formatCurrency(stats.totalValue)}</div>
              <div className="text-xs text-muted-foreground mt-1">Monthly revenue potential</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, type, city, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset ID</TableHead>
                <TableHead>Media Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Dimensions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Card Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No vacant assets found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.id}</TableCell>
                    <TableCell>{asset.media_type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {asset.location}
                      </div>
                    </TableCell>
                    <TableCell>{asset.city}</TableCell>
                    <TableCell>{asset.dimensions}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(asset.status)}>
                        {asset.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(asset.card_rate)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
