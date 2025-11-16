import { useState, useEffect } from "react";
import Joyride, { Step, CallBackProps, STATUS } from "react-joyride";
import { useNavigate, useLocation } from "react-router-dom";

interface GuidedTutorialProps {
  enabled: boolean;
  onComplete: () => void;
}

export function GuidedTutorial({ enabled, onComplete }: GuidedTutorialProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (enabled) {
      setRun(true);
    }
  }, [enabled]);

  const steps: Step[] = [
    {
      target: "body",
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Welcome to Go-Ads 360°! 🎉</h3>
          <p>Let's take a quick tour of the platform to help you get started.</p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[href="/admin/media-assets"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Media Assets</h4>
          <p>Manage your OOH inventory here - add bus shelters, hoardings, unipoles, and more.</p>
        </div>
      ),
      placement: "right",
    },
    {
      target: '[href="/admin/clients"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Clients</h4>
          <p>Store client information, contacts, and KYC documents in one place.</p>
        </div>
      ),
      placement: "right",
    },
    {
      target: '[href="/admin/leads"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Leads</h4>
          <p>Track incoming leads from WhatsApp, email, and web forms.</p>
        </div>
      ),
      placement: "right",
    },
    {
      target: '[href="/admin/plans"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Plans</h4>
          <p>Create media plans (quotations) by selecting assets and negotiating rates.</p>
        </div>
      ),
      placement: "right",
    },
    {
      target: '[href="/admin/campaigns"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Campaigns</h4>
          <p>Convert approved plans into live campaigns and track execution.</p>
        </div>
      ),
      placement: "right",
    },
    {
      target: '[href="/admin/operations"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Operations</h4>
          <p>Manage mounting assignments and upload proof photos from the field.</p>
        </div>
      ),
      placement: "right",
    },
    {
      target: '[href="/admin/finance"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Finance</h4>
          <p>Handle quotations, invoices, expenses, and power bills all in one place.</p>
        </div>
      ),
      placement: "right",
    },
    {
      target: '[href="/admin/reports"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Reports</h4>
          <p>View analytics on vacant media, revenue, occupancy, and more.</p>
        </div>
      ),
      placement: "right",
    },
    {
      target: '[href="/admin/settings"]',
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Settings</h4>
          <p>Configure company details, users, integrations, and demo mode.</p>
        </div>
      ),
      placement: "right",
    },
    {
      target: "body",
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">You're All Set! 🚀</h3>
          <p>You can always load demo data from Settings to explore the features with sample data.</p>
          <p className="text-sm text-muted-foreground">To restart this tutorial, go to Settings → Demo Mode.</p>
        </div>
      ),
      placement: "center",
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, action } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      onComplete();
    }

    // Auto-navigate based on step
    if (action === "next" || action === "prev") {
      setStepIndex(index);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "#1e40af",
          zIndex: 10000,
        },
      }}
    />
  );
}
