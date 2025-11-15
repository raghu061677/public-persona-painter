import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Upload, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";

const steps = [
  {
    icon: UserPlus,
    number: 1,
    title: "Sign Up in 2 Minutes",
    description: "Choose your account type (Agency or Media Owner). Add your team and set permissions. No credit card required for 14-day trial."
  },
  {
    icon: Upload,
    number: 2,
    title: "List Assets or Browse Inventory",
    description: "Media owners bulk-upload inventory with CSV. Agencies instantly search 50,000+ assets with advanced filters."
  },
  {
    icon: Rocket,
    number: 3,
    title: "Create Plans and Launch Campaigns",
    description: "Build media plans with AI rate suggestions. Get client approvals. Track installation proofs in real-time. Close the loop."
  }
];

export const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 lg:py-28 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Three Steps to Start Winning
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes, not days
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <Card className="h-full hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-xl">
                      {step.number}
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-xl">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
              
              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary to-transparent" />
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            onClick={() => navigate("/auth")}
            className="text-lg"
          >
            Start Free Agency Trial →
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => navigate("/auth")}
            className="text-lg"
          >
            List Your First Asset Free →
          </Button>
        </div>
      </div>
    </section>
  );
};
