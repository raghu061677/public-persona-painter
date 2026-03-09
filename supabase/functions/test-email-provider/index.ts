/**
 * test-email-provider — Sends a test email using the specified provider config
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { provider_config_id } = await req.json();
    if (!provider_config_id) return new Response(JSON.stringify({ error: 'provider_config_id required' }), { status: 400, headers: corsHeaders });

    // Use service role to read config (contains encrypted credentials)
    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: config, error: cfgErr } = await serviceClient
      .from('email_provider_configs')
      .select('*')
      .eq('id', provider_config_id)
      .single();

    if (cfgErr || !config) return new Response(JSON.stringify({ error: 'Provider not found' }), { status: 404, headers: corsHeaders });

    const testEmail = userData.user.email;
    if (!testEmail) return new Response(JSON.stringify({ error: 'No email on your account' }), { status: 400, headers: corsHeaders });

    if (config.provider_type === 'resend' && config.resend_api_key_encrypted) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.resend_api_key_encrypted}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: config.from_email ? `${config.from_name || 'Go-Ads'} <${config.from_email}>` : 'Go-Ads Test <noreply@go-ads.in>',
          to: [testEmail],
          subject: `[Test] Email Provider: ${config.provider_name}`,
          html: `<h2>Test Email</h2><p>This is a test email from Go-Ads 360° using provider <strong>${config.provider_name}</strong>.</p><p>If you received this, your email provider is configured correctly.</p>`,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        return new Response(JSON.stringify({ error: err.message || 'Failed to send test' }), { status: 500, headers: corsHeaders });
      }
    } else {
      // Fallback to platform Resend for test
      const platformKey = Deno.env.get('RESEND_API_KEY');
      if (!platformKey) return new Response(JSON.stringify({ error: 'No platform email key configured' }), { status: 500, headers: corsHeaders });
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${platformKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Go-Ads 360° <noreply@go-ads.in>',
          to: [testEmail],
          subject: `[Test] Email Provider: ${config.provider_name}`,
          html: `<h2>Test Email</h2><p>This is a test email sent via platform fallback for provider <strong>${config.provider_name}</strong>.</p>`,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ success: true, sent_to: testEmail }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
