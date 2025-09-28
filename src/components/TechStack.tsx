import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, Database, Cloud, Smartphone, Lock, Zap } from "lucide-react";

const TechStack = () => {
  const techCategories = [
    {
      icon: Code,
      title: "Frontend",
      description: "Modern React ecosystem with Next.js 15",
      technologies: ["Next.js 15", "React 18", "TypeScript", "Tailwind CSS", "shadcn/ui", "Zustand"]
    },
    {
      icon: Database,
      title: "Backend & Database",
      description: "Firebase-powered scalable infrastructure",
      technologies: ["Firebase Functions", "Firestore", "Firebase Storage", "Cloud Scheduler", "Node.js 20"]
    },
    {
      icon: Cloud,
      title: "Integration & APIs",
      description: "Seamless third-party integrations",
      technologies: ["Zoho Books", "WhatsApp Cloud API", "Gmail API", "Maps Integration", "Export APIs"]
    },
    {
      icon: Lock,
      title: "Security & Auth",
      description: "Enterprise-grade security",
      technologies: ["Firebase Auth", "RBAC", "OAuth", "Data Encryption", "Secure Storage"]
    },
    {
      icon: Smartphone,
      title: "Mobile Experience",
      description: "Cross-platform mobile support",
      technologies: ["PWA", "Mobile-First", "Responsive Design", "Touch Optimized", "Offline Support"]
    },
    {
      icon: Zap,
      title: "Performance",
      description: "Optimized for speed and scale",
      technologies: ["Edge Functions", "CDN", "Caching", "Lazy Loading", "Code Splitting"]
    }
  ];

  const environments = [
    { name: "Development", color: "bg-yellow-500", description: "Local development environment" },
    { name: "Staging", color: "bg-orange-500", description: "Pre-production testing" },
    { name: "Production", color: "bg-green-500", description: "Live production environment" }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-gradient-subtle border-0">
            <Code className="w-4 h-4 mr-2 text-accent" />
            Technology Stack
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Built on 
            <span className="bg-gradient-primary bg-clip-text text-transparent"> Modern Architecture</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Go-Ads 360° leverages cutting-edge technologies to deliver a robust, scalable, and secure platform for your outdoor advertising operations.
          </p>
        </div>

        {/* Tech Stack Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {techCategories.map((category, index) => (
            <Card key={index} className="group hover:shadow-elegant transition-spring border-0 bg-gradient-subtle">
              <CardContent className="p-8">
                <div className="mb-6">
                  <div className="p-4 bg-gradient-primary rounded-2xl shadow-card group-hover:shadow-glow transition-smooth w-fit">
                    <category.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-smooth">
                  {category.title}
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {category.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {category.technologies.map((tech, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs bg-card/50">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Environment Management */}
        <Card className="bg-gradient-subtle border-0 shadow-card">
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold mb-6 text-center">Multi-Environment Architecture</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {environments.map((env, index) => (
                <div key={index} className="text-center group">
                  <div className={`w-4 h-4 ${env.color} rounded-full mx-auto mb-3 group-hover:scale-110 transition-transform`} />
                  <h4 className="font-semibold mb-2">{env.name}</h4>
                  <p className="text-sm text-muted-foreground">{env.description}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <p className="text-sm text-muted-foreground">
                Isolated environments ensure safe development, testing, and production deployment
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Architecture Benefits */}
        <div className="mt-16 grid md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">99.9%</div>
            <div className="text-sm text-muted-foreground">Uptime SLA</div>
          </div>
          <div>
            <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">&lt;100ms</div>
            <div className="text-sm text-muted-foreground">API Response</div>
          </div>
          <div>
            <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">Auto</div>
            <div className="text-sm text-muted-foreground">Scaling</div>
          </div>
          <div>
            <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">Global</div>
            <div className="text-sm text-muted-foreground">CDN</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechStack;