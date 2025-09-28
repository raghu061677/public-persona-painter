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
    <section className="py-24 bg-gradient-subtle">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-gradient-subtle border-0">
            <Zap className="w-4 h-4 mr-2 text-accent" />
            Powerful Features
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need for 
            <span className="bg-gradient-primary bg-clip-text text-transparent"> OOH Success</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From media planning to campaign execution, Go-Ads 360° provides all the tools you need to manage your outdoor advertising operations efficiently.
          </p>
        </div>

        {/* Core Features */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {coreFeatures.map((feature, index) => (
            <Card key={index} className="group hover:shadow-elegant transition-spring border-0 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="mb-6">
                  <img 
                    src={feature.icon} 
                    alt={feature.title}
                    className="w-16 h-16 rounded-2xl shadow-card group-hover:shadow-glow transition-smooth object-cover"
                  />
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-smooth">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.features.map((item, idx) => (
                    <li key={idx} className="flex items-center text-sm">
                      <ArrowRight className="w-4 h-4 text-accent mr-2 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {additionalFeatures.map((feature, index) => (
            <Card key={index} className="group hover:shadow-card transition-smooth border-0 bg-card/30 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-primary rounded-xl shadow-card group-hover:shadow-glow transition-smooth">
                    <feature.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2 group-hover:text-primary transition-smooth">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Workflow section */}
        <div className="mt-20 text-center">
          <h3 className="text-3xl font-bold mb-8">Complete Workflow Coverage</h3>
          <div className="flex flex-wrap justify-center items-center gap-4 text-sm">
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
                <Badge variant="outline" className="px-3 py-1">
                  {step}
                </Badge>
                {index < array.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground mx-2" />
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