
-- Update the upsert_data_quality_issue RPC to accept severity parameter
CREATE OR REPLACE FUNCTION public.upsert_data_quality_issue(
  p_issue_type text,
  p_table_name text,
  p_field_name text,
  p_record_id text,
  p_raw_value text DEFAULT NULL,
  p_context text DEFAULT NULL,
  p_detail text DEFAULT NULL,
  p_company_id uuid DEFAULT NULL,
  p_now timestamptz DEFAULT now(),
  p_severity text DEFAULT 'medium'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_occurrences int;
BEGIN
  SELECT id, occurrences INTO v_existing_id, v_occurrences
  FROM data_quality_issues
  WHERE issue_type = p_issue_type
    AND table_name = p_table_name
    AND field_name = p_field_name
    AND record_id = p_record_id
    AND (company_id = p_company_id OR (company_id IS NULL AND p_company_id IS NULL))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE data_quality_issues
    SET last_seen = p_now,
        occurrences = COALESCE(v_occurrences, 0) + 1,
        raw_value = COALESCE(p_raw_value, raw_value),
        context = COALESCE(p_context, context),
        detail = COALESCE(p_detail, detail),
        severity = p_severity,
        is_resolved = false,
        resolved_at = NULL
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO data_quality_issues (
      issue_type, table_name, field_name, record_id, raw_value,
      context, detail, company_id, first_seen, last_seen, occurrences, severity, workflow_status
    ) VALUES (
      p_issue_type, p_table_name, p_field_name, p_record_id, p_raw_value,
      p_context, p_detail, p_company_id, p_now, p_now, 1, p_severity, 'open'
    );
  END IF;
END;
$$;
