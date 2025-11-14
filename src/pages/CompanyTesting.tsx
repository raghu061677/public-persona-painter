import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PageContainer } from "@/components/ui/page-container";
import { 
  Building2, 
  TestTube, 
  CheckCircle2, 
  XCircle, 
  Shield,
  Database,
  Users
} from "lucide-react";

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'pending';
  message: string;
  details?: any;
}

export default function CompanyTesting() {
  const { company, isPlatformAdmin } = useCompany();
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const seedDemoCompanies = async () => {
    setSeedingDemo(true);
    try {
      const { data, error } = await supabase.rpc('seed_demo_companies');
      
      if (error) throw error;

      toast({
        title: "✅ Demo Companies Created",
        description: `Created media owner and agency companies for testing`,
      });

      console.log("Demo seed results:", data);
    } catch (error: any) {
      console.error("Error seeding demo companies:", error);
      toast({
        title: "Seeding Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSeedingDemo(false);
    }
  };

  const runRLSTests = async () => {
    if (!company) return;

    setTesting(true);
    const results: TestResult[] = [];

    try {
      // Test 1: Verify user can see own company
      results.push({
        name: "Own Company Visibility",
        status: 'pending',
        message: "Testing if user can view their own company..."
      });

      const { data: ownCompany, error: ownError } = await supabase
        .from('companies' as any)
        .select('id, name')
        .eq('id', company.id)
        .single();

      if (ownError) {
        results[0].status = 'fail';
        results[0].message = `Cannot view own company: ${ownError.message}`;
      } else {
        results[0].status = 'pass';
        results[0].message = `✓ Can view own company: ${(ownCompany as any)?.name || 'Unknown'}`;
        results[0].details = ownCompany;
      }

      // Test 2: Verify user cannot see other companies (unless platform admin)
      results.push({
        name: "Company Isolation",
        status: 'pending',
        message: "Testing RLS isolation..."
      });

      const { data: allCompanies, error: allError } = await supabase
        .from('companies' as any)
        .select('id, name, type');

      if (allError) {
        results[1].status = 'fail';
        results[1].message = `Error querying companies: ${allError.message}`;
      } else {
        const otherCompanies = allCompanies?.filter((c: any) => c.id !== company.id);
        
        if (isPlatformAdmin) {
          results[1].status = 'pass';
          results[1].message = `✓ Platform admin can see all ${allCompanies?.length} companies`;
          results[1].details = { total: allCompanies?.length };
        } else {
          if (otherCompanies && otherCompanies.length > 0) {
            results[1].status = 'fail';
            results[1].message = `⚠ Isolation breach! Can see ${otherCompanies.length} other companies`;
            results[1].details = { leaked: otherCompanies };
          } else {
            results[1].status = 'pass';
            results[1].message = `✓ RLS working - can only see own company`;
          }
        }
      }

      // Test 3: Media Assets Isolation
      results.push({
        name: "Media Assets Isolation",
        status: 'pending',
        message: "Testing media assets visibility..."
      });

      const { data: assets, error: assetsError } = await supabase
        .from('media_assets' as any)
        .select('id, company_id');

      if (assetsError) {
        results[2].status = 'fail';
        results[2].message = `Error: ${assetsError.message}`;
      } else {
        const ownAssets = assets?.filter((a: any) => a.company_id === company.id);
        const otherAssets = assets?.filter((a: any) => a.company_id !== company.id && !a.is_public);

        if (isPlatformAdmin) {
          results[2].status = 'pass';
          results[2].message = `✓ Admin can see all assets`;
        } else if (otherAssets && otherAssets.length > 0) {
          results[2].status = 'fail';
          results[2].message = `⚠ Can see ${otherAssets.length} assets from other companies`;
        } else {
          results[2].status = 'pass';
          results[2].message = `✓ Can only see ${ownAssets?.length || 0} own assets`;
        }
      }

      // Test 4: Clients Isolation
      results.push({
        name: "Clients Data Isolation",
        status: 'pending',
        message: "Testing clients visibility..."
      });

      const { data: clients, error: clientsError } = await supabase
        .from('clients' as any)
        .select('id, company_id, name');

      if (clientsError) {
        results[3].status = 'fail';
        results[3].message = `Error: ${clientsError.message}`;
      } else {
        const ownClients = clients?.filter((c: any) => c.company_id === company.id);
        const otherClients = clients?.filter((c: any) => c.company_id && c.company_id !== company.id);

        if (isPlatformAdmin) {
          results[3].status = 'pass';
          results[3].message = `✓ Admin can see all clients`;
        } else if (otherClients && otherClients.length > 0) {
          results[3].status = 'fail';
          results[3].message = `⚠ Isolation breach! Can see ${otherClients.length} clients from other companies`;
        } else {
          results[3].status = 'pass';
          results[3].message = `✓ Can only see ${ownClients?.length || 0} own clients`;
        }
      }

      setTestResults(results);

      const allPassed = results.every(r => r.status === 'pass');
      toast({
        title: allPassed ? "✅ All Tests Passed" : "⚠ Some Tests Failed",
        description: `${results.filter(r => r.status === 'pass').length}/${results.length} tests passed`,
        variant: allPassed ? "default" : "destructive",
      });

    } catch (error: any) {
      console.error("Testing error:", error);
      toast({
        title: "Test Execution Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  if (!isPlatformAdmin) {
  return (
    <PageContainer
      title="Company Testing"
    >
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Platform admin access required</p>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Multi-Tenant Testing Suite"
    >
      <div className="grid gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Demo Data Management
            </CardTitle>
            <CardDescription>
              Create demo companies for testing multi-tenant features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={seedDemoCompanies} 
              disabled={seedingDemo}
              className="w-full sm:w-auto"
            >
              <Building2 className="h-4 w-4 mr-2" />
              {seedingDemo ? "Creating..." : "Seed Demo Companies"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Creates a media owner and agency company with sample data
            </p>
          </CardContent>
        </Card>

        {/* RLS Testing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Row-Level Security (RLS) Tests
            </CardTitle>
            <CardDescription>
              Verify tenant isolation is working correctly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={runRLSTests} 
              disabled={testing}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {testing ? "Running Tests..." : "Run RLS Tests"}
            </Button>

            {testResults.length > 0 && (
              <div className="space-y-3 mt-6">
                <h4 className="font-semibold flex items-center gap-2">
                  Test Results
                  <Badge variant={testResults.every(r => r.status === 'pass') ? 'default' : 'destructive'}>
                    {testResults.filter(r => r.status === 'pass').length}/{testResults.length} Passed
                  </Badge>
                </h4>
                {testResults.map((result, idx) => (
                  <Card key={idx} className="border-l-4" style={{
                    borderLeftColor: result.status === 'pass' ? '#10b981' : result.status === 'fail' ? '#ef4444' : '#94a3b8'
                  }}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        {result.status === 'pass' && <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />}
                        {result.status === 'fail' && <XCircle className="h-5 w-5 text-red-600 mt-0.5" />}
                        {result.status === 'pending' && <TestTube className="h-5 w-5 text-gray-400 mt-0.5" />}
                        <div className="flex-1">
                          <h5 className="font-medium">{result.name}</h5>
                          <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                          {result.details && (
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Current Test Context
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <dt className="font-medium text-muted-foreground">Company:</dt>
                <dd className="mt-1">{company?.name}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Type:</dt>
                <dd className="mt-1">
                  <Badge>{company?.type}</Badge>
                </dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Status:</dt>
                <dd className="mt-1">
                  <Badge variant={company?.status === 'active' ? 'default' : 'secondary'}>
                    {company?.status}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Role:</dt>
                <dd className="mt-1">
                  <Badge variant="outline">
                    {isPlatformAdmin ? 'Platform Admin' : 'Company User'}
                  </Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}