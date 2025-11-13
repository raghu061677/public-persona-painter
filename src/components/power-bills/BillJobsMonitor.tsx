import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, CheckCircle2, XCircle, Clock, Play } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function BillJobsMonitor() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('power_bill_jobs')
      .select('*')
      .order('run_date', { ascending: false })
      .limit(50);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch job history",
        variant: "destructive",
      });
    } else {
      setJobs(data || []);
    }
    setLoading(false);
  };

  const triggerManualJob = async () => {
    setTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-monthly-power-bills');
      
      if (error) throw error;

      toast({
        title: "Job Triggered",
        description: `Successfully triggered bill fetch job. ${data?.results?.newBills || 0} new bills fetched.`,
      });
      
      fetchJobs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to trigger job",
        variant: "destructive",
      });
    }
    setTriggering(false);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Failed</Badge>;
      case 'running':
        return <Badge variant="secondary" className="gap-1"><RefreshCw className="h-3 w-3 animate-spin" />Running</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Automation Jobs</CardTitle>
            <CardDescription>Monitor scheduled and manual bill fetch operations</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchJobs} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={triggerManualJob} size="sm" disabled={triggering}>
              <Play className="h-4 w-4 mr-2" />
              Run Now
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Run Date</TableHead>
              <TableHead>Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-mono text-sm">{job.asset_id}</TableCell>
                <TableCell>{job.job_type}</TableCell>
                <TableCell>{getStatusBadge(job.job_status)}</TableCell>
                <TableCell>{format(new Date(job.run_date), 'PPp')}</TableCell>
                <TableCell className="text-sm">
                  {job.error_message ? (
                    <span className="text-red-600">{job.error_message}</span>
                  ) : job.result?.billAmount ? (
                    <span>₹{job.result.billAmount}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
