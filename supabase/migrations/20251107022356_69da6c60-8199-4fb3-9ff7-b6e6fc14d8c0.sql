-- Create import_logs table to track all import operations
CREATE TABLE IF NOT EXISTS public.import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL, -- 'clients', 'media_assets', etc.
  imported_by uuid REFERENCES auth.users(id),
  file_name text NOT NULL,
  total_records integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  skipped_records jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own import logs"
  ON public.import_logs
  FOR SELECT
  USING (imported_by = auth.uid());

CREATE POLICY "Admins can view all import logs"
  ON public.import_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own import logs"
  ON public.import_logs
  FOR INSERT
  WITH CHECK (imported_by = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_import_logs_updated_at
  BEFORE UPDATE ON public.import_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_import_logs_entity_type ON public.import_logs(entity_type);
CREATE INDEX idx_import_logs_imported_by ON public.import_logs(imported_by);
CREATE INDEX idx_import_logs_created_at ON public.import_logs(created_at DESC);