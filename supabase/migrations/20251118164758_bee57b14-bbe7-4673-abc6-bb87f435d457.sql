-- Fix Security Definer Views
-- Issue: Views with SECURITY DEFINER enforce creator permissions instead of querying user
-- This violates security best practices and RLS enforcement
-- Solution: Convert all views to SECURITY INVOKER

-- Set all public views to use SECURITY INVOKER
DO $$
DECLARE
    view_record RECORD;
BEGIN
    FOR view_record IN 
        SELECT 
            schemaname,
            viewname
        FROM pg_views
        WHERE schemaname = 'public'
    LOOP
        -- Set all views to use SECURITY INVOKER
        -- This ensures views use the permissions of the querying user, not the creator
        EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true)', 
                      view_record.schemaname, 
                      view_record.viewname);
        
        RAISE NOTICE 'Set security_invoker=true for view: %.%', 
                     view_record.schemaname, view_record.viewname;
    END LOOP;
END;
$$;