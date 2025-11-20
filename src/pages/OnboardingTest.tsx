import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle2, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OnboardingStep {
  id: string;
  name: string;
  completed: boolean;
}

interface OnboardingModule {
  name: string;
  steps: OnboardingStep[];
}

const ONBOARDING_MODULES: OnboardingModule[] = [
  {
    name: "Media Assets",
    steps: [
      { id: "create_asset", name: "Create a new media asset with location, direction, dimension, photos", completed: false },
      { id: "edit_asset", name: "Edit an existing asset and confirm changes persist", completed: false },
      { id: "toggle_availability", name: "Mark an asset as available / not available", completed: false },
      { id: "test_filters", name: "Confirm filters/search work by area, location, media type", completed: false },
      { id: "verify_scoping", name: "Verify all media assets are scoped only to Matrix", completed: false },
    ],
  },
  {
    name: "Leads",
    steps: [
      { id: "create_manual_lead", name: "Create a lead manually (source: Direct/Phone)", completed: false },
      { id: "create_marketplace_lead", name: "Create a lead from public Explore/Booking enquiry", completed: false },
      { id: "connect_lead_client", name: "Connect lead to a client (existing or new)", completed: false },
      { id: "update_lead_status", name: "Update lead status (New → In Progress → Converted / Lost)", completed: false },
    ],
  },
  {
    name: "Clients",
    steps: [
      { id: "add_client", name: "Add a new client with GST, address, contact person", completed: false },
      { id: "edit_client", name: "Edit client details and confirm updates", completed: false },
      { id: "link_lead", name: "Link a lead to an existing client", completed: false },
      { id: "verify_client_list", name: "Ensure clients list shows only Matrix's clients", completed: false },
    ],
  },
  {
    name: "Plans",
    steps: [
      { id: "create_plan", name: "Create a new Media Plan selecting Matrix's media assets", completed: false },
      { id: "edit_plan", name: "Edit plan details (period, budget, charges)", completed: false },
      { id: "verify_calculations", name: "Confirm total calculations are correct", completed: false },
      { id: "convert_to_campaign", name: "Convert the plan to a campaign", completed: false },
    ],
  },
  {
    name: "Campaigns",
    steps: [
      { id: "convert_plan", name: "Convert a plan into an active campaign", completed: false },
      { id: "set_period", name: "Set campaign period and confirm assets are locked", completed: false },
      { id: "view_campaign", name: "See the campaign in campaign list scoped to Matrix", completed: false },
    ],
  },
  {
    name: "Operations",
    steps: [
      { id: "create_assignments", name: "Create mounting assignments per media asset", completed: false },
      { id: "assign_user", name: "Assign to Operations/Mounting user of Matrix", completed: false },
      { id: "update_status", name: "Update mounting status (Assigned → Installed → Photos Uploaded)", completed: false },
      { id: "upload_proofs", name: "Upload proof photos and verify they show under campaign", completed: false },
    ],
  },
];

export default function OnboardingTest() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [modules, setModules] = useState<OnboardingModule[]>(ONBOARDING_MODULES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (company?.id) {
      loadProgress();
    }
  }, [company?.id]);

  const loadProgress = async () => {
    if (!company?.id) return;

    try {
      const { data, error } = await supabase
        .from("onboarding_progress")
        .select("*")
        .eq("company_id", company.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const updatedModules = modules.map((module) => ({
          ...module,
          steps: module.steps.map((step) => {
            const progress = data.find(
              (p) => p.module_name === module.name && p.step_name === step.id
            );
            return {
              ...step,
              completed: progress?.completed || false,
            };
          }),
        }));
        setModules(updatedModules);
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStep = async (moduleName: string, stepId: string, currentState: boolean) => {
    if (!company?.id) return;

    const newState = !currentState;

    try {
      const { error } = await supabase.from("onboarding_progress").upsert({
        company_id: company.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        module_name: moduleName,
        step_name: stepId,
        completed: newState,
      });

      if (error) throw error;

      const updatedModules = modules.map((module) => {
        if (module.name === moduleName) {
          return {
            ...module,
            steps: module.steps.map((step) => {
              if (step.id === stepId) {
                return { ...step, completed: newState };
              }
              return step;
            }),
          };
        }
        return module;
      });

      setModules(updatedModules);
      toast({
        title: newState ? "Step completed" : "Step marked incomplete",
        description: `Testing progress updated`,
      });
    } catch (error) {
      console.error("Error updating progress:", error);
      toast({
        title: "Error",
        description: "Failed to update progress",
        variant: "destructive",
      });
    }
  };

  const calculateProgress = () => {
    const totalSteps = modules.reduce((acc, m) => acc + m.steps.length, 0);
    const completedSteps = modules.reduce(
      (acc, m) => acc + m.steps.filter((s) => s.completed).length,
      0
    );
    return totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  };

  const getModuleProgress = (module: OnboardingModule) => {
    const completed = module.steps.filter((s) => s.completed).length;
    return `${completed}/${module.steps.length}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading onboarding progress...</div>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Onboarding & QA Testing</h1>
          <div className="flex items-center gap-2 mt-2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>{company?.name || "Matrix Network Solutions"}</span>
          </div>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {progress.toFixed(0)}% Complete
        </Badge>
      </div>

      {/* Overall Progress */}
      <Card className="p-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Testing Progress</span>
            <span className="font-medium">{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </Card>

      {/* Module Checklists */}
      <div className="space-y-4">
        {modules.map((module, moduleIndex) => {
          const moduleCompleted = module.steps.every((s) => s.completed);
          return (
            <Card key={moduleIndex} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {moduleCompleted ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground" />
                  )}
                  <h2 className="text-xl font-semibold">{module.name}</h2>
                </div>
                <Badge variant={moduleCompleted ? "default" : "secondary"}>
                  {getModuleProgress(module)} Steps
                </Badge>
              </div>

              <div className="space-y-3 ml-9">
                {module.steps.map((step, stepIndex) => (
                  <div key={stepIndex} className="flex items-start gap-3">
                    <Checkbox
                      id={`${moduleIndex}-${stepIndex}`}
                      checked={step.completed}
                      onCheckedChange={() =>
                        toggleStep(module.name, step.id, step.completed)
                      }
                      className="mt-1"
                    />
                    <label
                      htmlFor={`${moduleIndex}-${stepIndex}`}
                      className={`text-sm leading-relaxed cursor-pointer ${
                        step.completed ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {step.name}
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Navigation */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Navigation</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Button variant="outline" asChild>
            <a href="/media-assets">Go to Media Assets</a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/leads">Go to Leads</a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/clients">Go to Clients</a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/plans">Go to Plans</a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/campaigns">Go to Campaigns</a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/operations">Go to Operations</a>
          </Button>
        </div>
      </Card>
    </div>
  );
}
