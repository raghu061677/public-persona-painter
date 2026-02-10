import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ListViewPreset {
  id: string;
  company_id: string;
  page_key: string;
  preset_name: string;
  is_default: boolean;
  is_shared: boolean;
  created_by: string | null;
  search_query: string;
  filters: Record<string, any>;
  sort: { field: string; direction: "asc" | "desc" };
  selected_fields: string[];
  field_order: string[];
  export_format: string;
  export_style: Record<string, any>;
}

export function useListViewPreset(pageKey: string) {
  const { company } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [presets, setPresets] = useState<ListViewPreset[]>([]);
  const [activePreset, setActivePreset] = useState<ListViewPreset | null>(null);
  const [loading, setLoading] = useState(true);

  const companyId = company?.id;
  const userId = user?.id;

  const loadPresets = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("list_view_presets")
      .select("*")
      .eq("company_id", companyId)
      .eq("page_key", pageKey)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const typed = (data as unknown as ListViewPreset[]);
      setPresets(typed);
      // Auto-select default or first
      const defaultPreset = typed.find((p) => p.is_default) || typed[0] || null;
      if (!activePreset || !typed.find((p) => p.id === activePreset.id)) {
        setActivePreset(defaultPreset);
      }
    }
    setLoading(false);
  }, [companyId, pageKey]);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const savePreset = useCallback(
    async (preset: Partial<ListViewPreset> & { preset_name: string }) => {
      if (!companyId || !userId) return null;

      // If setting as default, unset other defaults first
      if (preset.is_default) {
        await supabase
          .from("list_view_presets")
          .update({ is_default: false })
          .eq("company_id", companyId)
          .eq("page_key", pageKey)
          .eq("is_default", true);
      }

      const payload = {
        company_id: companyId,
        page_key: pageKey,
        created_by: userId,
        ...preset,
      };

      const { data, error } = await supabase
        .from("list_view_presets")
        .insert(payload)
        .select()
        .single();

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return null;
      }

      await loadPresets();
      setActivePreset(data as unknown as ListViewPreset);
      toast({ title: "View saved", description: `"${preset.preset_name}" created successfully` });
      return data as unknown as ListViewPreset;
    },
    [companyId, userId, pageKey, loadPresets, toast]
  );

  const updatePreset = useCallback(
    async (id: string, updates: Partial<ListViewPreset>) => {
      if (!companyId) return;

      if (updates.is_default) {
        await supabase
          .from("list_view_presets")
          .update({ is_default: false })
          .eq("company_id", companyId)
          .eq("page_key", pageKey)
          .eq("is_default", true);
      }

      const { error } = await supabase
        .from("list_view_presets")
        .update(updates)
        .eq("id", id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }

      await loadPresets();
      toast({ title: "View updated" });
    },
    [companyId, pageKey, loadPresets, toast]
  );

  const deletePreset = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("list_view_presets").delete().eq("id", id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      if (activePreset?.id === id) setActivePreset(null);
      await loadPresets();
      toast({ title: "View deleted" });
    },
    [activePreset, loadPresets, toast]
  );

  const duplicatePreset = useCallback(
    async (id: string) => {
      const source = presets.find((p) => p.id === id);
      if (!source) return;
      await savePreset({
        preset_name: `${source.preset_name} (Copy)`,
        is_default: false,
        is_shared: false,
        search_query: source.search_query,
        filters: source.filters,
        sort: source.sort,
        selected_fields: source.selected_fields,
        field_order: source.field_order,
        export_format: source.export_format,
        export_style: source.export_style,
      });
    },
    [presets, savePreset]
  );

  return {
    presets,
    activePreset,
    setActivePreset,
    loading,
    savePreset,
    updatePreset,
    deletePreset,
    duplicatePreset,
    refresh: loadPresets,
  };
}
