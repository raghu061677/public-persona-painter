import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Rocket, Users, BarChart3 } from 'lucide-react';

interface WelcomeDialogProps {
  onStartTour: () => void;
}

export function WelcomeDialog({ onStartTour }: WelcomeDialogProps) {
  const { user } = useAuth();
  const { companyApproved, tourCompleted } = useOnboardingStatus();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Show welcome dialog when:
    // 1. User is logged in
    // 2. Company is approved
    // 3. Tour hasn't been completed yet
    // 4. This is likely their first visit (we could check localStorage too)
    const hasSeenWelcome = localStorage.getItem(`welcome-seen-${user?.id}`);
    
    if (user && companyApproved && !tourCompleted && !hasSeenWelcome) {
      // Small delay for better UX
      setTimeout(() => setOpen(true), 500);
    }
  }, [user, companyApproved, tourCompleted]);

  const handleStartTour = () => {
    if (user) {
      localStorage.setItem(`welcome-seen-${user.id}`, 'true');
    }
    setOpen(false);
    onStartTour();
  };

  const handleSkip = () => {
    if (user) {
      localStorage.setItem(`welcome-seen-${user.id}`, 'true');
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Sparkles className="h-16 w-16 text-primary" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
            </div>
          </div>
          <DialogTitle className="text-2xl text-center">
            Welcome to Go-Ads 360°! 🎉
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Your company has been approved. Let's get you started with a quick tour of the platform.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Quick Start</h4>
                <p className="text-sm text-muted-foreground">
                  Learn the basics in just 2 minutes
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Role-Based Guide</h4>
                <p className="text-sm text-muted-foreground">
                  See features relevant to your role
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Key Features</h4>
                <p className="text-sm text-muted-foreground">
                  Discover what makes Go-Ads powerful
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleSkip} className="flex-1">
            Skip for now
          </Button>
          <Button onClick={handleStartTour} className="flex-1">
            Start Tour
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
