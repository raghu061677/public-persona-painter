import { X, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const AnnouncementBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const isDismissed = localStorage.getItem("announcement-banner-dismissed");
    if (isDismissed) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("announcement-banner-dismissed", "true");
  };

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-primary to-secondary text-white py-3 px-4 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm md:text-base">
        <Sparkles className="w-4 h-4 animate-pulse" />
        <span className="font-medium">
          New: AI-Powered Rate Recommendations Now Live
        </span>
        <span className="hidden sm:inline">|</span>
        <Button
          variant="link"
          className="text-white underline underline-offset-4 p-0 h-auto font-medium hover:no-underline"
          onClick={() => navigate("/auth")}
        >
          Try Free for 14 Days →
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-white hover:bg-white/20"
        onClick={handleDismiss}
        aria-label="Close announcement"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
