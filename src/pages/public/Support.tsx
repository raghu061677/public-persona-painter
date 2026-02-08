import { motion } from "framer-motion";
import { Rocket, BookOpen, Wrench, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const pillars = [
  {
    icon: Rocket,
    title: "Onboarding Assistance",
    description: "Get your team up and running with structured onboarding sessions. We walk you through account setup, asset creation, and your first campaign.",
  },
  {
    icon: BookOpen,
    title: "Product Guidance",
    description: "Detailed documentation, in-app tooltips, and guided workflows help your team use every feature effectively.",
  },
  {
    icon: Wrench,
    title: "Issue Resolution",
    description: "Report issues and get timely responses from our support team. We prioritize resolution based on severity and business impact.",
  },
  {
    icon: Headphones,
    title: "Ongoing Assistance",
    description: "As your operations scale, our team is available for continuous support — from feature guidance to data migration.",
  },
];

const SupportPage = () => {
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
            Support
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed"
          >
            Reliable support for every stage of your OOH operations.
          </motion.p>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">How We Support You</h2>
            <p className="text-muted-foreground text-lg">Our support model is designed for reliability and scale.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {pillars.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-8 hover:shadow-lg transition-shadow"
              >
                <div className="w-14 h-14 rounded-xl bg-[#10B981]/10 flex items-center justify-center mb-5">
                  <p.icon className="w-7 h-7 text-[#10B981]" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{p.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{p.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Need Help?</h2>
            <p className="text-muted-foreground mb-8">Our team is here to assist you at every step.</p>
            <Button size="lg" onClick={() => navigate("/proof-collection")} className="rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
              Contact Us
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default SupportPage;
