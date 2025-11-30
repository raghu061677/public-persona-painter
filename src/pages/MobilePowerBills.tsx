import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  MapPin, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Search,
  Upload,
  Calendar,
  DollarSign,
  FileText
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ResponsiveCard } from "@/components/ui/responsive-card";
import { BottomActionBar, BottomActionButton } from "@/components/ui/bottom-action-bar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface PowerBill {
  id: string;
  asset_id: string;
  consumer_name: string | null;
  service_number: string | null;
  unique_service_number: string | null;
  ero: string | null;
  section_name: string | null;
  bill_month: string;
  bill_amount: number;
  paid_amount: number | null;
  payment_date: string | null;
  payment_status: 'Pending' | 'Paid' | 'Overdue';
  bill_url: string | null;
  paid: boolean;
  notes: string | null;
  created_at: string;
  media_assets?: {
    location: string;
    area: string;
    city: string;
    illumination_type: string;
  } | null;
}

export default function MobilePowerBills() {
  const navigate = useNavigate();
  const [bills, setBills] = useState<PowerBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'paid'>('all');
  const [selectedBill, setSelectedBill] = useState<PowerBill | null>(null);
  const [updating, setUpdating] = useState(false);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      setRefreshing(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view power bills",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('asset_power_bills')
        .select(`
          *,
          media_assets (
            location,
            area,
            city,
            illumination_type
          )
        `)
        .order('bill_month', { ascending: false });

      if (error) throw error;
      setBills((data || []) as PowerBill[]);
    } catch (error: any) {
      toast({
        title: "Error Loading Bills",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedBill) return;

    setUpdating(true);
    try {
      let receiptUrl = null;

      // Upload receipt if provided
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `receipt-${selectedBill.id}-${Date.now()}.${fileExt}`;
        const filePath = `power-bills/${selectedBill.asset_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('client-documents')
          .upload(filePath, receiptFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('client-documents')
          .getPublicUrl(filePath);

        receiptUrl = publicUrl;
      }

      const { error } = await supabase
        .from('asset_power_bills')
        .update({
          payment_status: 'Paid',
          paid_amount: selectedBill.bill_amount,
          payment_date: paymentDate,
          bill_url: receiptUrl || selectedBill.bill_url,
          paid: true,
        })
        .eq('id', selectedBill.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Power bill marked as paid successfully",
      });

      setSelectedBill(null);
      setReceiptFile(null);
      fetchBills();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'Overdue':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'Pending':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const filteredBills = bills
    .filter(bill => {
      const matchesSearch = 
        bill.asset_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.media_assets?.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.media_assets?.area?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.consumer_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = 
        filter === 'all' || 
        bill.payment_status.toLowerCase() === filter;

      return matchesSearch && matchesFilter;
    });

  const stats = {
    total: bills.length,
    pending: bills.filter(b => b.payment_status === 'Pending').length,
    overdue: bills.filter(b => b.payment_status === 'Overdue').length,
    paid: bills.filter(b => b.payment_status === 'Paid').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading power bills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Zap className="w-6 h-6" />
                Power Bills
              </h1>
              <p className="text-sm text-primary-foreground/80 mt-1">
                Field Team Dashboard
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchBills}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-background/10 backdrop-blur rounded-lg p-2 text-center">
              <div className="text-lg font-bold">{stats.total}</div>
              <div className="text-xs opacity-80">Total</div>
            </div>
            <div className="bg-background/10 backdrop-blur rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-yellow-300">{stats.pending}</div>
              <div className="text-xs opacity-80">Pending</div>
            </div>
            <div className="bg-background/10 backdrop-blur rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-red-300">{stats.overdue}</div>
              <div className="text-xs opacity-80">Overdue</div>
            </div>
            <div className="bg-background/10 backdrop-blur rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-green-300">{stats.paid}</div>
              <div className="text-xs opacity-80">Paid</div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by asset, location, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/20 border-background/30 text-foreground placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-[220px] z-30 bg-background border-b shadow-sm">
        <div className="flex gap-2 p-2 overflow-x-auto">
          {(['all', 'pending', 'overdue', 'paid'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="flex-shrink-0 capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Bills List */}
      <div className="p-4 space-y-3">
        {filteredBills.length === 0 ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No power bills found</p>
              <p className="text-sm">
                {searchQuery ? 'Try adjusting your search' : 'No bills available'}
              </p>
            </div>
          </Card>
        ) : (
          filteredBills.map((bill) => (
            <Card 
              key={bill.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedBill(bill)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-semibold text-base mb-1">
                      {bill.asset_id}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {bill.media_assets?.location || 'N/A'}, {bill.media_assets?.area || 'N/A'}
                    </div>
                  </div>
                  <Badge className={getStatusColor(bill.payment_status)}>
                    {bill.payment_status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Consumer</div>
                    <div className="font-medium">{bill.consumer_name || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Type</div>
                    <div className="font-medium capitalize">{bill.media_assets?.illumination_type || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Amount Due</div>
                    <div className="font-semibold text-primary">₹{bill.bill_amount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Bill Month</div>
                    <div className="font-medium">
                      {format(new Date(bill.bill_month), 'MMM yyyy')}
                    </div>
                  </div>
                </div>

                {bill.payment_status === 'Paid' && bill.payment_date && (
                  <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-green-600">
                    <CheckCircle className="w-3 h-3" />
                    Paid on {format(new Date(bill.payment_date), 'dd MMM yyyy')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Update Payment Dialog */}
      <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Payment Status</DialogTitle>
          </DialogHeader>
          
          {selectedBill && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Asset ID:</span>
                  <span className="font-medium">{selectedBill.asset_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <span className="font-semibold text-primary">₹{selectedBill.bill_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Bill Month:</span>
                  <span>{format(new Date(selectedBill.bill_month), 'MMM yyyy')}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Receipt (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  />
                </div>
                {receiptFile && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {receiptFile.name}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedBill(null)}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleMarkAsPaid}
                  disabled={updating}
                >
                  {updating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Paid
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bottom Action Bar (Mobile Only) */}
      <BottomActionBar>
        <BottomActionButton
          icon={<RefreshCw className="w-4 h-4" />}
          label="Refresh"
          variant="outline"
          onClick={fetchBills}
          disabled={refreshing}
        />
        <BottomActionButton
          icon={<Zap className="w-4 h-4" />}
          label={`${stats.pending} Pending`}
          variant="default"
          onClick={() => setFilter('pending')}
        />
      </BottomActionBar>
    </div>
  );
}
