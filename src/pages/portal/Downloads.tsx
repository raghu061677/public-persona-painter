import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Presentation, Sheet, Search, Loader2 } from "lucide-react";
import { useDocumentGeneration } from "@/hooks/useDocumentGeneration";
import { useToast } from "@/hooks/use-toast";

const documentTypeIcons = {
  invoice: FileText,
  proof: Presentation,
  report: Sheet,
  workorder: FileText,
};

export default function PortalDownloads() {
  const { toast } = useToast();
  const { generating, generateInvoicePDF, generateProofPPT, generateCampaignExcel } = useDocumentGeneration();
  
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCampaign, setFilterCampaign] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get client from localStorage
      const portalUser = localStorage.getItem('portal_user');
      if (!portalUser) return;
      
      const user = JSON.parse(portalUser);

      // Fetch campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, campaign_name, start_date, end_date, status')
        .eq('client_id', user.client_id)
        .order('created_at', { ascending: false });

      setCampaigns(campaignsData || []);

      // Fetch invoices
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('id, invoice_date, total_amount, status')
        .eq('client_id', user.client_id)
        .order('created_at', { ascending: false });

      setInvoices(invoicesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load documents",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const result = await generateInvoicePDF(invoiceId);
      if (result?.url) {
        window.open(result.url, '_blank');
      }
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDownloadProof = async (campaignId: string) => {
    try {
      const result = await generateProofPPT(campaignId);
      if (result?.url) {
        window.open(result.url, '_blank');
      }
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDownloadReport = async (campaignId: string) => {
    try {
      const result = await generateCampaignExcel(campaignId);
      if (result?.url) {
        window.open(result.url, '_blank');
      }
    } catch (error) {
      // Error handled by hook
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.campaign_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCampaign = filterCampaign === "all" || campaign.id === filterCampaign;
    return matchesSearch && matchesCampaign;
  });

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Downloads</h1>
        <p className="text-muted-foreground mt-2">
          Access all your campaign documents, invoices, and reports
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Document Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="invoice">Invoices</SelectItem>
                <SelectItem value="proof">Proofs</SelectItem>
                <SelectItem value="report">Reports</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCampaign} onValueChange={setFilterCampaign}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.campaign_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Documents */}
      {(filterType === "all" || filterType === "proof" || filterType === "report") && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Campaign Documents</h2>
          <div className="grid gap-4">
            {filteredCampaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{campaign.campaign_name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                      </p>
                      <Badge variant="secondary" className="mt-2">
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      {(filterType === "all" || filterType === "proof") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadProof(campaign.id)}
                          disabled={generating}
                        >
                          {generating ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Presentation className="h-4 w-4 mr-2" />
                          )}
                          Proof PPT
                        </Button>
                      )}
                      {(filterType === "all" || filterType === "report") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReport(campaign.id)}
                          disabled={generating}
                        >
                          {generating ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Sheet className="h-4 w-4 mr-2" />
                          )}
                          Excel Report
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Invoices */}
      {(filterType === "all" || filterType === "invoice") && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Invoices</h2>
          <div className="grid gap-4">
            {filteredInvoices.map((invoice) => (
              <Card key={invoice.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{invoice.id}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Date: {new Date(invoice.invoice_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm font-medium mt-1">
                        Amount: ₹{invoice.total_amount.toLocaleString('en-IN')}
                      </p>
                      <Badge 
                        variant={invoice.status === 'Paid' ? 'default' : 'secondary'}
                        className="mt-2"
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadInvoice(invoice.id)}
                      disabled={generating}
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      Download PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
