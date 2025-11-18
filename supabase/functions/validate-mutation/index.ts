// Priority 2.7: Server-side input validation for mutations
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const validationRules = {
  client: {
    name: { required: true, maxLength: 255, minLength: 2 },
    email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, maxLength: 255 },
    phone: { pattern: /^\+?[\d\s-()]+$/, maxLength: 20 },
    gst_number: { pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/ },
    billing_pincode: { pattern: /^\d{6}$/ },
  },
  media_asset: {
    id: { required: true, pattern: /^[A-Z]{3}-[A-Z]{3}-\d{4}$/ },
    city: { required: true, maxLength: 100 },
    area: { required: true, maxLength: 100 },
    location: { required: true, maxLength: 500 },
    media_type: { required: true, maxLength: 100 },
    dimensions: { required: true, pattern: /^\d+x\d+$/ },
    card_rate: { required: true, min: 0, max: 10000000 },
    latitude: { min: -90, max: 90 },
    longitude: { min: -180, max: 180 },
  },
  plan: {
    client_id: { required: true },
    start_date: { required: true, type: 'date' },
    end_date: { required: true, type: 'date' },
    grand_total: { required: true, min: 0 },
  },
  campaign: {
    campaign_name: { required: true, maxLength: 255, minLength: 3 },
    client_id: { required: true },
    start_date: { required: true, type: 'date' },
    end_date: { required: true, type: 'date' },
    total_amount: { required: true, min: 0 },
  },
};

function validateField(value: any, rules: any, fieldName: string): string[] {
  const errors: string[] = [];

  if (rules.required && (value === null || value === undefined || value === '')) {
    errors.push(`${fieldName} is required`);
    return errors;
  }

  if (value === null || value === undefined || value === '') {
    return errors; // Skip other validations if not required and empty
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    errors.push(`${fieldName} must be at most ${rules.maxLength} characters`);
  }

  if (rules.minLength && value.length < rules.minLength) {
    errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
  }

  if (rules.pattern && !rules.pattern.test(value)) {
    errors.push(`${fieldName} has invalid format`);
  }

  if (rules.min !== undefined && parseFloat(value) < rules.min) {
    errors.push(`${fieldName} must be at least ${rules.min}`);
  }

  if (rules.max !== undefined && parseFloat(value) > rules.max) {
    errors.push(`${fieldName} must be at most ${rules.max}`);
  }

  if (rules.type === 'date') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      errors.push(`${fieldName} must be a valid date`);
    }
  }

  return errors;
}

function validateEntity(entityType: string, data: any): { valid: boolean; errors: string[] } {
  const schema = validationRules[entityType as keyof typeof validationRules];
  if (!schema) {
    return { valid: false, errors: [`Unknown entity type: ${entityType}`] };
  }

  const errors: string[] = [];

  for (const [field, rules] of Object.entries(schema)) {
    const fieldErrors = validateField(data[field], rules, field);
    errors.push(...fieldErrors);
  }

  // Additional cross-field validations
  if (entityType === 'plan' || entityType === 'campaign') {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    if (endDate <= startDate) {
      errors.push('end_date must be after start_date');
    }
  }

  return { valid: errors.length === 0, errors };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { entityType, data, operation } = await req.json();

    console.log(`Validating ${operation} operation for ${entityType}`, { userId: user.id });

    // Validate input
    const validation = validateEntity(entityType, data);
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          errors: validation.errors 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify user has company association
    const { data: companyUser, error: companyError } = await supabase
      .from('company_users')
      .select('company_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (companyError || !companyUser) {
      return new Response(
        JSON.stringify({ error: 'No active company association found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Additional authorization checks based on operation
    if (operation === 'delete' && !['admin', 'sales'].includes(companyUser.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions for delete operation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log validation success
    await supabase.rpc('log_activity', {
      p_action: `validated_${operation}`,
      p_resource_type: entityType,
      p_resource_id: data.id || null,
      p_details: { operation, entityType }
    });

    return new Response(
      JSON.stringify({ 
        valid: true, 
        message: 'Validation passed',
        company_id: companyUser.company_id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Validation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
