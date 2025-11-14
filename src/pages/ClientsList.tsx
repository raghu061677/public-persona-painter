import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateClientCode } from "@/lib/codeGenerator";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Sparkles, MoreVertical, Pencil, Trash2, Download, ArrowUpDown, ChevronLeft, ChevronRight, BarChart3, FileText, Mail, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { DeleteClientDialog } from "@/components/clients/DeleteClientDialog";
import { z } from "zod";
import * as XLSX from 'xlsx';
import { TableFilters } from "@/components/common/table-filters";
import { FilterPresets } from "@/components/common/filter-presets";
import { Card, CardContent } from "@/components/ui/card";
import { BulkActionsDropdown, commonBulkActions } from "@/components/common/bulk-actions-dropdown";
import { useTableSettings, formatDate as formatDateUtil } from "@/hooks/use-table-settings";
import { useTableDensity } from "@/hooks/use-table-density";
import { SkeletonStats, SkeletonTable } from "@/components/ui/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useColumnPrefs } from "@/hooks/use-column-prefs";
import { PageCustomization } from "@/components/ui/page-customization";
import { useLayoutSettings } from "@/hooks/use-layout-settings";
import { EnhancedFilterToggle } from "@/components/common/EnhancedFilterToggle";
import { MobileBottomNav, MobileBottomNavButton } from "@/components/ui/mobile-bottom-nav";

const INDIAN_STATES = [
  { code: "AP", name: "Andhra Pradesh" },
  { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BR", name: "Bihar" },
  { code: "CG", name: "Chhattisgarh" },
  { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" },
  { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JH", name: "Jharkhand" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "MH", name: "Maharashtra" },
  { code: "MN", name: "Manipur" },
  { code: "ML", name: "Meghalaya" },
  { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" },
  { code: "OD", name: "Odisha" },
  { code: "PB", name: "Punjab" },
  { code: "RJ", name: "Rajasthan" },
  { code: "SK", name: "Sikkim" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TG", name: "Telangana" },
  { code: "TR", name: "Tripura" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "UK", name: "Uttarakhand" },
  { code: "WB", name: "West Bengal" },
  { code: "AN", name: "Andaman and Nicobar Islands" },
  { code: "CH", name: "Chandigarh" },
  { code: "DH", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "DL", name: "Delhi" },
  { code: "JK", name: "Jammu and Kashmir" },
  { code: "LA", name: "Ladakh" },
  { code: "LD", name: "Lakshadweep" },
  { code: "PY", name: "Puducherry" },
];

// Add client validation schema
const addClientSchema = z.object({
  id: z.string().min(1, "Client ID is required"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255).optional().or(z.literal("")),
  phone: z.string().trim().regex(/^[0-9]{10}$/, "Phone must be exactly 10 digits").optional().or(z.literal("")),
  company: z.string().trim().max(100).optional().or(z.literal("")),
  gst_number: z.string().trim().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST number format").optional().or(z.literal("")),
  state: z.string().min(1, "State is required"),
  city: z.string().trim().max(50).optional().or(z.literal("")),
});


export default function ClientsList() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingClient, setDeletingClient] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [globalSearchFiltered, setGlobalSearchFiltered] = useState<any[]>([]);
  
  // Filtering states (kept for backward compatibility)
  const [filterState, setFilterState] = useState<string>("");
  const [filterCity, setFilterCity] = useState<string>("");
  const [sortField, setSortField] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Bulk operations states
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [bulkUpdateDialogOpen, setBulkUpdateDialogOpen] = useState(false);
  const [bulkEmailDialogOpen, setBulkEmailDialogOpen] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState({ state: "", city: "" });

  const { density, setDensity, getRowClassName, getCellClassName } = useTableDensity("clients");
  const { 
    settings, 
    updateSettings, 
    resetSettings,
    isReady: settingsReady 
  } = useTableSettings("clients");

  // Define all columns
  const allColumns = [
    { key: "select", label: "Select" },
    { key: "id", label: "Client ID" },
    { key: "name", label: "Name" },
    { key: "company", label: "Company" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "gst", label: "GST Number" },
    { key: "actions", label: "Actions" },
  ];

  const defaultVisibleColumns = ["select", "id", "name", "company", "email", "phone", "city", "state", "actions"];

  const {
    isReady: columnPrefsReady,
    visibleKeys: visibleColumns,
    setVisibleKeys: setVisibleColumns,
    reset: resetColumns,
  } = useColumnPrefs("clients-columns", allColumns.map(c => c.key), defaultVisibleColumns);

  // Auto-refresh
  useEffect(() => {
    if (!settingsReady || settings.autoRefreshInterval === 0) return;
    const interval = setInterval(() => {
      fetchClients();
    }, settings.autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [settings.autoRefreshInterval, settingsReady]);
  
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    company: "",
    gst_number: "",
    state: "",
    city: "",
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch clients",
        variant: "destructive",
      });
    } else {
      setClients(data || []);
    }
    setLoading(false);
    setGlobalSearchFiltered(data || []);
  };

  const handleBulkAction = async (actionId: string) => {
    const selectedIds = Array.from(selectedClients);
    
    if (actionId === "delete") {
      const { error } = await supabase
        .from("clients")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;
      
      fetchClients();
      setSelectedClients(new Set());
    } else if (actionId === "export") {
      const selectedData = globalSearchFiltered.filter(c => selectedIds.includes(c.id));
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(selectedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clients");
      XLSX.writeFile(wb, "clients-export.xlsx");
    }
  };

  const generateClientId = async () => {
    if (!formData.state) {
      toast({
        title: "Missing Information",
        description: "Please select a state first",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const clientId = await generateClientCode(formData.state);
      setFormData(prev => ({ ...prev, id: clientId }));
      
      toast({
        title: "ID Generated",
        description: `Client ID: ${clientId}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const validateForm = (): boolean => {
    try {
      addClientSchema.parse(formData);
      setFormErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setFormErrors(errors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('clients')
      .insert({
        id: formData.id,
        name: formData.name.trim(),
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        company: formData.company?.trim() || null,
        gst_number: formData.gst_number?.trim() || null,
        state: formData.state,
        city: formData.city?.trim() || null,
        created_by: user.id,
      } as any);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Client created successfully",
      });
      setIsDialogOpen(false);
      resetForm();
      fetchClients();
    }
  };

  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      email: "",
      phone: "",
      company: "",
      gst_number: "",
      state: "",
      city: "",
    });
    setFormErrors({});
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setEditDialogOpen(true);
  };

  const handleDelete = (client: any) => {
    setDeletingClient(client);
    setDeleteDialogOpen(true);
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Get unique states and cities for filters
  const uniqueStates = Array.from(new Set(clients.map(c => c.state).filter(Boolean))).sort();
  const uniqueCities = Array.from(new Set(clients.map(c => c.city).filter(Boolean))).sort();

  // Filter and sort clients
  const filteredAndSortedClients = clients
    .filter(client => {
      // Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          client.name?.toLowerCase().includes(term) ||
          client.email?.toLowerCase().includes(term) ||
          client.company?.toLowerCase().includes(term) ||
          client.id?.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }
      
      // State filter
      if (filterState && client.state !== filterState) return false;
      
      // City filter
      if (filterCity && client.city !== filterCity) return false;
      
      return true;
    })
    .sort((a, b) => {
      let aVal = a[sortField] || "";
      let bVal = b[sortField] || "";
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredAndSortedClients.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterState, filterCity]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Bulk operations handlers
  const toggleClientSelection = (clientId: string) => {
    const newSelected = new Set(selectedClients);
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId);
    } else {
      newSelected.add(clientId);
    }
    setSelectedClients(newSelected);
  };

  const toggleAllClients = () => {
    if (selectedClients.size === paginatedClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(paginatedClients.map(c => c.id)));
    }
  };

  const clearSelection = () => {
    setSelectedClients(new Set());
  };

  const bulkExportToExcel = () => {
    const selectedClientsData = clients.filter(c => selectedClients.has(c.id));
    const exportData = selectedClientsData.map(client => ({
      'Client ID': client.id,
      'Name': client.name,
      'Company': client.company || '-',
      'Email': client.email || '-',
      'Phone': client.phone || '-',
      'City': client.city || '-',
      'State': client.state || '-',
      'GST Number': client.gst_number || '-',
      'Created At': new Date(client.created_at).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Selected Clients");
    
    const maxWidth = exportData.reduce((w, r) => Math.max(w, ...Object.values(r).map(v => String(v).length)), 10);
    ws['!cols'] = Object.keys(exportData[0] || {}).map(() => ({ wch: maxWidth }));
    
    XLSX.writeFile(wb, `clients_bulk_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "Export Successful",
      description: `Exported ${exportData.length} selected clients to Excel`,
    });
    
    clearSelection();
  };

  const handleBulkUpdate = async () => {
    if (!bulkUpdateData.state && !bulkUpdateData.city) {
      toast({
        title: "No Changes",
        description: "Please select at least one field to update",
        variant: "destructive",
      });
      return;
    }

    const updates: any = {};
    if (bulkUpdateData.state) updates.state = bulkUpdateData.state;
    if (bulkUpdateData.city) updates.city = bulkUpdateData.city;

    const { error } = await supabase
      .from('clients')
      .update(updates)
      .in('id', Array.from(selectedClients));

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update clients",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Updated ${selectedClients.size} clients successfully`,
      });
      setBulkUpdateDialogOpen(false);
      setBulkUpdateData({ state: "", city: "" });
      clearSelection();
      fetchClients();
    }
  };

  const exportToExcel = () => {
    const exportData = filteredAndSortedClients.map(client => ({
      'Client ID': client.id,
      'Name': client.name,
      'Company': client.company || '-',
      'Email': client.email || '-',
      'Phone': client.phone || '-',
      'City': client.city || '-',
      'State': client.state || '-',
      'GST Number': client.gst_number || '-',
      'Created At': new Date(client.created_at).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");
    
    // Auto-size columns
    const maxWidth = exportData.reduce((w, r) => Math.max(w, ...Object.values(r).map(v => String(v).length)), 10);
    ws['!cols'] = Object.keys(exportData[0] || {}).map(() => ({ wch: maxWidth }));
    
    XLSX.writeFile(wb, `clients_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "Export Successful",
      description: `Exported ${exportData.length} clients to Excel`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageContainer className="space-y-6">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-2">
              <Skeleton className="h-9 w-40" />
              <Skeleton className="h-5 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          
          <SkeletonStats count={4} />
          <SkeletonTable rows={10} columns={6} />
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageContainer>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Clients</h1>
            <p className="text-muted-foreground mt-1">
              Manage your client database
            </p>
          </div>
          {isAdmin && (
            <Button 
              onClick={() => navigate('/admin/clients/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Client
            </Button>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedClients.size > 0 && (
          <div className="mb-4 bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedClients.size} client{selectedClients.size !== 1 ? 's' : ''} selected
                </span>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={bulkExportToExcel}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Selected
                </Button>
                <Button variant="outline" size="sm" onClick={() => setBulkEmailDialogOpen(true)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </Button>
                <Button variant="outline" size="sm" onClick={() => setBulkUpdateDialogOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Update Fields
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Columns */}
        <TableFilters
          filters={[
            {
              key: "search",
              label: "Search",
              type: "text",
              placeholder: "Search clients by name, email, company, ID...",
            },
            {
              key: "state",
              label: "State",
              type: "select",
              options: uniqueStates.map(state => ({
                value: state,
                label: INDIAN_STATES.find(s => s.code === state)?.name || state
              })),
            },
            {
              key: "city",
              label: "City",
              type: "select",
              options: uniqueCities.map(city => ({ value: city, label: city })),
            },
          ]}
          filterValues={{
            search: searchTerm,
            state: filterState,
            city: filterCity,
          }}
          onFilterChange={(key, value) => {
            if (key === "search") setSearchTerm(value);
            else if (key === "state") setFilterState(value);
            else if (key === "city") setFilterCity(value);
          }}
          onClearFilters={() => {
            setSearchTerm("");
            setFilterState("");
            setFilterCity("");
          }}
          allColumns={allColumns}
          visibleColumns={visibleColumns}
          onColumnVisibilityChange={setVisibleColumns}
          onResetColumns={resetColumns}
          density={density}
          onDensityChange={setDensity}
          tableKey="clients"
          settings={settings}
          onUpdateSettings={updateSettings}
          onResetSettings={resetSettings}
        />

        <FilterPresets
          tableKey="clients"
          currentFilters={{
            search: searchTerm,
            state: filterState,
            city: filterCity,
          }}
          onApplyPreset={(filters) => {
            setSearchTerm(filters.search || "");
            setFilterState(filters.state || "");
            setFilterCity(filters.city || "");
          }}
        />

        <Card className="mb-4">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {paginatedClients.length} of {filteredAndSortedClients.length} clients
              {(searchTerm || filterState || filterCity) && ` (filtered from ${clients.length} total)`}
            </div>
            <Button 
              variant="outline" 
              onClick={exportToExcel}
              disabled={filteredAndSortedClients.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
          </CardContent>
        </Card>

        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className={getRowClassName()}>
                {visibleColumns.includes("select") && isAdmin && (
                  <TableHead className={`w-12 ${getCellClassName()}`}>
                    <Checkbox
                      checked={selectedClients.size === paginatedClients.length && paginatedClients.length > 0}
                      onCheckedChange={toggleAllClients}
                    />
                  </TableHead>
                )}
                {visibleColumns.includes("id") && (
                  <TableHead 
                    className={`cursor-pointer hover:bg-muted/50 ${getCellClassName()}`}
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center gap-2">
                      ID
                      {sortField === 'id' && <ArrowUpDown className="h-4 w-4" />}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes("name") && (
                  <TableHead 
                    className={`cursor-pointer hover:bg-muted/50 ${getCellClassName()}`}
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Name
                      {sortField === 'name' && <ArrowUpDown className="h-4 w-4" />}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes("company") && (
                  <TableHead 
                    className={`cursor-pointer hover:bg-muted/50 ${getCellClassName()}`}
                    onClick={() => handleSort('company')}
                  >
                    <div className="flex items-center gap-2">
                      Company
                      {sortField === 'company' && <ArrowUpDown className="h-4 w-4" />}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes("email") && (
                  <TableHead className={getCellClassName()}>Email</TableHead>
                )}
                {visibleColumns.includes("phone") && (
                  <TableHead className={getCellClassName()}>Phone</TableHead>
                )}
                {visibleColumns.includes("city") && (
                  <TableHead 
                    className={`cursor-pointer hover:bg-muted/50 ${getCellClassName()}`}
                    onClick={() => handleSort('city')}
                  >
                    <div className="flex items-center gap-2">
                      City
                      {sortField === 'city' && <ArrowUpDown className="h-4 w-4" />}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes("state") && (
                  <TableHead className={getCellClassName()}>State</TableHead>
                )}
                {visibleColumns.includes("gst") && (
                  <TableHead className={getCellClassName()}>GST</TableHead>
                )}
                {visibleColumns.includes("actions") && isAdmin && (
                  <TableHead className={`text-right ${getCellClassName()}`}>Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading || !settingsReady || !columnPrefsReady ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paginatedClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="text-center py-8">
                    No clients found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedClients.map((client) => (
                  <TableRow key={client.id} className={getRowClassName()}>
                    {visibleColumns.includes("select") && isAdmin && (
                      <TableCell className={getCellClassName()} onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedClients.has(client.id)}
                          onCheckedChange={() => toggleClientSelection(client.id)}
                        />
                      </TableCell>
                    )}
                    {visibleColumns.includes("id") && (
                      <TableCell className={`font-medium ${getCellClassName()}`}>{client.id}</TableCell>
                    )}
                    {visibleColumns.includes("name") && (
                      <TableCell 
                        className={`hover:underline cursor-pointer text-primary font-medium ${getCellClassName()}`}
                        onClick={() => navigate(`/admin/clients/${client.id}`)}
                      >
                        {client.name}
                      </TableCell>
                    )}
                    {visibleColumns.includes("company") && (
                      <TableCell className={getCellClassName()}>{client.company || '-'}</TableCell>
                    )}
                    {visibleColumns.includes("email") && (
                      <TableCell className={getCellClassName()}>{client.email || '-'}</TableCell>
                    )}
                    {visibleColumns.includes("phone") && (
                      <TableCell className={getCellClassName()}>{client.phone || '-'}</TableCell>
                    )}
                    {visibleColumns.includes("city") && (
                      <TableCell className={getCellClassName()}>{client.city || '-'}</TableCell>
                    )}
                    {visibleColumns.includes("state") && (
                      <TableCell className={getCellClassName()}>{client.state || '-'}</TableCell>
                    )}
                    {visibleColumns.includes("gst") && (
                      <TableCell className={getCellClassName()}>{client.gst_number || '-'}</TableCell>
                    )}
                    {visibleColumns.includes("actions") && isAdmin && (
                      <TableCell className={`text-right ${getCellClassName()}`}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/admin/clients/${client.id}`)}>
                              <FileText className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/admin/clients/${client.id}/analytics`)}>
                              <BarChart3 className="mr-2 h-4 w-4" />
                              View Analytics
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(client)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(client)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        <EditClientDialog
          client={editingClient}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onClientUpdated={fetchClients}
        />

        {/* Delete Dialog */}
        <DeleteClientDialog
          client={deletingClient}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onClientDeleted={fetchClients}
        />

        {/* Bulk Update Dialog */}
        <Dialog open={bulkUpdateDialogOpen} onOpenChange={setBulkUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Update Clients</DialogTitle>
              <DialogDescription>
                Update fields for {selectedClients.size} selected client{selectedClients.size !== 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>State (Optional)</Label>
                <Select value={bulkUpdateData.state} onValueChange={(value) => setBulkUpdateData(prev => ({ ...prev, state: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new state..." />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map(state => (
                      <SelectItem key={state.code} value={state.code}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>City (Optional)</Label>
                <Input
                  value={bulkUpdateData.city}
                  onChange={(e) => setBulkUpdateData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Enter new city..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setBulkUpdateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkUpdate}>
                  Update {selectedClients.size} Client{selectedClients.size !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Email Dialog */}
        <Dialog open={bulkEmailDialogOpen} onOpenChange={setBulkEmailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Bulk Email</DialogTitle>
              <DialogDescription>
                Send email to {selectedClients.size} selected client{selectedClients.size !== 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Recipients:</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {clients.filter(c => selectedClients.has(c.id) && c.email).map(client => (
                    <div key={client.id} className="text-sm">
                      {client.name} - {client.email}
                    </div>
                  ))}
                </div>
                {clients.filter(c => selectedClients.has(c.id) && !c.email).length > 0 && (
                  <p className="text-sm text-destructive mt-2">
                    Note: {clients.filter(c => selectedClients.has(c.id) && !c.email).length} client(s) have no email address
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setBulkEmailDialogOpen(false)}>
                  Cancel
                </Button>
                <Button disabled>
                  <Mail className="mr-2 h-4 w-4" />
                  Configure Email Service
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Email functionality requires Resend API configuration. Contact your administrator.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </div>
  );
}
