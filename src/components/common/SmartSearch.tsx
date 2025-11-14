import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type SearchResult = {
  id: string;
  type: "asset" | "client" | "plan" | "campaign";
  title: string;
  subtitle?: string;
  url: string;
};

export function SmartSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    const labels = {
      asset: "Media Asset",
      client: "Client",
      plan: "Plan",
      campaign: "Campaign",
    };
    return labels[type as keyof typeof labels];
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Quick search..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setOpen(true)}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search assets, clients, plans..." />
          <CommandList>
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            {!loading && results.length === 0 && search.length >= 2 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            {!loading && results.length > 0 && (
              <CommandGroup heading="Results">
                {results.map((result) => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    onSelect={() => handleSelect(result.url)}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{result.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {getTypeLabel(result.type)}
                        </span>
                      </div>
                      {result.subtitle && (
                        <span className="text-sm text-muted-foreground">
                          {result.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
