-- Grant SELECT on public_media_assets_safe view to anon role for marketplace access
GRANT SELECT ON public_media_assets_safe TO anon;
GRANT SELECT ON public_media_assets_safe TO authenticated;