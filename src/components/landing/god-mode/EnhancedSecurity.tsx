import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Lock, UserCheck, Server, FileCheck, Download } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Multi-Tenant Isolation",
    description: "Data separated at database level with row-level security. Your data never mixes with competitors'.",
  },
  {
    icon: Lock,
    title: "Encrypted at Rest & in Transit",
    description: "AES-256 encryption for stored data. TLS 1.3 for all connections. Zero-knowledge architecture.",
  },
  {
    icon: UserCheck,
    title: "Role-Based Access Control",
    description: "Granular permissions (Admin, Sales, Ops, Finance, Viewer). Audit logs track every action.",
  },
  {
    icon: Server,
    title: "99.9% Uptime SLA",
    description: "Distributed infrastructure with automatic failover. Real-time monitoring and incident response.",
  },
  {
    icon: FileCheck,
    title: "Compliance Ready",
    description: "GDPR compliant, India data residency, SOC 2 Type II and ISO 27001 certifications in progress.",
  },
  {
    icon: Download,
    title: "Data Portability",
    description: "Export all your data anytime in standard formats. No vendor lock-in. Your data, your control.",
  },
];

const compliance = [
  { name: "GDPR Compliant", status: "Ready" },
  { name: "India Data Residency", status: "Active" },
  { name: "SOC 2 Type II", status: "Q3 2025" },
  { name: "ISO 27001", status: "Q4 2025" }
];

export const EnhancedSecurity = () => {
  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-green-500/10 text-green-600 border-green-500/20">
            <Shield className="h-3 w-3 mr-1" />
            Enterprise-Grade Security
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Bank-Level Security
            <br />
            For Your Business Data
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Your data is protected with enterprise-grade security standards trusted by Fortune 500 companies
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <Card className="h-full text-center hover:shadow-xl transition-all">
                <CardHeader>
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className="mx-auto p-4 rounded-full bg-gradient-to-br from-[#2563eb]/10 to-[#4f46e5]/5 text-[#2563eb] w-fit mb-4"
                  >
                    <feature.icon className="h-8 w-8" />
                  </motion.div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="border-2">
            <div className="p-8">
              <h3 className="text-2xl font-semibold mb-6 text-center">Compliance Badges</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {compliance.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.1 }}
                    className="text-center"
                  >
                    <div className="h-32 flex items-center justify-center mb-3 bg-muted/50 rounded-xl border-2 hover:border-[#2563eb]/30 transition-all">
                      <Shield className="h-16 w-16 text-[#2563eb]" />
                    </div>
                    <p className="font-semibold mb-1">{item.name}</p>
                    <Badge variant={item.status === "Ready" || item.status === "Active" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                  </motion.div>
                ))}
              </div>
              <div className="flex justify-center">
                <Button variant="outline" size="lg" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Security Whitepaper
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};
