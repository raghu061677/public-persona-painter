import { motion } from "framer-motion";
import { Search, Calendar, IndianRupee, FileOutput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Discover Assets",
    description: "Browse available media assets filtered by city, type, size, and availability. View photos, map locations, and historical performance before selecting.",
  },
  {
    icon: Calendar,
    step: "02",
    title: "Plan Campaigns",
    description: "Define custom campaign durations, select multiple assets, and manage flexible start and end dates. Support for pro-rata billing and monthly billing cycles.",
  },
  {
    icon: IndianRupee,
    step: "03",
    title: "Manage Pricing",
    description: "Set negotiated rates, printing charges, and mounting costs per asset. AI-powered rate recommendations based on historical data help optimize pricing.",
  },
  {
    icon: FileOutput,
    step: "04",
    title: "Generate Proposals",
    description: "Export professional proposals as PPT, Excel, or PDF. Share plans with clients via secure public links for review and approval.",
  },
];

const CampaignPlanning = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628] via-[#1E40AF] to-[#0A1628]" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
          >
            Campaign Planning
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed"
          >
            Plan smarter OOH campaigns with clarity and control. Every plan is structured for execution, approvals, and reporting.
          </motion.p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">How It Works</h2>
            <p className="text-muted-foreground text-lg">Four steps from discovery to proposal.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-8 relative overflow-hidden hover:shadow-lg transition-shadow"
              >
                <span className="absolute top-4 right-6 text-6xl font-black text-muted/20">{s.step}</span>
                <div className="w-12 h-12 rounded-xl bg-[#1E40AF]/10 flex items-center justify-center mb-5">
                  <s.icon className="w-6 h-6 text-[#1E40AF]" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Start Planning Today</h2>
            <p className="text-muted-foreground mb-8">Create your first media plan with GO-ADS in minutes.</p>
            <Button size="lg" onClick={() => navigate("/auth")} className="rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
              Get Started
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default CampaignPlanning;
