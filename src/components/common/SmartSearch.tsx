import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useCompany } from "@/contexts/CompanyContext";

type SearchResult = {
  id: string;
  type: "asset" | "client" | "plan" | "campaign" | "invoice";
  title: string;
  subtitle?: string;
  url: string;
};

const TYPE_COLORS: Record<string, string> = {
  asset: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  client: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  plan: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  campaign: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  invoice: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

export function SmartSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { company } = useCompany();

  useEffect(() => {
    const searchData = async () => {
      if (!search || search.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      const searchLower = search.toLowerCase();
      const allResults: SearchResult[] = [];

      try {
        // Search media assets
        const { data: assets } = await supabase
          .from("media_assets")
          .select("id, location, area, city, media_type")
          .or(`id.ilike.%${searchLower}%,location.ilike.%${searchLower}%,area.ilike.%${searchLower}%,city.ilike.%${searchLower}%`)
          .limit(5);

        if (assets) {
          allResults.push(
            ...assets.map((a) => ({
              id: a.id,
              type: "asset" as const,
              title: a.id,
              subtitle: `${a.media_type} - ${a.location}, ${a.area}`,
              url: `/admin/media-assets/${a.id}`,
            }))
          );
        }

        // Search clients
        const { data: clients } = await supabase
          .from("clients")
          .select("id, name, company, city")
          .or(`name.ilike.%${searchLower}%,company.ilike.%${searchLower}%`)
          .limit(5);

        if (clients) {
          allResults.push(
            ...clients.map((c) => ({
              id: c.id,
              type: "client" as const,
              title: c.name,
              subtitle: c.company || c.city || "",
              url: `/admin/clients/${c.id}`,
            }))
          );
        }

        // Search plans
        const { data: plans } = await supabase
          .from("plans")
          .select("id, plan_name, client_name")
          .or(`id.ilike.%${searchLower}%,plan_name.ilike.%${searchLower}%,client_name.ilike.%${searchLower}%`)
          .limit(5);

        if (plans) {
          allResults.push(
            ...plans.map((p) => ({
              id: p.id,
              type: "plan" as const,
              title: p.plan_name || p.id,
              subtitle: `Client: ${p.client_name}`,
              url: `/admin/plans/${p.id}`,
            }))
          );
        }

        // Search campaigns
        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("id, campaign_name, client_name")
          .or(`id.ilike.%${searchLower}%,campaign_name.ilike.%${searchLower}%,client_name.ilike.%${searchLower}%`)
          .limit(5);

        if (campaigns) {
          allResults.push(
            ...campaigns.map((c) => ({
              id: c.id,
              type: "campaign" as const,
              title: c.campaign_name,
              subtitle: `Client: ${c.client_name}`,
              url: `/admin/campaigns/${c.id}`,
            }))
          );
        }

        // Search invoices
        const { data: invoices } = await supabase
          .from("invoices")
          .select("id, client_name, total_amount, status")
          .or(`id.ilike.%${searchLower}%,client_name.ilike.%${searchLower}%`)
          .limit(5);

        if (invoices) {
          allResults.push(
            ...invoices.map((inv) => ({
              id: inv.id,
              type: "invoice" as const,
              title: inv.id,
              subtitle: `${inv.client_name} • ${inv.status}`,
              url: `/admin/invoices/view/${encodeURIComponent(inv.id)}`,
            }))
          );
        }

        setResults(allResults);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleSelect = (url: string) => {
    navigate(url);
    setOpen(false);
    setSearch("");
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      asset: "Asset",
      client: "Client",
      plan: "Plan",
      campaign: "Campaign",
      invoice: "Invoice",
    };
    return labels[type] || type;
  };

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <Popover open={open && (search.length >= 2 || results.length > 0)} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Quick search... (⌘K)"
            className="pl-9 pr-3"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value.length >= 2) setOpen(true);
            }}
            onFocus={() => {
              if (search.length >= 2) setOpen(true);
            }}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0 z-[200]" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}
          {!loading && results.length === 0 && search.length >= 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No results found for "{search}"
            </div>
          )}
          {!loading && results.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                {results.length} result{results.length !== 1 ? "s" : ""}
              </div>
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result.url)}
                  className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors cursor-pointer flex items-start gap-3"
                >
                  <span className={cn("text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap", TYPE_COLORS[result.type])}>
                    {getTypeLabel(result.type)}
                  </span>
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="font-medium text-sm truncate">{result.title}</span>
                    {result.subtitle && (
                      <span className="text-xs text-muted-foreground truncate">
                        {result.subtitle}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
