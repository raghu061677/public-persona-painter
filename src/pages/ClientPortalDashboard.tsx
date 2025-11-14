import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, FileText, Image } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Campaign {
  id: string;
  campaign_name: string;
  start_date: string;
  end_date: string;
  status: string;
  total_assets: number;
  grand_total: number;
}

interface Invoice {
  id: string;
  invoice_date: string;
  total_amount: number;
  balance_due: number;
  status: string;
}

export default function ClientPortalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadClientData();
  }, [user]);

  const loadClientData = async () => {
    if (!user) return;

    try {
      // Get client ID from user metadata or profile
      // For now, we'll load all campaigns and invoices
      // In production, you'd filter by client_id from the authenticated client user

      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .order('invoice_date', { ascending: false })
        .limit(5);

      setCampaigns(campaignsData || []);
      setInvoices(invoicesData || []);
    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold">Client Portal</h1>
          <p className="text-primary-foreground/80 mt-2">
            View your campaigns, proofs, and invoices
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {/* Active Campaigns */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Active Campaigns</h2>
          </div>
          <div className="grid gap-4">
            {isLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">Loading...</p>
                </CardContent>
              </Card>
            ) : campaigns.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No campaigns found</p>
                </CardContent>
              </Card>
            ) : (
              campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{campaign.campaign_name}</CardTitle>
                        <CardDescription>
                          {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge>{campaign.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium">Total Assets</p>
                        <p className="text-2xl font-bold">{campaign.total_assets || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Campaign Value</p>
                        <p className="text-2xl font-bold">
                          ₹{campaign.grand_total?.toLocaleString('en-IN') || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Status</p>
                        <Badge variant="outline" className="mt-1">
                          {campaign.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/portal/campaigns/${campaign.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button size="sm" variant="outline">
                        <Image className="h-4 w-4 mr-2" />
                        View Proofs
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* Recent Invoices */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Recent Invoices</h2>
            <Button variant="outline" onClick={() => navigate('/portal/invoices')}>
              View All
            </Button>
          </div>
          <div className="grid gap-4">
            {invoices.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No invoices found</p>
                </CardContent>
              </Card>
            ) : (
              invoices.map((invoice) => (
                <Card key={invoice.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-semibold">{invoice.id}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(invoice.invoice_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className="text-sm font-medium">Total</p>
                          <p className="text-xl font-bold">
                            ₹{invoice.total_amount?.toLocaleString('en-IN') || 0}
                          </p>
                          {invoice.balance_due > 0 && (
                            <p className="text-sm text-destructive">
                              Due: ₹{invoice.balance_due?.toLocaleString('en-IN')}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={invoice.status === 'Paid' ? 'default' : 'destructive'}
                        >
                          {invoice.status}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
