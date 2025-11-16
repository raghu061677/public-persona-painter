import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle2, Building2 } from 'lucide-react';

interface OnboardingGateProps {
  children: ReactNode;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { hasCompany, companyApproved, loading } = useOnboardingStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user doesn't have a company, redirect to onboarding
  if (!hasCompany) {
    return <Navigate to="/onboarding" replace />;
  }

  // If company is pending approval, show waiting message
  if (!companyApproved) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Clock className="h-16 w-16 text-primary animate-pulse" />
            </div>
            <CardTitle className="text-2xl">Pending Approval</CardTitle>
            <CardDescription>
              Your company registration is under review
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <Building2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">What's next?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Our team is reviewing your company details. You'll receive an email notification once your account is approved.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Approval typically takes</p>
                <p className="text-sm text-muted-foreground mt-1">
                  24-48 hours during business days
                </p>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Need urgent access? Contact support@go-ads.com
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
