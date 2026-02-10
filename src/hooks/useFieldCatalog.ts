import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FieldCatalogEntry {
  id: string;
  page_key: string;
  field_key: string;
  label: string;
  group_name: string;
  data_type: string;
  is_default: boolean;
  is_exportable: boolean;
  is_filterable: boolean;
  sort_order: number;
  width: number | null;
}

export function useFieldCatalog(pageKey: string) {
  const [fields, setFields] = useState<FieldCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFields = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("page_field_catalog")
      .select("*")
      .eq("page_key", pageKey)
      .order("sort_order", { ascending: true });

    if (!error && data) {
      setFields(data as FieldCatalogEntry[]);
    }
    setLoading(false);
  }, [pageKey]);

  useEffect(() => {
    loadFields();
  }, [loadFields]);

  const defaultFieldKeys = fields.filter((f) => f.is_default).map((f) => f.field_key);
  const groups = [...new Set(fields.map((f) => f.group_name))];

  return { fields, defaultFieldKeys, groups, loading, refresh: loadFields };
}
