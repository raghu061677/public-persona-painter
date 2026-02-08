-- Add WhatsApp recipients column to daily_digest_settings
ALTER TABLE public.daily_digest_settings
ADD COLUMN whatsapp_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN whatsapp_recipients text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.daily_digest_settings.whatsapp_enabled IS 'Enable WhatsApp daily digest delivery';
COMMENT ON COLUMN public.daily_digest_settings.whatsapp_recipients IS 'Phone numbers in international format (e.g. 919876543210) for WhatsApp digest';