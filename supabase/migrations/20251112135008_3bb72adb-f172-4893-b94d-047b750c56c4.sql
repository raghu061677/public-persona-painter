-- Enable pg_cron extension for scheduling
create extension if not exists pg_cron with schema extensions;

-- Enable pg_net extension for HTTP requests
create extension if not exists pg_net with schema extensions;

-- Grant usage on cron schema to postgres role
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;