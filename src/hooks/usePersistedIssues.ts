/**
 * Hook to fetch persisted data quality issues from the database.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface PersistedIssue {
  id: string;
  issue_type: string;
  table_name: string;
  field_name: string;
  record_id: string;
  raw_value: string | null;
  context: string | null;
  detail: string | null;
  company_id: string | null;
  first_seen: string;
  last_seen: string;
  occurrences: number;
  is_resolved: boolean;
}

export interface AuditRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  issues_found: number;
  issues_new: number;
  issues_resolved: number;
  tables_scanned: string[];
}

export function usePersistedIssues(enabled = true) {
  const { company } = useCompany();

  const issuesQuery = useQuery({
    queryKey: ["data-quality-issues", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_quality_issues" as any)
        .select("*")
        .eq("company_id", company!.id)
        .eq("is_resolved", false)
        .order("last_seen", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as unknown as PersistedIssue[];
    },
    enabled: enabled && !!company?.id,
    staleTime: 60_000,
  });

  const runsQuery = useQuery({
    queryKey: ["data-quality-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_quality_runs" as any)
        .select("*")
        .order("started_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || []) as unknown as AuditRun[];
    },
    enabled,
    staleTime: 60_000,
  });

  // Trend: issues per day from the runs table
  const trendData = (runsQuery.data || [])
    .filter((r) => r.status === "completed")
    .map((r) => ({
      date: r.started_at.substring(0, 10),
      found: r.issues_found,
      new: r.issues_new,
      resolved: r.issues_resolved,
    }))
    .reverse();

  return {
    issues: issuesQuery.data || [],
    isLoading: issuesQuery.isLoading,
    runs: runsQuery.data || [],
    trendData,
    refetch: () => {
      issuesQuery.refetch();
      runsQuery.refetch();
    },
  };
}
