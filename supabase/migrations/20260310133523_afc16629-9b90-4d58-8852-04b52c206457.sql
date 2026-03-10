
-- Create a helper function to invoke the scheduled email dispatch
-- This runs within the database context and can access vault secrets
CREATE OR REPLACE FUNCTION public.invoke_scheduled_email_dispatch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _secret text;
  _url text;
BEGIN
  -- Read cron secret from vault
  SELECT decrypted_secret INTO _secret
  FROM vault.decrypted_secrets
  WHERE name = 'CRON_HMAC_SECRET'
  LIMIT 1;

  IF _secret IS NULL THEN
    RAISE WARNING 'CRON_HMAC_SECRET not found in vault, using fallback';
    RETURN;
  END IF;

  _url := 'https://psryfvfdmjguhamvmqqd.supabase.co/functions/v1/scheduled-email-dispatch';

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', _secret
    ),
    body := jsonb_build_object('time', now()::text)
  );
END;
$$;
