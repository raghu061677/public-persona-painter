import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Filter, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface VacantAsset {
  id: string;
  city: string;
  area: string;
  location: string;
  media_type: string;
  dimensions: string;
  card_rate: number;
  total_sqft: number | null;
  status: string;
}

export function VacantMediaReport() {
  const [assets, setAssets] = useState<VacantAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<VacantAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedMediaType, setSelectedMediaType] = useState<string>("all");
  const [cities, setCities] = useState<string[]>([]);
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadVacantAssets();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedCity, selectedMediaType, assets]);

  const loadVacantAssets = async () => {
    try {
      const { data, error } = await supabase
        .from("media_assets")
        .select("*")
        .eq("status", "Available")
        .order("city")
        .order("area");

      if (error) throw error;

      setAssets(data || []);
      setFilteredAssets(data || []);

      // Extract unique cities and media types
      const uniqueCities = [...new Set(data?.map((a) => a.city) || [])];
      const uniqueMediaTypes = [...new Set(data?.map((a) => a.media_type) || [])];
      setCities(uniqueCities);
      setMediaTypes(uniqueMediaTypes);
    } catch (error) {
      console.error("Error loading vacant assets:", error);
      toast({
        title: "Error",
        description: "Failed to load vacant media",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...assets];

    if (selectedCity !== "all") {
      filtered = filtered.filter((a) => a.city === selectedCity);
    }

    if (selectedMediaType !== "all") {
      filtered = filtered.filter((a) => a.media_type === selectedMediaType);
    }

    setFilteredAssets(filtered);
  };

  const exportToCSV = () => {
    const headers = ["Asset ID", "City", "Area", "Location", "Media Type", "Dimensions", "Sq.Ft", "Rate"];
    const rows = filteredAssets.map((a) => [
      a.id,
      a.city,
      a.area,
      a.location,
      a.media_type,
      a.dimensions,
      a.total_sqft || 0,
      a.card_rate,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vacant-media-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast({
      title: "Success",
      description: "Report exported successfully",
    });
  };

  const totalValue = filteredAssets.reduce((sum, a) => sum + a.card_rate, 0);
  const totalSqft = filteredAssets.reduce((sum, a) => sum + (a.total_sqft || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Vacant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredAssets.length}</div>
            <p className="text-xs text-muted-foreground">Available assets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Sq.Ft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSqft.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Available space</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Potential Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Monthly rates</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vacant Media Inventory</CardTitle>
            <Button onClick={exportToCSV} size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Media Type</Label>
              <Select value={selectedMediaType} onValueChange={setSelectedMediaType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {mediaTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset ID</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Sq.Ft</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-mono text-sm">{asset.id}</TableCell>
                    <TableCell>{asset.city}</TableCell>
                    <TableCell>{asset.area}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{asset.location}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{asset.media_type}</Badge>
                    </TableCell>
                    <TableCell>{asset.dimensions}</TableCell>
                    <TableCell className="text-right">{asset.total_sqft || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{asset.card_rate.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
