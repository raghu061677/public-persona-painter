import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeStr(s: string | null | undefined): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function similarityScore(a: string, b: string): number {
  const na = normalizeStr(a);
  const nb = normalizeStr(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const tokensA = new Set(na.split(/\s+/));
  const tokensB = new Set(nb.split(/\s+/));
  const intersection = [...tokensA].filter(t => tokensB.has(t)).length;
  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? intersection / union : 0;
}

function getEmailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

interface MatchResult {
  clientId: string;
  clientName: string;
  company: string | null;
  gstNumber: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  confidence: number;
  reason: string;
}

function scoreMatch(lead: any, client: any): MatchResult | null {
  let bestConfidence = 0;
  let bestReason = '';

  const leadGst = lead.gst || lead.gst_number || null;

  if (leadGst && client.gst_number && normalizeStr(leadGst) === normalizeStr(client.gst_number)) {
    bestConfidence = 100;
    bestReason = 'gst_match';
  }

  if (bestConfidence < 95 && lead.email && client.email && normalizeStr(lead.email) === normalizeStr(client.email)) {
    bestConfidence = 95;
    bestReason = 'email_match';
  }

  if (bestConfidence < 90 && lead.phone && client.phone) {
    const lp = (lead.phone || '').replace(/[\s\-\(\)\+]/g, '').slice(-10);
    const cp = (client.phone || '').replace(/[\s\-\(\)\+]/g, '').slice(-10);
    if (lp.length >= 10 && lp === cp) {
      bestConfidence = 90;
      bestReason = 'phone_match';
    }
  }

  if (bestConfidence < 88) {
    const leadName = lead.company || lead.name || '';
    if (normalizeStr(leadName) === normalizeStr(client.name) || 
        (client.company && normalizeStr(leadName) === normalizeStr(client.company))) {
      bestConfidence = 88;
      bestReason = 'company_name_match';
    }
  }

  if (bestConfidence < 75) {
    const leadName = lead.company || lead.name || '';
    const nameSim = Math.max(
      similarityScore(leadName, client.name),
      client.company ? similarityScore(leadName, client.company) : 0
    );
    const leadCity = normalizeStr(lead.location);
    const clientCity = normalizeStr(client.city || client.billing_city);
    const sameCity = leadCity && clientCity && (leadCity.includes(clientCity) || clientCity.includes(leadCity));
    if (nameSim >= 0.6 && sameCity) {
      bestConfidence = 75;
      bestReason = 'name_city_match';
    }
  }

  if (bestConfidence < 70) {
    const leadDomain = getEmailDomain(lead.email);
    const clientDomain = getEmailDomain(client.email);
    const leadCity = normalizeStr(lead.location);
    const clientCity = normalizeStr(client.city || client.billing_city);
    const sameCity = leadCity && clientCity && (leadCity.includes(clientCity) || clientCity.includes(leadCity));
    if (leadDomain && clientDomain && leadDomain === clientDomain && 
        !['gmail.com','yahoo.com','hotmail.com','outlook.com'].includes(leadDomain) && sameCity) {
      bestConfidence = 70;
      bestReason = 'domain_match';
    }
  }

  if (bestConfidence < 55 && lead.location && client.address) {
    if (similarityScore(lead.location, client.address) >= 0.5) {
      bestConfidence = 55;
      bestReason = 'address_match';
    }
  }

  if (bestConfidence < 40) return null;

  return {
    clientId: client.id,
    clientName: client.name,
    company: client.company,
    gstNumber: client.gst_number,
    email: client.email,
    phone: client.phone,
    city: client.city,
    confidence: bestConfidence,
    reason: bestReason,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: companyUser } = await supabase
      .from('company_users')
      .select('company_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!companyUser) {
      return new Response(JSON.stringify({ error: 'No active company' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'check_match') {
      const { lead } = body;
      
      // Fetch all clients for this company
      const { data: clients, error: cErr } = await supabase
        .from('clients')
        .select('id, name, company, gst_number, email, phone, city, address, billing_city')
        .eq('company_id', companyUser.company_id);

      if (cErr) throw cErr;

      const matches: MatchResult[] = [];
      for (const client of (clients || [])) {
        const leadData = {
          ...lead,
          gst: lead.gst || (lead.metadata?.gst) || (lead.metadata?.gst_number) || null,
        };
        const match = scoreMatch(leadData, client);
        if (match) matches.push(match);
      }
      matches.sort((a, b) => b.confidence - a.confidence);

      return new Response(JSON.stringify({ matches, company_id: companyUser.company_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'execute_merge') {
      const { lead_id, client_id, merge_reason, confidence } = body;

      // Update lead
      const { error: updateErr } = await supabase
        .from('leads')
        .update({
          matched_client_id: client_id,
          client_id: client_id,
          merge_status: confidence >= 90 ? 'auto_merged' : 'manually_merged',
          merge_confidence: confidence,
          merge_reason: merge_reason,
          status: 'won',
          converted_at: new Date().toISOString(),
          assigned_to: user.id,
        })
        .eq('id', lead_id);

      if (updateErr) throw updateErr;

      // Get lead data for contact creation
      const { data: leadData } = await supabase
        .from('leads')
        .select('*')
        .eq('id', lead_id)
        .single();

      // Add lead as contact person if we have contact info
      if (leadData && (leadData.phone || leadData.email)) {
        await supabase.from('client_contacts').insert({
          client_id: client_id,
          company_id: companyUser.company_id,
          name: leadData.name || 'Unknown',
          phone: leadData.phone,
          mobile: leadData.phone,
          email: leadData.email,
          designation: 'Lead Contact',
          notes: `Auto-added from lead merge. Source: ${leadData.source}. Requirement: ${leadData.requirement || 'N/A'}`,
          created_by: user.id,
        });
      }

      return new Response(JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'submit_review') {
      const { lead_id, decision, client_id } = body;
      // decision: 'approve_merge' | 'reject' | 'create_new'
      
      if (decision === 'approve_merge') {
        const { data: lead } = await supabase.from('leads').select('*').eq('id', lead_id).single();
        
        await supabase.from('leads').update({
          matched_client_id: client_id,
          client_id: client_id,
          merge_status: 'manually_merged',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          status: 'won',
          converted_at: new Date().toISOString(),
        }).eq('id', lead_id);

        if (lead && (lead.phone || lead.email)) {
          await supabase.from('client_contacts').insert({
            client_id: client_id,
            company_id: companyUser.company_id,
            name: lead.name || 'Unknown',
            phone: lead.phone,
            mobile: lead.phone,
            email: lead.email,
            designation: 'Lead Contact',
            notes: `Merged after review. Source: ${lead.source}`,
            created_by: user.id,
          });
        }
      } else if (decision === 'reject' || decision === 'create_new') {
        await supabase.from('leads').update({
          merge_status: 'new_client_created',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          matched_client_id: null,
        }).eq('id', lead_id);
      }

      return new Response(JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
