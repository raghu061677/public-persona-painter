import { supabase } from "@/integrations/supabase/client";
import { getStateCode } from "@/lib/stateCodeMapping";

interface ClientRecord {
  id: string;
  state: string;
}

export async function migrateClientIds() {
  try {
    console.log("Starting client ID migration...");

    // Fetch all clients
    const { data: clients, error: fetchError } = await supabase
      .from('clients')
      .select('id, state')
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;
    if (!clients || clients.length === 0) {
      console.log("No clients found to migrate");
      return { success: 0, errors: 0, skipped: 0 };
    }

    // Group clients by state code
    const clientsByState = new Map<string, ClientRecord[]>();
    
    for (const client of clients) {
      if (!client.state) continue;
      
      const stateCode = getStateCode(client.state);
      if (!clientsByState.has(stateCode)) {
        clientsByState.set(stateCode, []);
      }
      clientsByState.get(stateCode)!.push(client);
    }

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Process each state group
    for (const [stateCode, stateClients] of clientsByState.entries()) {
      let sequence = 1;
      
      for (const client of stateClients) {
        const newId = `${stateCode}-${String(sequence).padStart(4, '0')}`;
        
        // Skip if already in correct format
        if (client.id === newId) {
          console.log(`Skipped ${client.id} - already in correct format`);
          skippedCount++;
          sequence++;
          continue;
        }

        try {
          // Update related tables first
          await supabase
            .from('plans')
            .update({ client_id: newId })
            .eq('client_id', client.id);

          await supabase
            .from('campaigns')
            .update({ client_id: newId })
            .eq('client_id', client.id);

          await supabase
            .from('estimations')
            .update({ client_id: newId })
            .eq('client_id', client.id);

          await supabase
            .from('invoices')
            .update({ client_id: newId })
            .eq('client_id', client.id);

          await supabase
            .from('client_documents')
            .update({ client_id: newId })
            .eq('client_id', client.id);

          // Update the client ID
          const { error: updateError } = await supabase
            .from('clients')
            .update({ id: newId })
            .eq('id', client.id);

          if (updateError) throw updateError;

          console.log(`Updated ${client.id} → ${newId}`);
          successCount++;
        } catch (error: any) {
          console.error(`Failed to update ${client.id}:`, error);
          errorCount++;
        }

        sequence++;
      }
    }

    console.log("Migration complete:", { successCount, errorCount, skippedCount });
    return { success: successCount, errors: errorCount, skipped: skippedCount };
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  }
}
