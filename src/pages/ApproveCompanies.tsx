import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Building2, Check, X, Loader2, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ApproveCompanies() {
  const { isPlatformAdmin } = useCompany();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isPlatformAdmin) {
      toast({
        title: "Access Denied",
        description: "Only platform admins can access this page",
        variant: "destructive",
      });
      return;
    }
    loadCompanies();
  }, [isPlatformAdmin]);

  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (companyId: string) => {
    setActionLoading(companyId);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ status: 'active' })
        .eq('id', companyId);

      if (error) throw error;

      toast({
        title: "Company Approved",
        description: "The company has been activated successfully",
      });

      await loadCompanies();
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (companyId: string) => {
    setActionLoading(companyId);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ status: 'suspended' })
        .eq('id', companyId);

      if (error) throw error;

      toast({
        title: "Company Rejected",
        description: "The company has been suspended",
      });

      await loadCompanies();
    } catch (error: any) {
      toast({
        title: "Rejection Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const viewDetails = async (companyId: string) => {
    try {
      // Get company with user count
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) throw companyError;

      const { data: usersData } = await supabase
        .from('company_users')
        .select('*')
        .eq('company_id', companyId);

      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setSelectedCompany({
        ...companyData,
        users: usersData || [],
        subscription: subData
      });
      setIsDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: "secondary",
      active: "default",
      suspended: "destructive",
      cancelled: "outline"
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const variants: any = {
      media_owner: "default",
      agency: "secondary",
      platform_admin: "outline"
    };
    return <Badge variant={variants[type] || "secondary"}>
      {type.replace('_', ' ').toUpperCase()}
    </Badge>;
  };

  if (!isPlatformAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only platform admins can access this page</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Company Management</h1>
        <p className="text-muted-foreground">Review and approve company registrations</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{companies.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">
              {companies.filter(c => c.status === 'pending').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {companies.filter(c => c.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Suspended</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {companies.filter(c => c.status === 'suspended').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Companies</CardTitle>
          <CardDescription>Manage company registrations and status</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">{company.name}</p>
                        <p className="text-xs text-muted-foreground">{company.legal_name || company.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(company.type)}</TableCell>
                  <TableCell>
                    <span className="text-sm">{company.city}, {company.state}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">{company.gstin || 'N/A'}</span>
                  </TableCell>
                  <TableCell>{getStatusBadge(company.status)}</TableCell>
                  <TableCell>
                    <span className="text-sm">{new Date(company.created_at).toLocaleDateString()}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => viewDetails(company.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {company.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(company.id)}
                            disabled={actionLoading === company.id}
                          >
                            {actionLoading === company.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(company.id)}
                            disabled={actionLoading === company.id}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Company Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Company Details</DialogTitle>
            <DialogDescription>Full company information</DialogDescription>
          </DialogHeader>
          {selectedCompany && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-accent/50 rounded-lg">
                {selectedCompany.logo_url && (
                  <img src={selectedCompany.logo_url} alt={selectedCompany.name} className="h-16 w-16 rounded object-cover" />
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{selectedCompany.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedCompany.legal_name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getTypeBadge(selectedCompany.type)}
                    {getStatusBadge(selectedCompany.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">GSTIN</p>
                  <p className="font-mono">{selectedCompany.gstin || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PAN</p>
                  <p className="font-mono">{selectedCompany.pan || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p>{selectedCompany.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p>{selectedCompany.email || 'N/A'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p>
                  {selectedCompany.address_line1}<br />
                  {selectedCompany.address_line2 && <>{selectedCompany.address_line2}<br /></>}
                  {selectedCompany.city}, {selectedCompany.state} - {selectedCompany.pincode}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Users ({selectedCompany.users.length})</p>
                <div className="space-y-1">
                  {selectedCompany.users.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-2 bg-accent/30 rounded">
                      <span className="text-sm">{user.user_id}</span>
                      <Badge variant="outline">{user.role}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {selectedCompany.subscription && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Current Subscription</p>
                  <div className="p-3 bg-accent/30 rounded space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm">Tier:</span>
                      <Badge>{selectedCompany.subscription.tier}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Status:</span>
                      {getStatusBadge(selectedCompany.subscription.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Valid Until:</span>
                      <span className="text-sm font-mono">{selectedCompany.subscription.end_date}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
