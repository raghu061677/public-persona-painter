import { Building2, ChevronsUpDown, Check, Shield } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface CompanySwitcherProps {
  collapsed?: boolean;
}

export function CompanySwitcher({ collapsed }: CompanySwitcherProps) {
  const { company, allCompanies, switchCompany, isPlatformAdmin, companyUser } = useCompany();
  const [open, setOpen] = useState(false);

  if (!company) return null;

  // If only one company or collapsed, show simple view
  if (allCompanies.length <= 1 || collapsed) {
    return (
      <div className="px-2 py-3">
        <div className="flex items-center justify-center p-2 rounded-xl bg-accent/50">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {!collapsed && (
              <span className="text-sm font-semibold">{company.name}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Group companies by whether user is a member
  const memberCompanies = allCompanies.filter(c => 
    companyUser?.company_id === c.id || 
    allCompanies.some(ac => ac.id === c.id)
  );
  
  const platformAccessCompanies = isPlatformAdmin 
    ? allCompanies.filter(c => !memberCompanies.some(mc => mc.id === c.id))
    : [];

  return (
    <div className="px-3 py-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between p-3 h-auto rounded-xl bg-accent/30 border border-border/40 hover:bg-accent/50"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold truncate">{company.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{company.type.replace('_', ' ')}</p>
              </div>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search companies..." />
            <CommandList>
              <CommandEmpty>No companies found.</CommandEmpty>
              
              {memberCompanies.length > 0 && (
                <CommandGroup heading="Your Companies">
                  {memberCompanies.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={c.name}
                      onSelect={() => {
                        switchCompany(c.id);
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Building2 className="h-4 w-4 shrink-0 text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{c.type.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "ml-2 h-4 w-4 shrink-0",
                          company.id === c.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {isPlatformAdmin && platformAccessCompanies.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Platform Admin Access">
                    {platformAccessCompanies.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.name}
                        onSelect={() => {
                          switchCompany(c.id);
                          setOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Building2 className="h-4 w-4 shrink-0 text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{c.type.replace('_', ' ')}</p>
                          </div>
                          <Shield className="h-3 w-3 text-primary shrink-0" />
                        </div>
                        <Check
                          className={cn(
                            "ml-2 h-4 w-4 shrink-0",
                            company.id === c.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
