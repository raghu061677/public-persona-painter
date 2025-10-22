import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { 
  generatePlanId, 
  calculateDurationDays, 
  calculatePlanItemTotals,
  formatDate 
} from "@/utils/plans";
import { formatCurrency } from "@/utils/mediaAssets";
import { ArrowLeft, Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PlanNew() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [assetPricing, setAssetPricing] = useState<Record<string, any>>({});
  
  const [formData, setFormData] = useState({
    id: "",
    client_id: "",
    client_name: "",
    plan_name: "",
    plan_type: "Quotation",
    start_date: new Date(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    gst_percent: "18",
    notes: "",
  });

  useEffect(() => {
    fetchClients();
    fetchAvailableAssets();
    generateNewPlanId();
  }, []);

  const generateNewPlanId = async () => {
    const { data } = await supabase.rpc('generate_plan_id');
    if (data) {
      setFormData(prev => ({ ...prev, id: data }));
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    setClients(data || []);
  };

  const fetchAvailableAssets = async () => {
    const { data } = await supabase
      .from('media_assets')
      .select('*')
      .eq('status', 'Available')
      .order('city', { ascending: true });
    setAvailableAssets(data || []);
  };

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData(prev => ({
        ...prev,
        client_id: clientId,
        client_name: client.name,
      }));
    }
  };

  const toggleAssetSelection = (assetId: string, asset: any) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
      const newPricing = { ...assetPricing };
      delete newPricing[assetId];
      setAssetPricing(newPricing);
    } else {
      newSelected.add(assetId);
      setAssetPricing(prev => ({
        ...prev,
        [assetId]: {
          sales_price: asset.card_rate,
          printing_charges: asset.printing_charges || 0,
          mounting_charges: asset.mounting_charges || 0,
        }
      }));
    }
    setSelectedAssets(newSelected);
  };

  const updateAssetPricing = (assetId: string, field: string, value: number) => {
    setAssetPricing(prev => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        [field]: value,
      }
    }));
  };

  const calculateTotals = () => {
    let total = 0;
    selectedAssets.forEach(assetId => {
      const pricing = assetPricing[assetId];
      if (pricing) {
        const { totalWithGst } = calculatePlanItemTotals(
          pricing.sales_price,
          pricing.printing_charges,
          pricing.mounting_charges,
          parseFloat(formData.gst_percent)
        );
        total += totalWithGst;
      }
    });
    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedAssets.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one asset",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const durationDays = calculateDurationDays(formData.start_date, formData.end_date);
      const totalAmount = calculateTotals();
      const gstAmount = (totalAmount * parseFloat(formData.gst_percent)) / (100 + parseFloat(formData.gst_percent));
      const grandTotal = totalAmount;

      // Create plan
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .insert({
          id: formData.id,
          client_id: formData.client_id,
          client_name: formData.client_name,
          plan_name: formData.plan_name,
          plan_type: formData.plan_type,
          start_date: formData.start_date.toISOString().split('T')[0],
          end_date: formData.end_date.toISOString().split('T')[0],
          duration_days: durationDays,
          status: 'Draft',
          total_amount: totalAmount - gstAmount,
          gst_percent: parseFloat(formData.gst_percent),
          gst_amount: gstAmount,
          grand_total: grandTotal,
          notes: formData.notes,
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (planError) throw planError;

      // Create plan items
      const items = Array.from(selectedAssets).map(assetId => {
        const asset = availableAssets.find(a => a.id === assetId);
        const pricing = assetPricing[assetId];
        const { subtotal, gstAmount, totalWithGst } = calculatePlanItemTotals(
          pricing.sales_price,
          pricing.printing_charges,
          pricing.mounting_charges,
          parseFloat(formData.gst_percent)
        );

        return {
          plan_id: formData.id,
          asset_id: assetId,
          location: asset.location,
          city: asset.city,
          area: asset.area,
          media_type: asset.media_type,
          dimensions: asset.dimensions,
          card_rate: asset.card_rate,
          base_rent: asset.base_rent,
          sales_price: pricing.sales_price,
          printing_charges: pricing.printing_charges,
          mounting_charges: pricing.mounting_charges,
          subtotal,
          gst_amount: gstAmount,
          total_with_gst: totalWithGst,
        };
      });

      const { error: itemsError } = await supabase
        .from('plan_items')
        .insert(items as any);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Plan created successfully",
      });
      navigate(`/admin/plans/${formData.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const durationDays = calculateDurationDays(formData.start_date, formData.end_date);
  const grandTotal = calculateTotals();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/plans')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Plans
        </Button>

        <h1 className="text-3xl font-bold mb-8">Create New Plan</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Plan ID</Label>
                <Input value={formData.id} disabled />
              </div>
              <div>
                <Label>Client *</Label>
                <Select value={formData.client_id} onValueChange={handleClientSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plan Name *</Label>
                <Input
                  required
                  value={formData.plan_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, plan_name: e.target.value }))}
                  placeholder="e.g., Q1 2025 Campaign"
                />
              </div>
              <div>
                <Label>Plan Type</Label>
                <Select value={formData.plan_type} onValueChange={(v) => setFormData(prev => ({ ...prev, plan_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Quotation">Quotation</SelectItem>
                    <SelectItem value="Proposal">Proposal</SelectItem>
                    <SelectItem value="Estimate">Estimate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Period */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Period</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatDate(formData.start_date)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.start_date}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, start_date: date }))}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatDate(formData.end_date)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.end_date}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, end_date: date }))}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Duration</Label>
                <Input value={`${durationDays} days`} disabled />
              </div>
            </CardContent>
          </Card>

          {/* Asset Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Media Assets ({selectedAssets.size} selected)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {availableAssets.map((asset) => (
                  <div key={asset.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedAssets.has(asset.id)}
                        onCheckedChange={() => toggleAssetSelection(asset.id, asset)}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">{asset.id}</p>
                            <p className="text-sm text-muted-foreground">
                              {asset.location}, {asset.city}
                            </p>
                          </div>
                          <p className="text-sm">{formatCurrency(asset.card_rate)}/month</p>
                        </div>
                        
                        {selectedAssets.has(asset.id) && (
                          <div className="grid grid-cols-3 gap-3 mt-3">
                            <div>
                              <Label className="text-xs">Sales Price</Label>
                              <Input
                                type="number"
                                value={assetPricing[asset.id]?.sales_price || 0}
                                onChange={(e) => updateAssetPricing(asset.id, 'sales_price', parseFloat(e.target.value))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Printing</Label>
                              <Input
                                type="number"
                                value={assetPricing[asset.id]?.printing_charges || 0}
                                onChange={(e) => updateAssetPricing(asset.id, 'printing_charges', parseFloat(e.target.value))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Mounting</Label>
                              <Input
                                type="number"
                                value={assetPricing[asset.id]?.mounting_charges || 0}
                                onChange={(e) => updateAssetPricing(asset.id, 'mounting_charges', parseFloat(e.target.value))}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes & Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special terms or conditions..."
                  rows={3}
                />
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Grand Total (with GST):</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/plans')}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={loading}>
              {loading ? "Creating..." : "Create Plan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
