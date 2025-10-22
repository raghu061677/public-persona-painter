import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandItem,
  CommandGroup,
  CommandEmpty,
} from "@/components/ui/command";
import { Users, MapPin, Layers, Briefcase, FileText, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SearchItem {
  id: string;
  type: string;
  label: string;
  path: string;
  icon: any;
}

export default function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const navigate = useNavigate();

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      const searchItems: SearchItem[] = [];

      // Load clients (assuming you have a clients table)
      // const { data: clients } = await supabase.from('clients').select('id, name').limit(20);
      // if (clients) {
      //   clients.forEach((client) => {
      //     searchItems.push({
      //       id: client.id,
      //       type: 'client',
      //       label: client.name,
      //       path: `/admin/clients/${client.id}`,
      //       icon: Users,
      //     });
      //   });
      // }

      setItems(searchItems);
    } catch (error) {
      console.error('Error loading search data:', error);
    }
  };

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (path: string) => {
    onOpenChange(false);
    navigate(path);
    setSearch("");
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search clients, assets, plans, campaigns..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => handleSelect("/admin/clients/new")}>
            <Plus className="w-4 h-4 mr-2" />
            New Client
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/admin/plans/new")}>
            <Plus className="w-4 h-4 mr-2" />
            New Plan
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/admin/media-assets/new")}>
            <Plus className="w-4 h-4 mr-2" />
            New Media Asset
          </CommandItem>
        </CommandGroup>

        {filteredItems.length > 0 && (
          <CommandGroup heading="Results">
            {filteredItems.slice(0, 20).map((item) => (
              <CommandItem key={item.id} onSelect={() => handleSelect(item.path)}>
                <item.icon className="w-4 h-4 mr-2" />
                {item.label}
                <span className="ml-auto text-xs text-muted-foreground">{item.type}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => handleSelect("/dashboard")}>
            <Briefcase className="w-4 h-4 mr-2" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/admin/clients")}>
            <Users className="w-4 h-4 mr-2" />
            Clients
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/admin/media-assets")}>
            <MapPin className="w-4 h-4 mr-2" />
            Media Assets
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/admin/plans")}>
            <Layers className="w-4 h-4 mr-2" />
            Plans
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/admin/campaigns")}>
            <Briefcase className="w-4 h-4 mr-2" />
            Campaigns
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/finance")}>
            <FileText className="w-4 h-4 mr-2" />
            Finance
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
