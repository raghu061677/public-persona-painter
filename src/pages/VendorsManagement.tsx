import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Building2 } from "lucide-react";
import { logAudit } from "@/utils/auditLog";

interface Vendor {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gst_number: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  created_at: string;
}

export default function VendorsManagement() {
  const { isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    gst_number: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
  });

  const canViewFinance = isAdmin || hasRole('finance');

  useEffect(() => {
    if (!canViewFinance) {
      navigate("/admin/dashboard");
      return;
    }
    fetchVendors();
  }, [canViewFinance, navigate]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendors' as any)
        .select('*')
        .order('name');

      if (error) throw error;
      setVendors(data as any || []);
      
      // Log vendor view access
      await logAudit({
        action: 'view_vendor',
        resourceType: 'vendor',
        details: { count: data?.length || 0 },
      });
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

  const handleOpenDialog = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData({
        name: vendor.name,
        contact_person: vendor.contact_person || "",
        phone: vendor.phone || "",
        email: vendor.email || "",
        address: vendor.address || "",
        gst_number: vendor.gst_number || "",
        bank_name: vendor.bank_name || "",
        account_number: vendor.account_number || "",
        ifsc_code: vendor.ifsc_code || "",
      });
    } else {
      setEditingVendor(null);
      setFormData({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        gst_number: "",
        bank_name: "",
        account_number: "",
        ifsc_code: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Vendor name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingVendor) {
        const { error } = await supabase
          .from('vendors' as any)
          .update(formData)
          .eq('id', editingVendor.id);

        if (error) throw error;
        
        await logAudit({
          action: 'update_vendor',
          resourceType: 'vendor',
          resourceId: editingVendor.id,
          details: { vendor_name: formData.name },
        });

        toast({ title: "Vendor updated successfully" });
      } else {
        const { data, error } = await supabase
          .from('vendors' as any)
          .insert([formData])
          .select()
          .single();

        if (error) throw error;
        
        await logAudit({
          action: 'update_vendor',
          resourceType: 'vendor',
          resourceId: (data as any).id,
          details: { vendor_name: formData.name, action: 'create' },
        });

        toast({ title: "Vendor created successfully" });
      }

      setDialogOpen(false);
      fetchVendors();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (vendor: Vendor) => {
    if (!confirm(`Are you sure you want to delete ${vendor.name}?`)) return;

    try {
      const { error } = await supabase
        .from('vendors' as any)
        .delete()
        .eq('id', vendor.id);

      if (error) throw error;
      
      await logAudit({
        action: 'delete_vendor',
        resourceType: 'vendor',
        resourceId: vendor.id,
        details: { vendor_name: vendor.name },
      });

      toast({ title: "Vendor deleted successfully" });
      fetchVendors();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading vendors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Vendors Management
          </h2>
          <p className="text-muted-foreground mt-2">
            Manage vendor information and banking details securely
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendors List ({vendors.length})</CardTitle>
          <CardDescription>Secure storage for vendor banking information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>GST Number</TableHead>
                  <TableHead>Bank Name</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground">
                      No vendors found
                    </TableCell>
                  </TableRow>
                ) : (
                  vendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>{vendor.contact_person || '-'}</TableCell>
                      <TableCell>{vendor.phone || '-'}</TableCell>
                      <TableCell>{vendor.email || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{vendor.gst_number || '-'}</TableCell>
                      <TableCell>{vendor.bank_name || '-'}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(vendor)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(vendor)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
            <DialogDescription>
              All banking information is stored securely with restricted access
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Vendor Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Vendor company name"
              />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="Contact person name"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="vendor@example.com"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address"
              />
            </div>
            <div>
              <Label>GST Number</Label>
              <Input
                value={formData.gst_number}
                onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                placeholder="GST registration number"
              />
            </div>
            <div>
              <Label>Bank Name</Label>
              <Input
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Bank name"
              />
            </div>
            <div>
              <Label>Account Number 🔒</Label>
              <Input
                type="password"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="Bank account number"
              />
            </div>
            <div>
              <Label>IFSC Code</Label>
              <Input
                value={formData.ifsc_code}
                onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                placeholder="IFSC code"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingVendor ? 'Update' : 'Create'} Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
