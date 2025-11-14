import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Check, X, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageContainer } from "@/components/ui/page-container";

interface Company {
  id: string;
  name: string;
  type: string;
  legal_name?: string;
  gstin?: string;
  status: string;
  created_at: string;
  city?: string;
  state?: string;
}

export default function CompaniesManagement() {
  const { isPlatformAdmin } = useCompany();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (isPlatformAdmin) {
      loadCompanies();
    }
  }, [isPlatformAdmin]);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error('Error loading companies:', error);
      toast({
        title: "Error",
        description: "Failed to load companies",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateCompanyStatus = async (companyId: string, status: 'active' | 'suspended' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ status })
        .eq('id', companyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Company ${status === 'active' ? 'activated' : status}`,
      });

      loadCompanies();
    } catch (error: any) {
      console.error('Error updating company:', error);
      toast({
        title: "Error",
        description: "Failed to update company status",
        variant: "destructive"
      });
    }
  };

  if (!isPlatformAdmin) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
            <p className="text-muted-foreground">Manage company registrations and status</p>
          </div>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Loading...</p>
              </CardContent>
            </Card>
          ) : companies.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No companies registered yet</p>
              </CardContent>
            </Card>
          ) : (
            companies.map((company) => (
              <Card key={company.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-8 w-8 text-primary" />
                      <div>
                        <CardTitle>{company.name}</CardTitle>
                        <CardDescription>
                          {company.legal_name || company.name}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant={
                        company.status === 'active' ? 'default' :
                        company.status === 'pending' ? 'secondary' :
                        'destructive'
                      }
                    >
                      {company.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium">Type</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {company.type.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">GSTIN</p>
                      <p className="text-sm text-muted-foreground">
                        {company.gstin || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {company.city && company.state 
                          ? `${company.city}, ${company.state}`
                          : 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Registered</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(company.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedCompany(company)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    {company.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => updateCompanyStatus(company.id, 'active')}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    )}
                    {company.status === 'active' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateCompanyStatus(company.id, 'suspended')}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Suspend
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={!!selectedCompany} onOpenChange={() => setSelectedCompany(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Company Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedCompany?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedCompany && (
            <div className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Company Name</p>
                  <p className="text-sm text-muted-foreground">{selectedCompany.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Legal Name</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCompany.legal_name || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Type</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {selectedCompany.type.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">GSTIN</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCompany.gstin || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
