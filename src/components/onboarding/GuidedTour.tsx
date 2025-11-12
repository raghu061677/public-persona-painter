import { useState, useEffect } from "react";
import Joyride, { CallBackProps, Step, STATUS } from "react-joyride";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface GuidedTourProps {
  role: string;
}

const tourSteps: Record<string, Step[]> = {
  admin: [
    {
      target: 'body',
      content: 'Welcome to Go-Ads 360°! Let\'s take a quick tour of the administrator features.',
      placement: 'center',
    },
    {
      target: '[data-tour="dashboard"]',
      content: 'This is your dashboard with key metrics and overview of system activity.',
    },
    {
      target: '[data-tour="user-management"]',
      content: 'Manage users, teams, roles, and permissions from here.',
    },
    {
      target: '[data-tour="settings"]',
      content: 'Configure system settings, integrations, and organization preferences.',
    },
    {
      target: '[data-tour="reports"]',
      content: 'Access comprehensive reports and analytics for all operations.',
    },
  ],
  sales: [
    {
      target: 'body',
      content: 'Welcome to Go-Ads 360°! Let\'s explore the sales features.',
      placement: 'center',
    },
    {
      target: '[data-tour="leads"]',
      content: 'Manage and track your leads from various sources here.',
    },
    {
      target: '[data-tour="clients"]',
      content: 'View and manage your client database with full KYC details.',
    },
    {
      target: '[data-tour="plans"]',
      content: 'Create media plans and quotations using our intelligent plan builder.',
    },
    {
      target: '[data-tour="media-assets"]',
      content: 'Browse available media assets and check their availability.',
    },
  ],
  operations: [
    {
      target: 'body',
      content: 'Welcome to Go-Ads 360°! Here\'s your operations guide.',
      placement: 'center',
    },
    {
      target: '[data-tour="campaigns"]',
      content: 'View and manage all active campaigns and assignments.',
    },
    {
      target: '[data-tour="mobile-field"]',
      content: 'Access the mobile-friendly interface for field work and proof uploads.',
    },
    {
      target: '[data-tour="photo-library"]',
      content: 'View all campaign proof photos and installation documentation.',
    },
  ],
  finance: [
    {
      target: 'body',
      content: 'Welcome to Go-Ads 360°! Let\'s review the finance features.',
      placement: 'center',
    },
    {
      target: '[data-tour="finance-dashboard"]',
      content: 'Your financial dashboard with revenue, expenses, and payment tracking.',
    },
    {
      target: '[data-tour="invoices"]',
      content: 'Manage invoices, payments, and track outstanding amounts.',
    },
    {
      target: '[data-tour="expenses"]',
      content: 'Track and categorize all campaign-related expenses.',
    },
    {
      target: '[data-tour="power-bills"]',
      content: 'Manage power bills for media assets and track payments.',
    },
  ],
};

export default function GuidedTour({ role }: GuidedTourProps) {
  const [runTour, setRunTour] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const checkTourStatus = async () => {
      if (!user) return;

      // Check if user has completed the tour
      const { data } = await supabase
        .from("user_activity_logs")
        .select("id")
        .eq("user_id", user.id)
        .eq("activity_type", "tour_completed")
        .single();

      // If no tour completion record, show the tour
      if (!data) {
        setRunTour(true);
      }
    };

    checkTourStatus();
  }, [user]);

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunTour(false);

      // Log tour completion
      if (user) {
        await supabase.from("user_activity_logs").insert({
          user_id: user.id,
          activity_type: "tour_completed",
          activity_description: `Completed guided tour for ${role} role`,
          metadata: {
            role,
            status,
          },
        });
      }
    }
  };

  const steps = tourSteps[role] || tourSteps.sales;

  return (
    <Joyride
      steps={steps}
      run={runTour}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#1e40af',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
        },
        buttonNext: {
          backgroundColor: '#1e40af',
          borderRadius: 6,
        },
        buttonBack: {
          color: '#64748b',
        },
      }}
    />
  );
}
