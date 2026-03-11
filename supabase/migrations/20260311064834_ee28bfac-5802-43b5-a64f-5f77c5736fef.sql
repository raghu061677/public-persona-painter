-- Update cron schedule from 7:00 AM UTC to 1:30 AM UTC (7:00 AM IST)
-- First unschedule any existing job
SELECT cron.unschedule('scheduled-email-dispatch-daily');

-- Re-schedule at 1:30 AM UTC = 7:00 AM IST
SELECT cron.schedule(
  'scheduled-email-dispatch-daily',
  '30 1 * * *',
  $$SELECT public.invoke_scheduled_email_dispatch();$$
);