import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, CheckCircle, XCircle, Clock, Users, 
  TrendingUp, DollarSign, AlertCircle, Eye 
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Company {
  id: string;
  name: string;
  type: 'media_owner' | 'agency' | 'platform_admin';
  status: 'pending' | 'active' | 'suspended' | 'cancelled';
  created_at: string;
  legal_name?: string;
  gstin?: string;
  city?: string;
  state?: string;
  email?: string;
  phone?: string;
}

interface CompanyStats {
  totalCompanies: number;
  activeCompanies: number;
  pendingCompanies: number;
  suspendedCompanies: number;
  mediaOwners: number;
  agencies: number;
}

export default function PlatformAdminDashboard() {
  const { isPlatformAdmin } = useCompany();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<CompanyStats>({
    totalCompanies: 0,
    activeCompanies: 0,
    pendingCompanies: 0,
    suspendedCompanies: 0,
    mediaOwners: 0,
    agencies: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (!isPlatformAdmin) {
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [isPlatformAdmin, navigate]);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('companies' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const companiesData = (data as any) || [];
      setCompanies(companiesData);

      // Calculate stats
      setStats({
        totalCompanies: companiesData.length,
        activeCompanies: companiesData.filter((c: Company) => c.status === 'active').length,
        pendingCompanies: companiesData.filter((c: Company) => c.status === 'pending').length,
        suspendedCompanies: companiesData.filter((c: Company) => c.status === 'suspended').length,
        mediaOwners: companiesData.filter((c: Company) => c.type === 'media_owner').length,
        agencies: companiesData.filter((c: Company) => c.type === 'agency').length,
      });
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load platform data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateCompanyStatus = async (companyId: string, newStatus: 'active' | 'suspended' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('companies' as any)
        .update({ status: newStatus as any })
        .eq('id', companyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Company status updated to ${newStatus}`,
      });

      loadData();
      setSelectedCompany(null);
    } catch (error: any) {
      console.error('Error updating company:', error);
      toast({
        title: "Error",
        description: "Failed to update company status",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'suspended':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === 'media_owner' ? (
      <Badge variant="outline">Media Owner</Badge>
    ) : (
      <Badge variant="outline">Agency</Badge>
    );
  };

  if (!isPlatformAdmin) {
    return null;
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage companies, subscriptions, and platform settings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCompanies}</div>
              <p className="text-xs text-muted-foreground">
                {stats.mediaOwners} owners, {stats.agencies} agencies
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Companies</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeCompanies}</div>
              <p className="text-xs text-muted-foreground">
                Currently active subscriptions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingCompanies}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting review
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Companies List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Companies</CardTitle>
            <CardDescription>Latest company registrations and status updates</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : companies.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No companies registered yet</p>
            ) : (
              <div className="space-y-4">
                {companies.slice(0, 10).map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{company.name}</p>
                        {getTypeBadge(company.type)}
                        {getStatusBadge(company.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {company.city && company.state ? `${company.city}, ${company.state}` : 'Location not set'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Registered: {new Date(company.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCompany(company)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {company.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => updateCompanyStatus(company.id, 'active')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            <Button variant="outline" onClick={() => navigate('/admin/companies')}>
              <Building2 className="h-4 w-4 mr-2" />
              Manage All Companies
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin/users')}>
              <Users className="h-4 w-4 mr-2" />
              User Management
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Company Details Dialog */}
      <Dialog open={!!selectedCompany} onOpenChange={() => setSelectedCompany(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Company Details</DialogTitle>
            <DialogDescription>Review and manage company information</DialogDescription>
          </DialogHeader>
          {selectedCompany && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                  <p className="text-sm">{selectedCompany.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Legal Name</p>
                  <p className="text-sm">{selectedCompany.legal_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <div className="mt-1">{getTypeBadge(selectedCompany.type)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedCompany.status)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">GSTIN</p>
                  <p className="text-sm">{selectedCompany.gstin || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{selectedCompany.email || 'N/A'}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                {selectedCompany.status === 'pending' && (
                  <Button onClick={() => updateCompanyStatus(selectedCompany.id, 'active')}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Company
                  </Button>
                )}
                {selectedCompany.status === 'active' && (
                  <Button 
                    variant="destructive" 
                    onClick={() => updateCompanyStatus(selectedCompany.id, 'suspended')}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Suspend Company
                  </Button>
                )}
                {selectedCompany.status === 'suspended' && (
                  <Button onClick={() => updateCompanyStatus(selectedCompany.id, 'active')}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Reactivate Company
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
