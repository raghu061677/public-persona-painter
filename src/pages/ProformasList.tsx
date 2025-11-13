import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ProformaInvoice } from "@/types/proforma";

interface Proforma {
  id: string;
  proforma_number: string;
  proforma_date: string;
  client_name: string;
  plan_name?: string;
  grand_total: number;
  status: string;
}

const ProformasList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchProformas();
  }, []);

  const fetchProformas = async () => {
    try {
      const { data, error } = await supabase
        .from('proforma_invoices' as any)
        .select('id, proforma_number, proforma_date, client_name, plan_name, grand_total, status')
        .order('proforma_date', { ascending: false });

      if (error) throw error;
      setProformas((data || []) as unknown as Proforma[]);
    } catch (error) {
      console.error('Error fetching proformas:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load proforma invoices."
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProformas = proformas.filter(p =>
    p.proforma_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'sent': return 'default';
      case 'accepted': return 'default'; // Changed from 'success'
      case 'expired': return 'destructive';
      case 'converted': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proforma Invoices</h1>
          <p className="text-muted-foreground">Manage your proforma invoices</p>
        </div>
        <Button onClick={() => navigate('/admin/proformas/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Proforma Invoice
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by number or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center text-muted-foreground">Loading...</div>
      ) : filteredProformas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No proforma invoices found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProformas.map((proforma) => (
            <Card
              key={proforma.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/admin/proformas/${proforma.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{proforma.proforma_number}</CardTitle>
                    <CardDescription>{proforma.client_name}</CardDescription>
                  </div>
                  <Badge variant={getStatusColor(proforma.status)}>
                    {proforma.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {new Date(proforma.proforma_date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  {proforma.plan_name && (
                    <div>
                      <p className="text-muted-foreground">Plan</p>
                      <p className="font-medium truncate">{proforma.plan_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-bold text-lg">
                      ₹{proforma.grand_total.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProformasList;