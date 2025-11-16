import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  email: string;
  redirectUrl?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, redirectUrl } = await req.json() as RequestBody;

    console.log('Generating magic link for:', email);

    // Verify client portal user exists and is active
    const { data: portalUser, error: userError } = await supabase
      .from('client_portal_users')
      .select('*, clients!inner(name)')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (userError || !portalUser) {
      console.error('Portal user not found:', userError);
      return new Response(
        JSON.stringify({ 
          error: 'No active portal access found for this email address' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate magic link token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user with magic link token
    const { error: updateError } = await supabase
      .from('client_portal_users')
      .update({
        magic_link_token: token,
        magic_link_expires_at: expiresAt.toISOString(),
      })
      .eq('id', portalUser.id);

    if (updateError) {
      console.error('Error updating magic link token:', updateError);
      throw updateError;
    }

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const baseUrl = redirectUrl || Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || 'http://localhost:5173';
    const magicLink = `${baseUrl}/portal/auth/verify?token=${token}`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Go-Ads Client Portal <portal@go-ads.in>',
        to: [email],
        subject: 'Your Portal Access Link',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Welcome to Go-Ads Client Portal</h1>
              </div>
              
              <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Click the button below to securely access your campaign dashboard:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${magicLink}" 
                     style="background: #1e40af; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
                    Access Portal
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
                  This link will expire in <strong>15 minutes</strong> and can only be used once.
                </p>
                
                <p style="font-size: 14px; color: #64748b; margin-top: 20px;">
                  If you didn't request this link, you can safely ignore this email.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                  © ${new Date().getFullYear()} Go-Ads. All rights reserved.
                </p>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!emailRes.ok) {
      const emailError = await emailRes.text();
      console.error('Resend API error:', emailError);
      throw new Error('Failed to send email');
    }

    const emailData = await emailRes.json();
    console.log('Email sent successfully:', emailData);

    // Log access attempt
    await supabase.from('client_portal_access_logs').insert({
      client_id: portalUser.client_id,
      action: 'magic_link_requested',
      metadata: {
        email,
        token_expires_at: expiresAt.toISOString(),
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Magic link sent to your email',
        expiresIn: 900, // 15 minutes in seconds
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-magic-link:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
