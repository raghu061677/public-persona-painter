import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Eye, EyeOff, Trash2, MapPin, Calendar, DollarSign, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface Listing {
  id: string;
  asset_id: string;
  availability_start: string;
  availability_end: string;
  rate: number;
  min_booking_days: number;
  description: string | null;
  status: string;
  views_count: number;
  inquiries_count: number;
  created_at: string;
  media_asset?: {
    id: string;
    city: string;
    area: string;
    location: string;
    media_type: string;
    dimensions: string;
    status: string;
  };
}

export default function MarketplaceListings() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Form state
  const [formAssetId, setFormAssetId] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formRate, setFormRate] = useState("");
  const [formMinDays, setFormMinDays] = useState("30");
  const [formDescription, setFormDescription] = useState("");

  useEffect(() => {
    if (company?.id) {
      fetchListings();
      fetchAvailableAssets();
    }
  }, [company?.id]);

  const fetchListings = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplace_listings")
      .select("*, media_asset:media_assets(id, city, area, location, media_type, dimensions, status)")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching listings:", error);
    } else {
      setListings((data || []) as any);
    }
    setLoading(false);
  };

  const fetchAvailableAssets = async () => {
    if (!company?.id) return;
    const { data } = await supabase
      .from("media_assets")
      .select("id, city, area, location, media_type, dimensions, card_rate")
      .eq("company_id", company.id)
      .eq("status", "Available")
      .order("city");
    setAssets(data || []);
  };

  const openCreateDialog = () => {
    setEditingListing(null);
    setFormAssetId("");
    setFormStart("");
    setFormEnd("");
    setFormRate("");
    setFormMinDays("30");
    setFormDescription("");
    setShowDialog(true);
  };

  const openEditDialog = (listing: Listing) => {
    setEditingListing(listing);
    setFormAssetId(listing.asset_id);
    setFormStart(listing.availability_start);
    setFormEnd(listing.availability_end);
    setFormRate(String(listing.rate));
    setFormMinDays(String(listing.min_booking_days));
    setFormDescription(listing.description || "");
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!company?.id || !formAssetId || !formStart || !formEnd || !formRate) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const payload = {
      company_id: company.id,
      asset_id: formAssetId,
      availability_start: formStart,
      availability_end: formEnd,
      rate: parseFloat(formRate),
      min_booking_days: parseInt(formMinDays) || 30,
      description: formDescription || null,
      status: "active" as const,
    };

    let error;
    if (editingListing) {
      ({ error } = await supabase.from("marketplace_listings").update(payload).eq("id", editingListing.id));
    } else {
      ({ error } = await supabase.from("marketplace_listings").insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: editingListing ? "Listing updated" : "Listing created" });
      setShowDialog(false);
      fetchListings();
    }
  };

  const toggleStatus = async (listing: Listing) => {
    const newStatus = listing.status === "active" ? "paused" : "active";
    const { error } = await supabase
      .from("marketplace_listings")
      .update({ status: newStatus })
      .eq("id", listing.id);

    if (!error) {
      toast({ title: "Success", description: `Listing ${newStatus}` });
      fetchListings();
    }
  };

  const deleteListing = async (id: string) => {
    const { error } = await supabase.from("marketplace_listings").delete().eq("id", id);
    if (!error) {
      toast({ title: "Deleted", description: "Listing removed" });
      fetchListings();
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "default";
      case "paused": return "secondary";
      case "booked": return "outline";
      case "expired": return "destructive";
      default: return "secondary";
    }
  };

  const filtered = statusFilter === "all" ? listings : listings.filter((l) => l.status === statusFilter);

  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        title="My Marketplace Listings"
        description="Manage your media assets listed on the OOH Exchange"
      />

      <div className="flex items-center justify-between gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchListings}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1" /> New Listing
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Listings", value: listings.length, icon: MapPin },
          { label: "Active", value: listings.filter((l) => l.status === "active").length, icon: Eye },
          { label: "Total Views", value: listings.reduce((s, l) => s + (l.views_count || 0), 0), icon: Eye },
          { label: "Inquiries", value: listings.reduce((s, l) => s + (l.inquiries_count || 0), 0), icon: Calendar },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <stat.icon className="h-4 w-4" />
                {stat.label}
              </div>
              <div className="text-2xl font-bold mt-1">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Listings Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Views</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No listings found. Create your first listing to appear on the marketplace.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">
                      <div>{listing.asset_id}</div>
                      <div className="text-xs text-muted-foreground">
                        {listing.media_asset?.media_type} • {listing.media_asset?.dimensions}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {listing.media_asset?.city}, {listing.media_asset?.area}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(listing.availability_start), "dd MMM")} –{" "}
                        {format(new Date(listing.availability_end), "dd MMM yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>₹{listing.rate?.toLocaleString("en-IN")}/mo</TableCell>
                    <TableCell>
                      <Badge variant={statusColor(listing.status) as any}>{listing.status}</Badge>
                    </TableCell>
                    <TableCell>{listing.views_count || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => toggleStatus(listing)} title={listing.status === "active" ? "Pause" : "Activate"}>
                          {listing.status === "active" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(listing)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteListing(listing.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingListing ? "Edit Listing" : "Create New Listing"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Media Asset *</Label>
              <Select value={formAssetId} onValueChange={setFormAssetId} disabled={!!editingListing}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.id} — {a.city}, {a.area} ({a.media_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Available From *</Label>
                <Input type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)} />
              </div>
              <div>
                <Label>Available Until *</Label>
                <Input type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monthly Rate (₹) *</Label>
                <Input type="number" value={formRate} onChange={(e) => setFormRate(e.target.value)} placeholder="e.g. 25000" />
              </div>
              <div>
                <Label>Min Booking Days</Label>
                <Input type="number" value={formMinDays} onChange={(e) => setFormMinDays(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional notes about this listing" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingListing ? "Update" : "Create"} Listing</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
