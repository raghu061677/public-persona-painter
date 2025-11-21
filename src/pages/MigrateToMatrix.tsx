import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Database, CheckCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function MigrateToMatrix() {
  const { toast } = useToast();
  const [migrating, setMigrating] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleMigrate = async () => {
    const confirmed = window.confirm(
      "This will migrate ALL existing data to Matrix Network Solutions. This operation cannot be undone. Continue?"
    );

    if (!confirmed) return;

    try {
      setMigrating(true);
      setResults(null);

      // Get Matrix Network Solutions company ID
      const { data: matrixCompany, error: matrixError } = await supabase
        .from('companies')
        .select('id, name')
        .ilike('name', '%matrix%')
        .single();

      if (matrixError || !matrixCompany) {
        throw new Error('Matrix Network Solutions company not found. Please create it first.');
      }

      const matrixId = matrixCompany.id;
      const migrationResults = {
        company: matrixCompany.name,
        media_assets: 0,
        clients: 0,
        plans: 0,
        campaigns: 0,
        invoices: 0,
        estimations: 0,
        expenses: 0,
        errors: [] as string[],
      };

      // Migrate media_assets
      const { count: assetsCount, error: assetsError } = await supabase
        .from('media_assets')
        .update({ company_id: matrixId })
        .is('company_id', null);

      if (assetsError) {
        migrationResults.errors.push(`Media Assets: ${assetsError.message}`);
      } else {
        migrationResults.media_assets = assetsCount || 0;
      }

      // Migrate clients
      const { count: clientsCount, error: clientsError } = await supabase
        .from('clients')
        .update({ company_id: matrixId })
        .is('company_id', null);

      if (clientsError) {
        migrationResults.errors.push(`Clients: ${clientsError.message}`);
      } else {
        migrationResults.clients = clientsCount || 0;
      }

      // Migrate plans
      const { count: plansCount, error: plansError } = await supabase
        .from('plans')
        .update({ company_id: matrixId })
        .is('company_id', null);

      if (plansError) {
        migrationResults.errors.push(`Plans: ${plansError.message}`);
      } else {
        migrationResults.plans = plansCount || 0;
      }

      // Migrate campaigns
      const { count: campaignsCount, error: campaignsError } = await supabase
        .from('campaigns')
        .update({ company_id: matrixId })
        .is('company_id', null);

      if (campaignsError) {
        migrationResults.errors.push(`Campaigns: ${campaignsError.message}`);
      } else {
        migrationResults.campaigns = campaignsCount || 0;
      }

      // Migrate invoices
      const { count: invoicesCount, error: invoicesError } = await supabase
        .from('invoices')
        .update({ company_id: matrixId })
        .is('company_id', null);

      if (invoicesError) {
        migrationResults.errors.push(`Invoices: ${invoicesError.message}`);
      } else {
        migrationResults.invoices = invoicesCount || 0;
      }

      // Migrate estimations
      const { count: estimationsCount, error: estimationsError } = await supabase
        .from('estimations')
        .update({ company_id: matrixId })
        .is('company_id', null);

      if (estimationsError) {
        migrationResults.errors.push(`Estimations: ${estimationsError.message}`);
      } else {
        migrationResults.estimations = estimationsCount || 0;
      }

      // Migrate expenses
      const { count: expensesCount, error: expensesError } = await supabase
        .from('expenses')
        .update({ company_id: matrixId })
        .is('company_id', null);

      if (expensesError) {
        migrationResults.errors.push(`Expenses: ${expensesError.message}`);
      } else {
        migrationResults.expenses = expensesCount || 0;
      }

      setResults(migrationResults);

      if (migrationResults.errors.length === 0) {
        toast({
          title: "Migration Complete",
          description: "All data has been migrated to Matrix Network Solutions",
        });
      } else {
        toast({
          title: "Migration Complete with Errors",
          description: "Some records could not be migrated. Check the results below.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Migration error:', error);
      toast({
        title: "Migration Failed",
        description: error.message || "An error occurred during migration",
        variant: "destructive",
      });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Migration Tool</h1>
        <p className="text-muted-foreground mt-1">
          Migrate existing data to Matrix Network Solutions company
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          This tool will assign all records without a company_id to Matrix Network Solutions.
          This operation is irreversible. Make sure Matrix Network Solutions company exists before proceeding.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Migration Status
          </CardTitle>
          <CardDescription>
            Click the button below to start the migration process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleMigrate} 
            disabled={migrating}
            size="lg"
            className="w-full"
          >
            {migrating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Start Migration
              </>
            )}
          </Button>

          {results && (
            <div className="space-y-3 mt-6">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Migration Results
              </h3>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Target Company</p>
                      <p className="font-semibold">{results.company}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Media Assets</p>
                      <p className="font-semibold">{results.media_assets} migrated</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Clients</p>
                      <p className="font-semibold">{results.clients} migrated</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Plans</p>
                      <p className="font-semibold">{results.plans} migrated</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Campaigns</p>
                      <p className="font-semibold">{results.campaigns} migrated</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Invoices</p>
                      <p className="font-semibold">{results.invoices} migrated</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estimations</p>
                      <p className="font-semibold">{results.estimations} migrated</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expenses</p>
                      <p className="font-semibold">{results.expenses} migrated</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {results.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Errors Occurred</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2">
                      {results.errors.map((error: string, index: number) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}