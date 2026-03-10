-- Ensure campaign photo upload/read works for field roles (sales/ops/installation/mounting/etc.)
-- without granting financial/edit permissions.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'campaign_assets'
      AND policyname = 'campaign_assets_select_upload_roles'
  ) THEN
    CREATE POLICY campaign_assets_select_upload_roles
    ON public.campaign_assets
    FOR SELECT
    TO authenticated
    USING (
      is_platform_admin(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.campaigns c
        WHERE c.id = campaign_assets.campaign_id
          AND c.company_id = current_company_id()
          AND (
            has_company_role(ARRAY[
              'admin'::app_role,
              'sales'::app_role,
              'operations'::app_role,
              'operations_manager'::app_role,
              'installation'::app_role,
              'mounting'::app_role,
              'monitor'::app_role,
              'monitoring'::app_role,
              'viewer'::app_role,
              'user'::app_role
            ])
            OR c.created_by = auth.uid()
            OR c.owner_id = auth.uid()
            OR auth.uid() = ANY (c.secondary_owner_ids)
          )
      )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'media_photos'
      AND policyname = 'media_photos_insert_field_upload_roles'
  ) THEN
    CREATE POLICY media_photos_insert_field_upload_roles
    ON public.media_photos
    FOR INSERT
    TO authenticated
    WITH CHECK (
      (company_id = current_company_id() OR is_platform_admin(auth.uid()))
      AND (
        has_company_role(ARRAY[
          'admin'::app_role,
          'sales'::app_role,
          'operations'::app_role,
          'operations_manager'::app_role,
          'installation'::app_role,
          'mounting'::app_role,
          'monitor'::app_role,
          'monitoring'::app_role,
          'viewer'::app_role,
          'user'::app_role
        ])
        OR uploaded_by = auth.uid()
      )
    );
  END IF;
END
$$;