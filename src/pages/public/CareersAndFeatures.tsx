import { motion } from "framer-motion";
import { Heart, TrendingUp, Zap, MapPin, BarChart3, FileText, IndianRupee, Bot, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const benefits = [
  { icon: Zap, title: "Impact at Scale", description: "Work on products that shape real-world advertising across cities." },
  { icon: TrendingUp, title: "Growth Environment", description: "Collaborate with domain experts and engineers solving hard problems." },
  { icon: Heart, title: "Purpose-Driven Work", description: "Help digitize an industry still running on spreadsheets and manual processes." },
];

const features = [
  { icon: MapPin, title: "Campaign Planning", description: "Discover assets, plan campaigns, manage pricing, and generate proposals." },
  { icon: BarChart3, title: "Asset Management", description: "Centralized inventory with availability tracking, photos, and QR identification." },
  { icon: Camera, title: "Proof of Execution", description: "Mobile uploads, geo-tagged images, campaign galleries, and auto-generated PPTs." },
  { icon: FileText, title: "Reporting & Exports", description: "Work orders, campaign summaries, revenue reports, and occupancy analytics." },
  { icon: IndianRupee, title: "GST & Finance", description: "Quotations, invoices, expenses, and payment tracking with GST compliance." },
  { icon: Bot, title: "AI Assistant", description: "Natural language queries for vacant media, pending invoices, and client summaries." },
];

const CareersAndFeatures = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Careers Hero */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628] via-[#1E40AF] to-[#0A1628]" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
          >
            Careers & Features
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed"
          >
            Build the future of OOH with GO-ADS.
          </motion.p>
        </div>
      </section>

      {/* Careers Section */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block text-sm font-semibold tracking-widest uppercase text-[#F4C542] mb-4">Careers</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Join the Team</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              At GO-ADS, we are building the digital backbone of the OOH industry. We welcome professionals passionate about technology, advertising, operations, and scalable systems.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-6 text-center"
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-[#10B981]/10 flex items-center justify-center mb-4">
                  <b.icon className="w-6 h-6 text-[#10B981]" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.description}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Button size="lg" onClick={() => navigate("/proof-collection")} className="rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
              Get in Touch
            </Button>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-[#F4C542] to-transparent" />
      </div>

      {/* Features Section */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block text-sm font-semibold tracking-widest uppercase text-[#F4C542] mb-4">Features</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Platform Overview</h2>
            <p className="text-muted-foreground text-lg">All your OOH operations — planned, tracked, and delivered in one system.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-[#1E40AF]/10 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-[#1E40AF]" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default CareersAndFeatures;
