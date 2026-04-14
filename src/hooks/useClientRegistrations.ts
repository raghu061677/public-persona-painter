import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ClientRegistration {
  id: string;
  client_id: string;
  label: string;
  gstin: string | null;
  billing_state: string | null;
  billing_city: string | null;
  state_code: string | null;
  is_default: boolean;
  is_active: boolean;
  registration_type: string;
}

export function useClientRegistrations(clientId: string | null) {
  const [registrations, setRegistrations] = useState<ClientRegistration[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId) {
      setRegistrations([]);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("client_registrations")
        .select("id, client_id, label, gstin, billing_state, billing_city, state_code, is_default, is_active, registration_type")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("is_default", { ascending: false });
      setRegistrations((data as ClientRegistration[]) || []);
      setLoading(false);
    };

    fetch();
  }, [clientId]);

  const defaultRegistration = registrations.find(r => r.is_default) || registrations[0] || null;

  return { registrations, loading, defaultRegistration };
}
