import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Check, X, Eye, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageContainer } from "@/components/ui/page-container";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { EditCompanyDialog } from "@/components/platform/EditCompanyDialog";

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);

  useEffect(() => {
    if (isPlatformAdmin) {
      loadCompanies();
    }
  }, [isPlatformAdmin]);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies((data as any) || []);
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

  const handleEditCompany = (company: Company) => {
    setCompanyToEdit(company);
    setEditDialogOpen(true);
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
        <EmptyState
          icon={Building2}
          title="Access Denied"
          description="You don't have permission to access this page."
        />
      </PageContainer>
    );
  }

  const activeCompanies = companies.filter(c => c.status === 'active').length;
  const pendingCompanies = companies.filter(c => c.status === 'pending').length;
  const suspendedCompanies = companies.filter(c => c.status === 'suspended').length;

  return (
    <PageContainer>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Companies
            </h1>
            <p className="text-muted-foreground mt-2">Manage company registrations and status</p>
          </div>
        </div>

        {!isLoading && companies.length > 0 && (
          <div className="grid gap-6 md:grid-cols-3">
            <StatCard
              title="Active Companies"
              value={activeCompanies}
              icon={Building2}
              description="Currently active"
            />
            <StatCard
              title="Pending Approval"
              value={pendingCompanies}
              icon={Building2}
              description="Awaiting review"
            />
            <StatCard
              title="Suspended"
              value={suspendedCompanies}
              icon={Building2}
              description="Temporarily suspended"
            />
          </div>
        )}

        <div className="grid gap-4">
          {isLoading ? (
            <LoadingState message="Loading companies..." />
          ) : companies.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No companies registered"
              description="Companies will appear here once they register on the platform"
            />
          ) : (
            companies.map((company) => (
              <Card key={company.id} className="hover-scale transition-all duration-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-primary" />
                    <div>
                      <CardTitle 
                        className="cursor-pointer hover:text-primary hover:underline transition-all duration-200 flex items-center gap-2 group"
                        onClick={() => handleEditCompany(company)}
                      >
                        {company.name}
                        <Pencil className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </CardTitle>
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

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleEditCompany(company)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Company
                    </Button>
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

      {/* Edit Company Dialog */}
      {companyToEdit && (
        <EditCompanyDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          company={companyToEdit as any}
          onSuccess={() => {
            setEditDialogOpen(false);
            loadCompanies();
          }}
        />
      )}
    </PageContainer>
  );
}
