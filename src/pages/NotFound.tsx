import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/config/routes";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full animate-scale-in">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            {/* 404 Illustration */}
            <div className="relative">
              <div className="text-9xl font-bold text-primary/10">404</div>
              <Search className="h-16 w-16 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-muted-foreground animate-pulse" />
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Page Not Found</h1>
              <p className="text-muted-foreground">
                The page you're looking for doesn't exist or has been moved.
              </p>
              <p className="text-sm text-muted-foreground/80">
                Attempted path: <code className="bg-muted px-2 py-1 rounded text-xs">{location.pathname}</code>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => navigate(-1)}
                variant="outline"
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
              <Button
                onClick={() => navigate(ROUTES.DASHBOARD)}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Go to Dashboard
              </Button>
            </div>

            {/* Quick Links */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">Quick Links</p>
              <div className="flex flex-wrap gap-2 justify-center text-sm">
                <Link to={ROUTES.MEDIA_ASSETS} className="text-primary hover:underline">
                  Media Assets
                </Link>
                <span className="text-muted-foreground">•</span>
                <Link to={ROUTES.CLIENTS} className="text-primary hover:underline">
                  Clients
                </Link>
                <span className="text-muted-foreground">•</span>
                <Link to={ROUTES.PLANS} className="text-primary hover:underline">
                  Plans
                </Link>
                <span className="text-muted-foreground">•</span>
                <Link to={ROUTES.CAMPAIGNS} className="text-primary hover:underline">
                  Campaigns
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
