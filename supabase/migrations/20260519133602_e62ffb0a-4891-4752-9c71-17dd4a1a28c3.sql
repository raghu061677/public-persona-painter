INSERT INTO public.app_settings (key, value) VALUES ('social_whatsapp_message', 'Hi Go-Ads team') ON CONFLICT (key) DO NOTHING;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;