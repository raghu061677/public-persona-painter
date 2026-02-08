import { motion } from "framer-motion";
import { Target, BarChart3, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const values = [
  {
    icon: Target,
    title: "End-to-End OOH Management",
    description: "From asset discovery to proof of execution, every step of your outdoor advertising workflow lives in one unified platform.",
  },
  {
    icon: BarChart3,
    title: "Data-Driven Decisions",
    description: "Real-time analytics, occupancy tracking, and financial reporting give you full visibility into campaign performance.",
  },
  {
    icon: Shield,
    title: "Enterprise-Grade Reliability",
    description: "Role-based access, audit trails, and GST-compliant invoicing built for organizations that demand governance.",
  },
  {
    icon: Globe,
    title: "Built for Scale",
    description: "Multi-tenant architecture supports media owners, agencies, and enterprise clients across cities and regions.",
  },
];

const metrics = [
  { label: "Cities Supported", value: "50+" },
  { label: "Assets Managed", value: "10,000+" },
  { label: "Campaigns Delivered", value: "5,000+" },
  { label: "Uptime", value: "99.9%" },
];

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628] via-[#1E40AF] to-[#0A1628]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, rgba(244, 197, 66, 0.15), transparent 60%)" }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
          >
            About GO-ADS
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed"
          >
            GO-ADS is a unified OOH advertising platform designed to bring clarity, control, and confidence to outdoor media operations. Built in partnership with Matrix Network Solutions, it enables advertisers, agencies, and media owners to plan, manage, and execute campaigns with enterprise-grade precision.
          </motion.p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block text-sm font-semibold tracking-widest uppercase text-[#F4C542] mb-4">Our Mission</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Making OOH Advertising Measurable, Transparent, and Scalable
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              From asset discovery to proof of execution, GO-ADS replaces fragmented workflows with a single, intelligent operating system for outdoor advertising — without compromising on execution quality.
            </p>
          </motion.div>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">What We Do</h2>
            <p className="text-muted-foreground text-lg">A modern, scalable OOH operating system.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-[#1E40AF]/10 flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-[#1E40AF]" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-[#1E40AF] to-[#0A1628]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-white text-center mb-12"
          >
            Built for Scale
          </motion.h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {metrics.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-bold text-[#F4C542]">{m.value}</p>
                <p className="text-white/70 mt-2 text-sm">{m.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Ready to Transform Your OOH Operations?</h2>
            <p className="text-muted-foreground mb-8">Get started with GO-ADS and experience the future of outdoor advertising management.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/sales")} className="rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
                Request a Demo
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="rounded-xl font-semibold">
                Get Started
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About;
