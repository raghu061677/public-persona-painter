import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Hash, 
  TrendingUp, 
  Calendar, 
  RefreshCw,
  FileText,
  Users,
  Megaphone,
  Receipt,
  DollarSign,
  LayoutGrid
} from "lucide-react";
import { formatDate } from "@/utils/plans";

interface CodeCounter {
  id: string;
  counter_type: string;
  counter_key: string;
  current_value: number;
  period: string;
  created_at: string;
  updated_at: string;
}

interface EntityStats {
  type: string;
  icon: any;
  label: string;
  total: number;
  currentPeriod: string;
  currentSequence: number;
  color: string;
  format: string;
}

export default function CodeManagement() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [counters, setCounters] = useState<CodeCounter[]>([]);
  const [entityStats, setEntityStats] = useState<EntityStats[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch counters
      const { data: countersData, error: countersError } = await supabase
        .from('code_counters')
        .select('*')
        .order('updated_at', { ascending: false });

      if (countersError) throw countersError;
      setCounters(countersData || []);

      // Fetch entity counts
      await fetchEntityStats(countersData || []);
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

  const fetchEntityStats = async (countersData: CodeCounter[]) => {
    const stats: EntityStats[] = [];
    const currentPeriod = getCurrentPeriod();

    // Asset stats
    const { count: assetCount } = await supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true });
    
    const assetCounters = countersData.filter(c => c.counter_type === 'ASSET');
    const assetMax = Math.max(0, ...assetCounters.map(c => c.current_value));
    
    stats.push({
      type: 'ASSET',
      icon: LayoutGrid,
      label: 'Media Assets',
      total: assetCount || 0,
      currentPeriod: 'All Time',
      currentSequence: assetMax,
      color: 'bg-blue-500',
      format: 'CITY-TYPE-####',
    });

    // Plan stats
    const { count: planCount } = await supabase
      .from('plans')
      .select('*', { count: 'exact', head: true });
    
    const planCounter = countersData.find(c => 
      c.counter_type === 'PLAN' && c.period === currentPeriod
    );
    
    stats.push({
      type: 'PLAN',
      icon: FileText,
      label: 'Plans',
      total: planCount || 0,
      currentPeriod,
      currentSequence: planCounter?.current_value || 0,
      color: 'bg-purple-500',
      format: 'PLAN-YYYYMM-####',
    });

    // Campaign stats
    const { count: campaignCount } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true });
    
    const campaignCounter = countersData.find(c => 
      c.counter_type === 'CAMPAIGN' && c.period === currentPeriod
    );
    
    stats.push({
      type: 'CAMPAIGN',
      icon: Megaphone,
      label: 'Campaigns',
      total: campaignCount || 0,
      currentPeriod,
      currentSequence: campaignCounter?.current_value || 0,
      color: 'bg-orange-500',
      format: 'CMP-YYYYMM-####',
    });

    // Client stats
    const { count: clientCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });
    
    const clientCounters = countersData.filter(c => c.counter_type === 'CLIENT');
    const clientMax = Math.max(0, ...clientCounters.map(c => c.current_value));
    
    stats.push({
      type: 'CLIENT',
      icon: Users,
      label: 'Clients',
      total: clientCount || 0,
      currentPeriod: 'All Time',
      currentSequence: clientMax,
      color: 'bg-green-500',
      format: 'CLT-STATE-####',
    });

    // Invoice stats
    const { count: invoiceCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true });
    
    const invoiceCounter = countersData.find(c => 
      c.counter_type === 'INVOICE' && c.period === currentPeriod
    );
    
    stats.push({
      type: 'INVOICE',
      icon: Receipt,
      label: 'Invoices',
      total: invoiceCount || 0,
      currentPeriod,
      currentSequence: invoiceCounter?.current_value || 0,
      color: 'bg-red-500',
      format: 'INV-YYYYMM-####',
    });

    // Estimation stats
    const { count: estimationCount } = await supabase
      .from('estimations')
      .select('*', { count: 'exact', head: true });
    
    const estimationCounter = countersData.find(c => 
      c.counter_type === 'ESTIMATION' && c.period === currentPeriod
    );
    
    stats.push({
      type: 'ESTIMATION',
      icon: DollarSign,
      label: 'Estimations',
      total: estimationCount || 0,
      currentPeriod,
      currentSequence: estimationCounter?.current_value || 0,
      color: 'bg-yellow-500',
      format: 'EST-YYYYMM-####',
    });

    // Expense stats
    const { count: expenseCount } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true });
    
    const expenseCounter = countersData.find(c => 
      c.counter_type === 'EXPENSE' && c.period === currentPeriod
    );
    
    stats.push({
      type: 'EXPENSE',
      icon: DollarSign,
      label: 'Expenses',
      total: expenseCount || 0,
      currentPeriod,
      currentSequence: expenseCounter?.current_value || 0,
      color: 'bg-pink-500',
      format: 'EXP-YYYYMM-####',
    });

    setEntityStats(stats);
  };

  const getCurrentPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`;
  };

  const groupCountersByType = (type: string) => {
    return counters
      .filter(c => c.counter_type === type)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading code management data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Code Management</h1>
            <p className="text-muted-foreground mt-1">
              Monitor and manage automatic code generation across all modules
            </p>
          </div>
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {entityStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.type}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${stat.color} bg-opacity-10`}>
                      <Icon className={`h-5 w-5 ${stat.color.replace('bg-', 'text-')}`} />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {stat.format}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-2">{stat.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Created:</span>
                      <span className="text-2xl font-bold">{stat.total}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Next Sequence:</span>
                      <Badge variant="outline">{String(stat.currentSequence + 1).padStart(4, '0')}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Period: {stat.currentPeriod}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Counter History */}
        <Card>
          <CardHeader>
            <CardTitle>Counter History</CardTitle>
            <CardDescription>
              Detailed view of all code generation counters and their progression
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-8">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="ASSET">Assets</TabsTrigger>
                <TabsTrigger value="PLAN">Plans</TabsTrigger>
                <TabsTrigger value="CAMPAIGN">Campaigns</TabsTrigger>
                <TabsTrigger value="CLIENT">Clients</TabsTrigger>
                <TabsTrigger value="INVOICE">Invoices</TabsTrigger>
                <TabsTrigger value="ESTIMATION">Estimations</TabsTrigger>
                <TabsTrigger value="EXPENSE">Expenses</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <CounterTable counters={counters} />
              </TabsContent>

              {['ASSET', 'PLAN', 'CAMPAIGN', 'CLIENT', 'INVOICE', 'ESTIMATION', 'EXPENSE'].map(type => (
                <TabsContent key={type} value={type} className="mt-6">
                  <CounterTable counters={groupCountersByType(type)} />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CounterTable({ counters }: { counters: CodeCounter[] }) {
  if (counters.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Hash className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p>No counters found</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Counter Key</TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Current Value</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {counters.map((counter) => (
            <TableRow key={counter.id}>
              <TableCell>
                <Badge variant="outline">{counter.counter_type}</Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">{counter.counter_key}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {counter.period === 'permanent' ? 'All Time' : counter.period}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <span className="font-mono font-bold text-lg">
                  {String(counter.current_value).padStart(4, '0')}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(counter.created_at)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(counter.updated_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
