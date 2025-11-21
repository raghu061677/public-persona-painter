import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Eye, Trash2 } from "lucide-react";
import { getEstimationStatusColor, formatINR } from "@/utils/finance";
import { formatDate } from "@/utils/plans";
import { toast } from "@/hooks/use-toast";

export default function EstimationsList() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [estimations, setEstimations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    if (company?.id) {
      fetchEstimations();
    }
  }, [company]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setIsAdmin(data?.role === 'admin');
    }
  };

  const fetchEstimations = async () => {
    if (!company?.id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('estimations')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch estimations",
        variant: "destructive",
      });
    } else {
      setEstimations(data || []);
    }
    setLoading(false);
  };

  const filteredEstimations = estimations.filter(est => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      est.id?.toLowerCase().includes(term) ||
      est.client_name?.toLowerCase().includes(term)
    );
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this estimation?")) return;

    const { error } = await supabase
      .from('estimations')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete estimation",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Estimation deleted successfully",
      });
      fetchEstimations();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Estimations</h1>
            <p className="text-muted-foreground mt-1">
              Manage quotations and estimates
            </p>
          </div>
          {isAdmin && (
            <Button
              onClick={() => navigate('/finance/estimations/new')}
              variant="gradient"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Estimation
            </Button>
          )}
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search estimations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estimation ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredEstimations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No estimations found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEstimations.map((estimation) => (
                  <TableRow key={estimation.id}>
                    <TableCell className="font-medium">{estimation.id}</TableCell>
                    <TableCell>{estimation.client_name}</TableCell>
                    <TableCell>{formatDate(estimation.estimation_date)}</TableCell>
                    <TableCell>
                      <Badge className={getEstimationStatusColor(estimation.status)}>
                        {estimation.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatINR(estimation.total_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/finance/estimations/${estimation.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(estimation.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
