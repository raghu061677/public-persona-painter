import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { 
  CheckCircle2, Circle, Building2, Users, MapPin, 
  FileText, Megaphone, Wrench, ArrowRight, Play
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface TestModule {
  id: string;
  name: string;
  icon: any;
  route: string;
  steps: TestStep[];
}

interface TestStep {
  id: string;
  title: string;
  completed: boolean;
}

export default function OnboardingTest() {
  const { toast } = useToast();
  const { company } = useCompany();
  const navigate = useNavigate();
  const [modules, setModules] = useState<TestModule[]>([
    {
      id: "media-assets",
      name: "Media Assets",
      icon: MapPin,
      route: "/admin/media-assets",
      steps: [
        { id: "create-asset", title: "Create a new media asset with all details", completed: false },
        { id: "edit-asset", title: "Edit an existing asset and confirm changes", completed: false },
        { id: "toggle-status", title: "Mark asset as available/unavailable", completed: false },
        { id: "test-filters", title: "Test filters by area, location, media type", completed: false },
        { id: "verify-scope", title: "Verify all assets are scoped to Matrix company", completed: false },
      ],
    },
    {
      id: "leads",
      name: "Leads",
      icon: Users,
      route: "/admin/leads",
      steps: [
        { id: "create-manual-lead", title: "Create a lead manually (source: Direct/Phone)", completed: false },
        { id: "create-web-lead", title: "Create a lead from public Explore/Booking enquiry", completed: false },
        { id: "connect-client", title: "Connect lead to a client (existing or new)", completed: false },
        { id: "update-status", title: "Update lead status (New → In Progress → Converted)", completed: false },
      ],
    },
    {
      id: "clients",
      name: "Clients",
      icon: Building2,
      route: "/admin/clients",
      steps: [
        { id: "create-client", title: "Add new client with GST, address, contact person", completed: false },
        { id: "edit-client", title: "Edit client details and confirm updates", completed: false },
        { id: "link-lead", title: "Link a lead to an existing client", completed: false },
        { id: "verify-scope", title: "Ensure clients list shows only Matrix's clients", completed: false },
      ],
    },
    {
      id: "plans",
      name: "Plans",
      icon: FileText,
      route: "/admin/plans",
      steps: [
        { id: "create-plan", title: "Create new Media Plan selecting Matrix assets", completed: false },
        { id: "edit-plan", title: "Edit plan details (period, budget, charges)", completed: false },
        { id: "verify-calculations", title: "Confirm total calculations are correct", completed: false },
        { id: "convert-campaign", title: "Convert plan to campaign", completed: false },
      ],
    },
    {
      id: "campaigns",
      name: "Campaigns",
      icon: Megaphone,
      route: "/admin/campaigns",
      steps: [
        { id: "convert-plan", title: "Convert a plan into active campaign", completed: false },
        { id: "set-period", title: "Set campaign period and lock assets", completed: false },
        { id: "verify-list", title: "See campaign in list scoped to Matrix", completed: false },
      ],
    },
    {
      id: "operations",
      name: "Operations",
      icon: Wrench,
      route: "/admin/operations",
      steps: [
        { id: "create-assignments", title: "Create mounting assignments from campaign", completed: false },
        { id: "assign-user", title: "Assign to Operations/Mounting user", completed: false },
        { id: "update-status", title: "Update mounting status (Assigned → Installed)", completed: false },
        { id: "upload-proof", title: "Upload proof photos and verify display", completed: false },
      ],
    },
  ]);

  const [setupStatus, setSetupStatus] = useState({
    matrixExists: false,
    usersSetup: false,
    dataTransferred: false,
  });

  useEffect(() => {
    checkSetupStatus();
    loadProgress();
  }, []);

  const checkSetupStatus = async () => {
    try {
      // Check if Matrix Network Solutions exists
      const { data: matrixCompany } = await supabase
        .from('companies')
        .select('id, name')
        .eq('name', 'Matrix Network Solutions')
        .single();

      // Check if there are company users
      const { data: companyUsers } = await supabase
        .from('company_users')
        .select('id')
        .eq('company_id', matrixCompany?.id || '')
        .limit(2);

      // Check if data has been transferred
      const { data: assets } = await supabase
        .from('media_assets')
        .select('id')
        .eq('company_id', matrixCompany?.id || '')
        .limit(1);

      setSetupStatus({
        matrixExists: !!matrixCompany,
        usersSetup: (companyUsers?.length || 0) >= 2,
        dataTransferred: (assets?.length || 0) > 0,
      });
    } catch (error) {
      console.error('Error checking setup status:', error);
    }
  };

  const loadProgress = () => {
    const saved = localStorage.getItem('onboarding-test-progress');
    if (saved) {
      try {
        const progress = JSON.parse(saved);
        setModules(prev => prev.map(module => ({
          ...module,
          steps: module.steps.map(step => ({
            ...step,
            completed: progress[`${module.id}-${step.id}`] || false
          }))
        })));
      } catch (error) {
        console.error('Error loading progress:', error);
      }
    }
  };

  const saveProgress = (moduleId: string, stepId: string, completed: boolean) => {
    const saved = localStorage.getItem('onboarding-test-progress');
    const progress = saved ? JSON.parse(saved) : {};
    progress[`${moduleId}-${stepId}`] = completed;
    localStorage.setItem('onboarding-test-progress', JSON.stringify(progress));
  };

  const toggleStep = (moduleId: string, stepId: string) => {
    setModules(prev => prev.map(module => {
      if (module.id === moduleId) {
        return {
          ...module,
          steps: module.steps.map(step => {
            if (step.id === stepId) {
              const newCompleted = !step.completed;
              saveProgress(moduleId, stepId, newCompleted);
              return { ...step, completed: newCompleted };
            }
            return step;
          })
        };
      }
      return module;
    }));
  };

  const runSetup = async () => {
    try {
      toast({
        title: "Running Setup...",
        description: "Setting up Matrix Network Solutions and migrating data...",
      });

      const { data, error } = await supabase.functions.invoke('setup-matrix-company');
      
      if (error) throw error;

      toast({
        title: "Setup Complete!",
        description: `Migrated ${data.migrations.assets} assets, ${data.migrations.clients} clients, ${data.migrations.leads} leads, ${data.migrations.campaigns} campaigns.`,
      });

      await checkSetupStatus();
    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const totalSteps = modules.reduce((acc, m) => acc + m.steps.length, 0);
  const completedSteps = modules.reduce((acc, m) => 
    acc + m.steps.filter(s => s.completed).length, 0
  );
  const progressPercent = (completedSteps / totalSteps) * 100;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Matrix Network Solutions - Onboarding & QA"
        description="Step-by-step testing checklist for all workspace modules"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Onboarding Test" }
        ]}
      />

      {/* Setup Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Setup Status
          </CardTitle>
          <CardDescription>
            Matrix Network Solutions company setup and data migration status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Matrix Network Solutions company exists</span>
              {setupStatus.matrixExists ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">At least 2 users assigned to Matrix</span>
              {setupStatus.usersSetup ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Existing data transferred to Matrix</span>
              {setupStatus.dataTransferred ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>

          {!setupStatus.matrixExists && (
            <Button onClick={runSetup} className="w-full">
              <Play className="mr-2 h-4 w-4" />
              Run Matrix Setup & Data Migration
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Progress</CardTitle>
          <CardDescription>
            {completedSteps} of {totalSteps} test steps completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Module Checklists */}
      <div className="grid gap-6">
        {modules.map((module, idx) => {
          const ModuleIcon = module.icon;
          const completedModuleSteps = module.steps.filter(s => s.completed).length;
          const isComplete = completedModuleSteps === module.steps.length;
          
          return (
            <Card key={module.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      isComplete ? "bg-green-100 text-green-600" : "bg-primary/10 text-primary"
                    )}>
                      <ModuleIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {idx + 1}. {module.name}
                      </CardTitle>
                      <CardDescription>
                        {completedModuleSteps}/{module.steps.length} steps completed
                      </CardDescription>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(module.route)}
                  >
                    Open Module
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {module.steps.map((step) => (
                    <div 
                      key={step.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`${module.id}-${step.id}`}
                        checked={step.completed}
                        onCheckedChange={() => toggleStep(module.id, step.id)}
                        className="mt-1"
                      />
                      <label
                        htmlFor={`${module.id}-${step.id}`}
                        className={cn(
                          "text-sm flex-1 cursor-pointer",
                          step.completed && "line-through text-muted-foreground"
                        )}
                      >
                        {step.title}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
