import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Filter, MapPin, FileSpreadsheet, FileText, Presentation } from "lucide-react";
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
import { generateVacantMediaExcel } from "@/lib/reports/generateVacantMediaExcel";
import { generateVacantMediaPPT } from "@/lib/reports/generateVacantMediaPPT";
import { generateVacantMediaPDF } from "@/lib/reports/generateVacantMediaPDF";
import { addDays, addWeeks, startOfDay } from "date-fns";

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
  next_available_from?: string;
  direction?: string;
  illumination_type?: string;
  primary_photo_url?: string;
  latitude?: number;
  longitude?: number;
  qr_code_url?: string;
}

export function VacantMediaReport() {
  const [assets, setAssets] = useState<VacantAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<VacantAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedMediaType, setSelectedMediaType] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [cities, setCities] = useState<string[]>([]);
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadVacantAssets();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedCity, selectedMediaType, dateFilter, assets]);

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

    // Date filters
    const today = startOfDay(new Date());
    if (dateFilter === "next-week") {
      const nextWeek = addWeeks(today, 1);
      filtered = filtered.filter((a) => {
        const availableFrom = a.next_available_from ? new Date(a.next_available_from) : today;
        return availableFrom <= nextWeek;
      });
    } else if (dateFilter === "next-15-days") {
      const next15Days = addDays(today, 15);
      filtered = filtered.filter((a) => {
        const availableFrom = a.next_available_from ? new Date(a.next_available_from) : today;
        return availableFrom <= next15Days;
      });
    }

    setFilteredAssets(filtered);
  };

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case "next-week":
        return "Next Week";
      case "next-15-days":
        return "Next 15 Days";
      default:
        return "All Available";
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await generateVacantMediaExcel(filteredAssets, getDateFilterLabel());
      toast({
        title: "Success",
        description: "Excel report exported successfully",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: "Failed to export Excel",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPPT = async () => {
    setExporting(true);
    try {
      await generateVacantMediaPPT(filteredAssets, getDateFilterLabel());
      toast({
        title: "Success",
        description: "PowerPoint presentation exported successfully",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: "Failed to export PPT",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await generateVacantMediaPDF(filteredAssets, getDateFilterLabel());
      toast({
        title: "Success",
        description: "PDF report exported successfully",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
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
          <CardTitle>Vacant Media Inventory</CardTitle>
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
            <div className="w-full overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden border border-border/50 rounded-lg">
                  <Table className="min-w-max w-full table-auto whitespace-nowrap">
                    <TableHeader className="bg-muted sticky top-0 z-20">
                      <TableRow>
                        <TableHead className="sticky left-0 z-30 bg-muted px-4 py-3 text-left font-semibold border-r">Asset ID</TableHead>
                        <TableHead className="px-4 py-3 text-left font-semibold">City</TableHead>
                        <TableHead className="px-4 py-3 text-left font-semibold">Area</TableHead>
                        <TableHead className="px-4 py-3 text-left font-semibold">Location</TableHead>
                        <TableHead className="px-4 py-3 text-left font-semibold">Type</TableHead>
                        <TableHead className="px-4 py-3 text-left font-semibold">Size</TableHead>
                        <TableHead className="px-4 py-3 text-right font-semibold">Sq.Ft</TableHead>
                        <TableHead className="px-4 py-3 text-right font-semibold">Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAssets.map((asset, index) => (
                        <TableRow 
                          key={asset.id}
                          className={`transition-all duration-150 hover:bg-muted/80 ${
                            index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                          }`}
                        >
                          <TableCell className="sticky left-0 z-10 bg-inherit px-4 py-3 font-mono text-sm border-r">{asset.id}</TableCell>
                          <TableCell className="px-4 py-3">{asset.city}</TableCell>
                          <TableCell className="px-4 py-3">{asset.area}</TableCell>
                          <TableCell className="px-4 py-3 max-w-[200px] truncate">{asset.location}</TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge variant="outline">{asset.media_type}</Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3">{asset.dimensions}</TableCell>
                          <TableCell className="px-4 py-3 text-right">{asset.total_sqft || "-"}</TableCell>
                          <TableCell className="px-4 py-3 text-right font-medium">
                            ₹{asset.card_rate.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
