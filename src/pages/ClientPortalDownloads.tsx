import { useState, useEffect } from 'react';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Image, File, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logPortalAccess } from '@/utils/portalAccessLogger';

interface Document {
  id: string;
  type: 'invoice' | 'work_order' | 'proof' | 'report';
  campaign_id: string;
  campaign_name: string;
  name: string;
  date: string;
  size?: string;
  url?: string;
}

export default function ClientPortalDownloads() {
  const { portalUser } = useClientPortal();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (portalUser) {
      loadDocuments();
    }
  }, [portalUser]);

  useEffect(() => {
    filterDocuments();
  }, [documents, selectedCampaign, selectedType, searchTerm]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);

      // Load campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, campaign_name, created_at')
        .eq('client_id', portalUser!.client_id)
        .order('created_at', { ascending: false });

      setCampaigns(campaignsData || []);

      const allDocs: Document[] = [];

      // Load invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_date')
        .eq('client_id', portalUser!.client_id);

      invoices?.forEach(inv => {
        allDocs.push({
          id: inv.id,
          type: 'invoice',
          campaign_id: '',
          campaign_name: 'N/A',
          name: `Invoice ${inv.id}`,
          date: inv.invoice_date
        });
      });

      // Load campaigns and their documents
      for (const campaign of campaignsData || []) {
        // Work order
        allDocs.push({
          id: `wo-${campaign.id}`,
          type: 'work_order',
          campaign_id: campaign.id,
          campaign_name: campaign.campaign_name,
          name: `Work Order - ${campaign.campaign_name}`,
          date: campaign.created_at
        });

        // Proof presentation
        allDocs.push({
          id: `proof-${campaign.id}`,
          type: 'proof',
          campaign_id: campaign.id,
          campaign_name: campaign.campaign_name,
          name: `Proof Presentation - ${campaign.campaign_name}`,
          date: campaign.created_at
        });

        // Campaign report
        allDocs.push({
          id: `report-${campaign.id}`,
          type: 'report',
          campaign_id: campaign.id,
          campaign_name: campaign.campaign_name,
          name: `Campaign Report - ${campaign.campaign_name}`,
          date: campaign.created_at
        });
      }

      setDocuments(allDocs);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = [...documents];

    if (selectedCampaign !== 'all') {
      filtered = filtered.filter(d => d.campaign_id === selectedCampaign);
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(d => d.type === selectedType);
    }

    if (searchTerm) {
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.campaign_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDocs(filtered);
  };

  const handleDownload = async (doc: Document) => {
    try {
      // TODO: Implement actual document download
      toast({
        title: 'Coming Soon',
        description: `${doc.type} download will be available soon`
      });

      logPortalAccess(portalUser!.client_id, 'download_proof', doc.type, doc.id);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download document',
        variant: 'destructive'
      });
    }
  };

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'invoice':
        return <FileText className="w-8 h-8 text-blue-600" />;
      case 'work_order':
        return <File className="w-8 h-8 text-green-600" />;
      case 'proof':
        return <Image className="w-8 h-8 text-purple-600" />;
      case 'report':
        return <FileText className="w-8 h-8 text-orange-600" />;
      default:
        return <File className="w-8 h-8" />;
    }
  };

  const getDocTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Download Center</h1>
        <p className="text-muted-foreground mt-2">Access all your campaign documents in one place</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Document Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                  <SelectItem value="work_order">Work Orders</SelectItem>
                  <SelectItem value="proof">Proof Presentations</SelectItem>
                  <SelectItem value="report">Campaign Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Campaign</label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.campaign_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      {isLoading ? (
        <div className="text-center py-12">Loading documents...</div>
      ) : filteredDocs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <File className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No documents found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <Card key={doc.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getDocIcon(doc.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{doc.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{doc.campaign_name}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{getDocTypeLabel(doc.type)}</span>
                      <span>•</span>
                      <span>{new Date(doc.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleDownload(doc)}
                  className="w-full mt-4"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
