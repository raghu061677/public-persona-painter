import { ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Home, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  showBackButton?: boolean;
  backPath?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  showBackButton = false,
  backPath,
  actions,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={cn("space-y-4 mb-8 animate-fade-in", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-1 text-sm text-muted-foreground animate-fade-in">
          {breadcrumbs.map((breadcrumb, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
              {breadcrumb.path ? (
                <Link
                  to={breadcrumb.path}
                  className="hover:text-foreground transition-all duration-200 flex items-center hover-scale"
                >
                  {index === 0 && <Home className="h-4 w-4 mr-1" />}
                  {breadcrumb.label}
                </Link>
              ) : (
                <span className="font-medium text-foreground flex items-center">
                  {breadcrumb.label}
                </span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Title and Actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="hover-scale shrink-0 mt-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {title}
            </h1>
            {description && (
              <p className="text-muted-foreground text-base max-w-3xl">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
