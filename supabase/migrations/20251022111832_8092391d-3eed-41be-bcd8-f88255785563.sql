-- Create storage bucket for campaign photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('campaign-photos', 'campaign-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for campaign photos
CREATE POLICY "Anyone can view campaign photos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'campaign-photos');

CREATE POLICY "Authenticated users can upload campaign photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'campaign-photos');

CREATE POLICY "Authenticated users can update their campaign photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'campaign-photos');

CREATE POLICY "Admins can delete campaign photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'campaign-photos' AND public.has_role(auth.uid(), 'admin'));