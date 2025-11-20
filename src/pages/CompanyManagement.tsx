import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Building2, UserPlus, Users, Pencil, Trash2, CheckCircle, Shield, Plus, Download } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { EditCompanyDialog } from "@/components/platform/EditCompanyDialog";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Company {
  id: string;
  name: string;
  legal_name: string;
  type: string;
  status: string;
  gstin?: string;
  created_at: string;
}

export default function CompanyManagement() {
  const { isPlatformAdmin } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  
  // Form states for new company
  const [companyName, setCompanyName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [companyType, setCompanyType] = useState<"media_owner" | "agency">("media_owner");
  const [gstin, setGstin] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [deleteCompanyId, setDeleteCompanyId] = useState<string | null>(null);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);

  useEffect(() => {
    if (isPlatformAdmin) {
      loadCompanies();
    }
  }, [isPlatformAdmin]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading companies",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !legalName) {
      toast({
        title: "Validation Error",
        description: "Company name and legal name are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          legal_name: legalName,
          type: companyType,
          gstin: gstin || null,
          status: 'active',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Company created successfully",
      });

      setAddCompanyOpen(false);
      setCompanyName("");
      setLegalName("");
      setGstin("");
      loadCompanies();
    } catch (error: any) {
      toast({
        title: "Error creating company",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCleanupDuplicates = async () => {
    try {
      setSubmitting(true);
      const { data, error } = await supabase.functions.invoke('cleanup-duplicate-companies');

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || "Duplicate companies cleaned up",
      });

      setCleanupDialogOpen(false);
      loadCompanies();
    } catch (error: any) {
      toast({
        title: "Error cleaning duplicates",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportData = async (companyId: string) => {
    try {
      setIsExporting(true);
      const { data, error } = await supabase.functions.invoke('export-company-data', {
        body: { companyId }
      });

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `company-${companyId}-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Company data exported successfully",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Export Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    try {
      setSubmitting(true);
      const { data, error } = await supabase.functions.invoke('delete-company', {
        body: { companyId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Company deleted successfully",
      });

      setExportDialogOpen(false);
      setCompanyToDelete(null);
      loadCompanies();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const initiateDelete = (company: Company) => {
    if (company.type === 'platform_admin') {
      toast({
        title: "Cannot Delete",
        description: "Platform admin companies cannot be deleted",
        variant: "destructive",
      });
      return;
    }
    setCompanyToDelete(company);
    setExportDialogOpen(true);
  };

  if (!isPlatformAdmin) {
    return (
      <div className="container mx-auto p-6 animate-fade-in">
        <EmptyState
          icon={Building2}
          title="Access Denied"
          description="You need platform admin privileges to access this page."
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Company Management
          </h1>
          <p className="text-muted-foreground mt-2">Manage companies and users in the system</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCleanupDialogOpen(true)} className="hover-scale">
            <Trash2 className="mr-2 h-4 w-4" />
            Cleanup Duplicates
          </Button>
          <Dialog open={addCompanyOpen} onOpenChange={setAddCompanyOpen}>
            <DialogTrigger asChild>
              <Button className="hover-scale">
                <Plus className="mr-2 h-4 w-4" />
                Add Company
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Company</DialogTitle>
              <DialogDescription>
                Add a new media owner or agency company
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legalName">Legal Name</Label>
                <Input
                  id="legalName"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Enter legal name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyType">Company Type</Label>
                <Select value={companyType} onValueChange={(value: any) => setCompanyType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="media_owner">Media Owner</SelectItem>
                    <SelectItem value="agency">Agency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN (Optional)</Label>
                <Input
                  id="gstin"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="Enter GSTIN"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAddCompanyOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Company"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <StatCard
          title="Total Companies"
          value={companies.length}
          icon={Building2}
          description="Registered companies"
        />
        <StatCard
          title="Active Companies"
          value={companies.filter(c => c.status === 'active').length}
          icon={Building2}
          description="Currently active"
        />
      </div>

      <Card className="hover-scale transition-all duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            All Companies
          </CardTitle>
          <CardDescription>
            {companies.length} {companies.length === 1 ? 'company' : 'companies'} in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/50">
                <TableHead>Name</TableHead>
                <TableHead>Legal Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">
                    <div 
                      className="group flex items-center gap-1 cursor-pointer hover:text-primary hover:underline transition-all duration-200 w-fit"
                      onClick={() => {
                        setCompanyToEdit(company);
                        setEditDialogOpen(true);
                      }}
                    >
                      {company.name}
                      <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </div>
                  </TableCell>
                  <TableCell>{company.legal_name}</TableCell>
                  <TableCell>
                    <Badge variant={company.type === 'platform_admin' ? 'default' : 'secondary'}>
                      {company.type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={company.status === 'active' ? 'default' : 'secondary'}>
                      {company.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{company.gstin || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/users/companies/${company.id}`)}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Manage Users
                      </Button>
                      {company.type !== 'platform_admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => initiateDelete(company)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cleanup Duplicates Dialog */}
      <AlertDialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cleanup Duplicate Companies</AlertDialogTitle>
            <AlertDialogDescription>
              This will scan for companies with the same name and keep only the oldest one.
              All duplicate companies will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCleanupDuplicates} disabled={submitting}>
              {submitting ? "Cleaning..." : "Cleanup Duplicates"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export & Delete Dialog */}
      <AlertDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export Data Before Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Before deleting "{companyToDelete?.name}", we recommend exporting all data as a backup.
              This includes users, clients, media assets, plans, campaigns, invoices, and more.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCompanyToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={async () => {
                if (companyToDelete) {
                  const exported = await handleExportData(companyToDelete.id);
                  if (!exported) {
                    setExportDialogOpen(false);
                    setCompanyToDelete(null);
                  }
                }
              }}
              disabled={isExporting || submitting}
            >
              {isExporting ? "Exporting..." : "Export Data"}
            </Button>
            <AlertDialogAction
              onClick={() => companyToDelete && handleDeleteCompany(companyToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={submitting}
            >
              {submitting ? "Deleting..." : "Delete Without Export"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User management has been moved to dedicated page: /admin/users/companies/:id */}

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
    </div>
  );
}
