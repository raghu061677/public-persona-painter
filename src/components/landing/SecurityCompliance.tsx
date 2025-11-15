import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Lock, UserCheck, Server } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Multi-Tenant Isolation",
    description: "Data separated at database level with row-level security. Your data never mixes with competitors'."
  },
  {
    icon: Lock,
    title: "Encrypted at Rest & in Transit",
    description: "AES-256 encryption for stored data. TLS 1.3 for all connections. Zero-knowledge architecture for sensitive fields."
  },
  {
    icon: UserCheck,
    title: "Role-Based Access Control (RBAC)",
    description: "Granular permissions (Admin, Sales, Ops, Finance, Viewer). Audit logs track every action."
  },
  {
    icon: Server,
    title: "99.9% Uptime SLA",
    description: "Distributed infrastructure with automatic failover. Real-time monitoring and incident response."
  }
];

const compliance = [
  { name: "GDPR Compliant", status: "Ready" },
  { name: "India Data Residency", status: "Active" },
  { name: "SOC 2 Type II", status: "Q3 2025" },
  { name: "ISO 27001", status: "Q4 2025" }
];

export const SecurityCompliance = () => {
  return (
    <section className="py-20 lg:py-28 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Enterprise-Grade Security & Compliance
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Your data is protected with bank-level security standards
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="text-center">
              <CardHeader>
                <div className="mx-auto p-4 rounded-full bg-primary/10 text-primary w-fit mb-4">
                  <feature.icon className="h-8 w-8" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-card rounded-2xl p-8 border">
          <h3 className="text-2xl font-semibold mb-6 text-center">Compliance Badges</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {compliance.map((item, index) => (
              <div key={index} className="text-center">
                <div className="h-32 flex items-center justify-center mb-3 bg-muted rounded-lg">
                  <Shield className="h-16 w-16 text-primary" />
                </div>
                <p className="font-semibold mb-1">{item.name}</p>
                <Badge variant={item.status === "Ready" || item.status === "Active" ? "default" : "secondary"}>
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
          <div className="flex justify-center">
            <Button variant="outline" size="lg">
              View Security Whitepaper →
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
