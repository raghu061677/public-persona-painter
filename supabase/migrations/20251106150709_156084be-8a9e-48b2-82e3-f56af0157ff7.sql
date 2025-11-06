-- Create client documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
);

-- Create document_type enum
CREATE TYPE document_type AS ENUM (
  'KYC',
  'GST_Certificate',
  'PAN_Card',
  'Aadhar_Card',
  'Company_Registration',
  'Contract',
  'Agreement',
  'Invoice',
  'Other'
);

-- Create client_documents table
CREATE TABLE public.client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  document_type document_type NOT NULL,
  document_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on client_documents
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_documents table
CREATE POLICY "Admin and sales can view all client documents"
  ON public.client_documents
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'sales'::app_role) OR
    has_role(auth.uid(), 'finance'::app_role)
  );

CREATE POLICY "Admin and sales can upload client documents"
  ON public.client_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'sales'::app_role)
  );

CREATE POLICY "Admin can delete client documents"
  ON public.client_documents
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin and sales can update client documents"
  ON public.client_documents
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'sales'::app_role)
  );

-- RLS Policies for client-documents storage bucket
CREATE POLICY "Admin and sales can upload client documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents' AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role))
  );

CREATE POLICY "Admin, sales and finance can view client documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'client-documents' AND
    (has_role(auth.uid(), 'admin'::app_role) OR 
     has_role(auth.uid(), 'sales'::app_role) OR
     has_role(auth.uid(), 'finance'::app_role))
  );

CREATE POLICY "Admin can delete client documents from storage"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'client-documents' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Create indexes for better performance
CREATE INDEX idx_client_documents_client_id ON public.client_documents(client_id);
CREATE INDEX idx_client_documents_document_type ON public.client_documents(document_type);
CREATE INDEX idx_client_documents_uploaded_at ON public.client_documents(uploaded_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_client_documents_updated_at
  BEFORE UPDATE ON public.client_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();