import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if Matrix Network Solutions already exists
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('name', 'Matrix Network Solutions')
      .single()

    let matrixCompanyId: string

    if (existingCompany) {
      matrixCompanyId = existingCompany.id
      console.log('Matrix Network Solutions already exists:', matrixCompanyId)
    } else {
      // Create Matrix Network Solutions company
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: 'Matrix Network Solutions',
          legal_name: 'Matrix Network Solutions Pvt Ltd',
          type: 'media_owner',
          status: 'active',
          gstin: '36AATFM4107H2Z3',
          pan: 'AATFM4107H',
          address_line1: 'Plot No. 123, Road No. 36',
          address_line2: 'Jubilee Hills',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500033',
          country: 'India',
          phone: '+91-9876543210',
          email: 'info@matrixnetwork.in',
          website: 'https://matrixnetwork.in',
          theme_color: '#1e40af',
          secondary_color: '#10b981',
        })
        .select()
        .single()

      if (companyError) throw companyError
      matrixCompanyId = newCompany.id
      console.log('Created Matrix Network Solutions:', matrixCompanyId)
    }

    // Migrate existing media_assets without company_id
    const { data: assetsToMigrate } = await supabase
      .from('media_assets')
      .select('id')
      .is('company_id', null)

    let assetsMigrated = 0
    if (assetsToMigrate && assetsToMigrate.length > 0) {
      const { error: assetsMigrationError } = await supabase
        .from('media_assets')
        .update({ company_id: matrixCompanyId })
        .is('company_id', null)

      if (assetsMigrationError) throw assetsMigrationError
      assetsMigrated = assetsToMigrate.length
      console.log(`Migrated ${assetsMigrated} media assets to Matrix`)
    }

    // Migrate existing clients without company_id
    const { data: clientsToMigrate } = await supabase
      .from('clients')
      .select('id')
      .is('company_id', null)

    let clientsMigrated = 0
    if (clientsToMigrate && clientsToMigrate.length > 0) {
      const { error: clientsMigrationError } = await supabase
        .from('clients')
        .update({ company_id: matrixCompanyId })
        .is('company_id', null)

      if (clientsMigrationError) throw clientsMigrationError
      clientsMigrated = clientsToMigrate.length
      console.log(`Migrated ${clientsMigrated} clients to Matrix`)
    }

    // Migrate existing leads without company_id
    const { data: leadsToMigrate } = await supabase
      .from('leads')
      .select('id')
      .is('company_id', null)

    let leadsMigrated = 0
    if (leadsToMigrate && leadsToMigrate.length > 0) {
      const { error: leadsMigrationError } = await supabase
        .from('leads')
        .update({ company_id: matrixCompanyId })
        .is('company_id', null)

      if (leadsMigrationError) throw leadsMigrationError
      leadsMigrated = leadsToMigrate.length
      console.log(`Migrated ${leadsMigrated} leads to Matrix`)
    }

    // Migrate existing campaigns without company_id
    const { data: campaignsToMigrate } = await supabase
      .from('campaigns')
      .select('id')
      .is('company_id', null)

    let campaignsMigrated = 0
    if (campaignsToMigrate && campaignsToMigrate.length > 0) {
      const { error: campaignsMigrationError } = await supabase
        .from('campaigns')
        .update({ company_id: matrixCompanyId })
        .is('company_id', null)

      if (campaignsMigrationError) throw campaignsMigrationError
      campaignsMigrated = campaignsToMigrate.length
      console.log(`Migrated ${campaignsMigrated} campaigns to Matrix`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        company_id: matrixCompanyId,
        migrations: {
          assets: assetsMigrated,
          clients: clientsMigrated,
          leads: leadsMigrated,
          campaigns: campaignsMigrated,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error in setup-matrix-company:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
