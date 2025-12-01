import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Wifi, Bell, CheckCircle2, Zap, Shield, HardDrive, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <img src="/favicon-192x192.png" alt="Go-Ads 360°" className="w-24 h-24 rounded-2xl shadow-lg" />
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-20"></div>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">Install Go-Ads 360°</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get the full app experience with offline access, instant loading, and push notifications. Install once, work anywhere.
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

        {/* Key Benefits */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Wifi className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Works Offline</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Access campaigns, media assets, and plans even without internet. Changes sync automatically when you're back online.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Lightning Fast</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Instant loading and smooth performance. Launch directly from your home screen without opening a browser.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Push Notifications</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Get instant updates about approvals, campaign progress, and important operations tasks.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <HardDrive className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Save Data</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Efficient caching reduces data usage. Perfect for field operations with limited connectivity.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Platform-Specific Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Platform-Specific Installation Guide</CardTitle>
            <CardDescription>
              Choose your platform for detailed installation instructions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="ios" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ios">iOS / iPad</TabsTrigger>
                <TabsTrigger value="android">Android</TabsTrigger>
                <TabsTrigger value="desktop">Desktop</TabsTrigger>
              </TabsList>
              
              <TabsContent value="ios" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-primary" />
                    Installing on iPhone or iPad (Safari)
                  </h3>
                  <ol className="space-y-3 text-muted-foreground">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">1</span>
                      <span>Open this page in <strong>Safari browser</strong> (required for iOS installation)</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">2</span>
                      <span>Tap the <strong>Share button</strong> (square icon with arrow pointing up) at the bottom of the screen</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">3</span>
                      <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">4</span>
                      <span>You can customize the app name if desired, then tap <strong>"Add"</strong> in the top right</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">5</span>
                      <span>Go-Ads 360° will now appear on your home screen. Tap the icon to launch the app!</span>
                    </li>
                  </ol>
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>💡 Tip:</strong> Once installed, the app works just like a native iOS app with full screen display and offline capabilities.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="android" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-primary" />
                    Installing on Android (Chrome)
                  </h3>
                  <ol className="space-y-3 text-muted-foreground">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">1</span>
                      <span>Open this page in <strong>Chrome browser</strong> (recommended for best experience)</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">2</span>
                      <span>Look for the install banner at the bottom of the screen, or tap the <strong>menu button</strong> (three vertical dots) in the top right</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">3</span>
                      <span>Select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">4</span>
                      <span>Review the app name and tap <strong>"Add"</strong> or <strong>"Install"</strong> to confirm</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">5</span>
                      <span>The app will be added to your home screen and app drawer. Launch it anytime!</span>
                    </li>
                  </ol>
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      <strong>💡 Tip:</strong> You can also use the "Install" button at the top of this page for a quick one-click installation!
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="desktop" className="space-y-4 mt-4">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Download className="w-5 h-5 text-primary" />
                      Installing on Chrome / Edge (Windows, Mac, Linux)
                    </h3>
                    <ol className="space-y-3 text-muted-foreground">
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">1</span>
                        <span>Look for the <strong>install icon</strong> (computer with arrow) in the address bar on the right side</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">2</span>
                        <span>Click the icon and then click <strong>"Install"</strong></span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">3</span>
                        <span>Alternatively, click the <strong>menu button</strong> (three dots) → More tools → <strong>"Install Go-Ads 360°"</strong></span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">4</span>
                        <span>The app will open in its own window and be added to your applications</span>
                      </li>
                    </ol>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Download className="w-5 h-5 text-primary" />
                      Installing on Safari (Mac)
                    </h3>
                    <ol className="space-y-3 text-muted-foreground">
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">1</span>
                        <span>Safari doesn't support PWA installation on macOS. We recommend using <strong>Chrome or Edge</strong> for the best experience</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">2</span>
                        <span>You can still bookmark the page for quick access from your Favorites Bar</span>
                      </li>
                    </ol>
                  </div>

                  <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-sm text-purple-800 dark:text-purple-200">
                      <strong>💡 Benefits:</strong> The desktop app runs in its own window, appears in your taskbar/dock, and launches faster than opening a browser tab!
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Additional Benefits */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Why Install Go-Ads 360°?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Productivity Boost
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                  <li>Launch instantly from home screen</li>
                  <li>No browser tabs clutter</li>
                  <li>Work offline during site visits</li>
                  <li>Faster page loads with caching</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Professional Experience
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                  <li>Full-screen native app feel</li>
                  <li>Push notifications for updates</li>
                  <li>Seamless cross-device sync</li>
                  <li>Reduced data consumption</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to App */}
        <div className="text-center">
          <Button variant="outline" asChild>
            <Link to="/admin/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Install;
