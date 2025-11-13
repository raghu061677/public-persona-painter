import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Wifi, Bell, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast({
        title: "Installation Not Available",
        description: "This app is either already installed or your browser doesn't support installation.",
        variant: "destructive",
      });
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      toast({
        title: "Installation Started",
        description: "Go-Ads 360° is being installed to your device.",
      });
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <img src="/favicon-192x192.png" alt="Go-Ads 360°" className="w-24 h-24 rounded-2xl shadow-lg" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">Install Go-Ads 360°</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get the full app experience with offline access, instant loading, and push notifications.
          </p>
        </div>

        {/* Install Button */}
        {!isInstalled && (
          <Card className="border-2 border-primary/20">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                <Download className="w-6 h-6" />
                Quick Install
              </CardTitle>
              <CardDescription>
                Install Go-Ads 360° on your device in one click
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button 
                size="lg" 
                onClick={handleInstallClick}
                className="text-lg px-8 py-6"
                disabled={!deferredPrompt}
              >
                <Download className="w-5 h-5 mr-2" />
                Install App Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Already Installed Message */}
        {isInstalled && (
          <Card className="border-2 border-green-500/20 bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-3 text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-8 h-8" />
                <p className="text-xl font-semibold">App Already Installed!</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Wifi className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Works Offline</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Access your campaigns, media assets, and plans even without an internet connection.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Native Experience</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Launches instantly from your home screen just like a native app.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Push Notifications</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Get instant updates about approvals, campaigns, and operations.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Manual Installation Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Installation Instructions</CardTitle>
            <CardDescription>
              If the install button doesn't work, follow these steps:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">On iPhone/iPad (Safari):</h3>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-4">
                <li>Tap the Share button (square with arrow pointing up)</li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Tap "Add" in the top right corner</li>
              </ol>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">On Android (Chrome):</h3>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-4">
                <li>Tap the menu button (three dots) in the top right</li>
                <li>Tap "Add to Home screen" or "Install app"</li>
                <li>Tap "Add" or "Install" to confirm</li>
              </ol>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">On Desktop (Chrome/Edge):</h3>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-4">
                <li>Click the install icon in the address bar</li>
                <li>Or go to menu → Install Go-Ads 360°</li>
                <li>Click "Install" to confirm</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Back to App */}
        <div className="text-center">
          <Button variant="outline" asChild>
            <a href="/dashboard">Go to Dashboard</a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Install;
