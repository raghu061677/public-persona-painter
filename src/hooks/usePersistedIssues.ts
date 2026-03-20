/**
 * Hook to fetch persisted data quality issues from the database.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export type IssueSeverity = "critical" | "high" | "medium" | "low";
export type WorkflowStatus = "open" | "investigating" | "resolved" | "ignored";

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
  severity: IssueSeverity;
  workflow_status: WorkflowStatus;
  assigned_to: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
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

export interface AlertThreshold {
  id: string;
  severity: string;
  threshold_count: number;
  notify_on_increase: boolean;
  increase_percent: number;
  is_active: boolean;
}

export function usePersistedIssues(enabled = true) {
  const { company } = useCompany();
  const queryClient = useQueryClient();

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

  const thresholdsQuery = useQuery({
    queryKey: ["data-quality-thresholds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_quality_alert_thresholds" as any)
        .select("*")
        .order("severity");
      if (error) throw error;
      return (data || []) as unknown as AlertThreshold[];
    },
    enabled,
    staleTime: 300_000,
  });

  // Mutation: update workflow status
  const updateIssueMutation = useMutation({
    mutationFn: async ({
      issueId,
      updates,
    }: {
      issueId: string;
      updates: Partial<{
        workflow_status: WorkflowStatus;
        resolution_note: string;
        assigned_to: string | null;
      }>;
    }) => {
      const payload: Record<string, any> = { ...updates };
      if (updates.workflow_status === "resolved" || updates.workflow_status === "ignored") {
        payload.is_resolved = true;
        payload.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("data_quality_issues" as any)
        .update(payload)
        .eq("id", issueId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-quality-issues"] });
      toast.success("Issue updated");
    },
    onError: (err: any) => {
      toast.error("Failed to update issue: " + (err.message || "Unknown error"));
    },
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
    thresholds: thresholdsQuery.data || [],
    updateIssue: updateIssueMutation.mutate,
    isUpdating: updateIssueMutation.isPending,
    refetch: () => {
      issuesQuery.refetch();
      runsQuery.refetch();
    },
  };
}
