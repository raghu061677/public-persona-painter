import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DollarSign, Plus, Trash2 } from "lucide-react";
import { SettingsCard, SettingsContentWrapper, SectionHeader, InputRow, InfoAlert } from "@/components/settings/zoho-style";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Currency {
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  is_base: boolean;
}

export default function CompanyCurrencies() {
  const { company, refreshCompany } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState("INR");
  const [currencies, setCurrencies] = useState<Currency[]>([
    { code: "INR", name: "Indian Rupee", symbol: "₹", exchange_rate: 1, is_base: true },
  ]);
  const [newCurrency, setNewCurrency] = useState({
    code: "",
    name: "",
    symbol: "",
    exchange_rate: 1,
  });

  useEffect(() => {
    if (company) {
      const metadata = (company as any).metadata || {};
      setBaseCurrency(metadata.base_currency || "INR");
      setCurrencies(metadata.currencies || [
        { code: "INR", name: "Indian Rupee", symbol: "₹", exchange_rate: 1, is_base: true },
      ]);
    }
  }, [company]);

  const handleAddCurrency = () => {
    if (!newCurrency.code || !newCurrency.name || !newCurrency.symbol) {
      toast({
        title: "Validation Error",
        description: "Please fill all currency fields",
        variant: "destructive",
      });
      return;
    }

    const exists = currencies.find(c => c.code === newCurrency.code);
    if (exists) {
      toast({
        title: "Currency exists",
        description: "This currency is already added",
        variant: "destructive",
      });
      return;
    }

    setCurrencies([...currencies, { ...newCurrency, is_base: false }]);
    setNewCurrency({ code: "", name: "", symbol: "", exchange_rate: 1 });
  };

  const handleRemoveCurrency = (code: string) => {
    if (code === baseCurrency) {
      toast({
        title: "Cannot remove base currency",
        description: "You cannot remove the base currency",
        variant: "destructive",
      });
      return;
    }
    setCurrencies(currencies.filter(c => c.code !== code));
  };

  const handleUpdateExchangeRate = (code: string, rate: number) => {
    setCurrencies(currencies.map(c => 
      c.code === code ? { ...c, exchange_rate: rate } : c
    ));
  };

  const handleSave = async () => {
    if (!company) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies' as any)
        .update({
          metadata: {
            ...((company as any).metadata || {}),
            base_currency: baseCurrency,
            currencies: currencies,
          }
        })
        .eq('id', company.id);

      if (error) throw error;

      await refreshCompany();

      toast({
        title: "Currency settings updated",
        description: "Your currency configuration has been saved successfully",
      });
    } catch (error: any) {
      console.error("Error updating currencies:", error);
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsContentWrapper>
      <SectionHeader
        title="Currencies"
        description="Manage currencies and exchange rates for multi-currency transactions"
      />

      <InfoAlert variant="info">
        Set your base currency and add additional currencies with exchange rates for international transactions.
      </InfoAlert>

      <SettingsCard
        title="Base Currency"
        description="Primary currency for your organization"
      >
        <InputRow label="Base Currency" description="All amounts will be stored in this currency" required>
          <Select
            value={baseCurrency}
            onValueChange={(value) => setBaseCurrency(value)}
          >
            <SelectTrigger className="max-w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INR">INR - Indian Rupee (₹)</SelectItem>
              <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
              <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
              <SelectItem value="GBP">GBP - British Pound (£)</SelectItem>
              <SelectItem value="AED">AED - UAE Dirham (د.إ)</SelectItem>
              <SelectItem value="SGD">SGD - Singapore Dollar (S$)</SelectItem>
            </SelectContent>
          </Select>
        </InputRow>
      </SettingsCard>

      <SettingsCard
        title="Additional Currencies"
        description="Add currencies for multi-currency transactions"
      >
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency Code</TableHead>
                <TableHead>Currency Name</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Exchange Rate</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currencies.map((currency) => (
                <TableRow key={currency.code}>
                  <TableCell className="font-medium">{currency.code}</TableCell>
                  <TableCell>{currency.name}</TableCell>
                  <TableCell>{currency.symbol}</TableCell>
                  <TableCell>
                    {currency.is_base ? (
                      <span className="text-muted-foreground">Base (1.00)</span>
                    ) : (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={currency.exchange_rate}
                        onChange={(e) => handleUpdateExchangeRate(currency.code, parseFloat(e.target.value) || 1)}
                        className="max-w-[120px]"
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!currency.is_base && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCurrency(currency.code)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-4">Add New Currency</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="new_code">Code</Label>
                <Input
                  id="new_code"
                  value={newCurrency.code}
                  onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
                  placeholder="USD"
                  maxLength={3}
                />
              </div>
              <div>
                <Label htmlFor="new_name">Name</Label>
                <Input
                  id="new_name"
                  value={newCurrency.name}
                  onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
                  placeholder="US Dollar"
                />
              </div>
              <div>
                <Label htmlFor="new_symbol">Symbol</Label>
                <Input
                  id="new_symbol"
                  value={newCurrency.symbol}
                  onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                  placeholder="$"
                />
              </div>
              <div>
                <Label htmlFor="new_rate">Exchange Rate</Label>
                <Input
                  id="new_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newCurrency.exchange_rate}
                  onChange={(e) => setNewCurrency({ ...newCurrency, exchange_rate: parseFloat(e.target.value) || 1 })}
                  placeholder="1.00"
                />
              </div>
            </div>
            <Button onClick={handleAddCurrency} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Currency
            </Button>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Exchange Rate Settings"
        description="Configure how exchange rates are managed"
      >
        <InputRow 
          label="Auto-update Exchange Rates" 
          description="Automatically fetch latest exchange rates daily"
        >
          <Switch defaultChecked={false} />
        </InputRow>

        <InputRow 
          label="Rate Source" 
          description="Source for automatic exchange rate updates"
        >
          <Select defaultValue="manual">
            <SelectTrigger className="max-w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual Entry</SelectItem>
              <SelectItem value="rbi">Reserve Bank of India</SelectItem>
              <SelectItem value="ecb">European Central Bank</SelectItem>
              <SelectItem value="openexchange">Open Exchange Rates</SelectItem>
            </SelectContent>
          </Select>
        </InputRow>
      </SettingsCard>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </SettingsContentWrapper>
  );
}
