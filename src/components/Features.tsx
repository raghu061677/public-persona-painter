import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, Shield, TrendingUp, Users, FileText, Camera, BarChart3, Workflow } from "lucide-react";
import mediaIcon from "@/assets/icon-media.jpg";
import campaignIcon from "@/assets/icon-campaigns.jpg";
import automationIcon from "@/assets/icon-automation.jpg";

const Features = () => {
  const coreFeatures = [
    {
      icon: mediaIcon,
      title: "Media Asset Management",
      description: "Comprehensive inventory management with geo-tagging, pricing, and availability tracking.",
      features: ["Auto-ID Generation", "Geo-Location Mapping", "Dynamic Pricing", "Availability Calendar"]
    },
    {
      icon: campaignIcon,
      title: "Campaign Execution",
      description: "End-to-end campaign management from planning to proof verification with automated workflows.",
      features: ["Real-time Tracking", "Proof Management", "Status Updates", "Mobile App Support"]
    },
    {
      icon: automationIcon,
      title: "Process Automation",
      description: "Automated quotations, invoices, and reporting with seamless integrations and export capabilities.",
      features: ["Auto Quotations", "Invoice Generation", "Export Formats", "WhatsApp/Email Integration"]
    }
  ];

  const additionalFeatures = [
    { icon: Users, title: "Multi-Role Access", description: "Admin, Sales, Ops, Finance, and Client portals" },
    { icon: Shield, title: "Firebase Security", description: "Enterprise-grade security and scalability" },
    { icon: FileText, title: "Document Generation", description: "Automated PPT, PDF, and Excel exports" },
    { icon: Camera, title: "Proof Management", description: "Mobile proof uploads with geo-verification" },
    { icon: BarChart3, title: "Analytics & Reports", description: "Comprehensive business intelligence" },
    { icon: Workflow, title: "Zoho Integration", description: "Seamless sync with Zoho Books" }
  ];

  return (
    <section className="py-12 md:py-20 lg:py-24 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <Badge variant="secondary" className="mb-3 md:mb-4 bg-gradient-subtle border-0">
            <Zap className="w-4 h-4 mr-2 text-accent" />
            Powerful Features
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4 px-4">
            Everything You Need for 
            <span className="bg-gradient-primary bg-clip-text text-transparent"> OOH Success</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            From media planning to campaign execution, Go-Ads 360° provides all the tools you need to manage your outdoor advertising operations efficiently.
          </p>
        </div>

        {/* Core Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-12 md:mb-16">
          {coreFeatures.map((feature, index) => (
            <Card key={index} className="group hover:shadow-elegant transition-spring border bg-card backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="mb-4 md:mb-6">
                  <img 
                    src={feature.icon} 
                    alt={feature.title}
                    className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl shadow-card group-hover:shadow-glow transition-smooth object-cover"
                  />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3 group-hover:text-primary transition-smooth">
                  {feature.title}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6 leading-relaxed">
                  {feature.description}
                </p>
                <ul className="space-y-1.5 md:space-y-2">
                  {feature.features.map((item, idx) => (
                    <li key={idx} className="flex items-center text-xs md:text-sm">
                      <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-accent mr-2 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {additionalFeatures.map((feature, index) => (
            <Card key={index} className="group hover:shadow-card transition-smooth border bg-card/80 backdrop-blur-sm">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="p-2 md:p-3 bg-gradient-primary rounded-lg md:rounded-xl shadow-card group-hover:shadow-glow transition-smooth flex-shrink-0">
                    <feature.icon className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm md:text-base font-semibold mb-1 md:mb-2 group-hover:text-primary transition-smooth">
                      {feature.title}
                    </h4>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Workflow section */}
        <div className="mt-12 md:mt-20 text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 px-4">Complete Workflow Coverage</h3>
          <div className="flex flex-wrap justify-center items-center gap-2 md:gap-4 text-xs md:text-sm px-4">
            {[
              "Media Assets",
              "Plans & Proposals", 
              "Rate Negotiation",
              "Quotations",
              "Client Approval",
              "Purchase Orders",
              "Campaign Execution",
              "Operations Management",
              "Proof Verification",
              "Invoicing",
              "Payment Tracking",
              "Analytics & Reports"
            ].map((step, index, array) => (
              <div key={index} className="flex items-center">
                <Badge variant="outline" className="px-2 py-0.5 md:px-3 md:py-1 text-xs">
                  {step}
                </Badge>
                {index < array.length - 1 && (
                  <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground mx-1 md:mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;