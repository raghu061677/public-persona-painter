import { motion } from "framer-motion";
import { Presentation, MessageSquare, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const benefits = [
  {
    icon: Presentation,
    title: "Tailored Demos",
    description: "See GO-ADS in action with a walkthrough customized to your business — whether you manage 10 assets or 10,000.",
  },
  {
    icon: MessageSquare,
    title: "Consultative Approach",
    description: "Our sales team understands OOH workflows. We discuss your challenges first and show you how the platform addresses them.",
  },
  {
    icon: Building2,
    title: "Enterprise Ready",
    description: "From single-city agencies to multi-region media groups, GO-ADS scales with your business. Discuss deployment options with our team.",
  },
];

const SalesPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628] via-[#1E40AF] to-[#0A1628]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 70% 30%, rgba(244, 197, 66, 0.2), transparent 60%)" }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
          >
            See GO-ADS in Action
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed mb-8"
          >
            Request a demo and discover how GO-ADS fits your organization. Our team offers workflow walkthroughs and scalability discussions based on your business size and geography.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              size="lg"
              onClick={() => navigate("/proof-collection")}
              className="rounded-xl font-semibold text-base px-10 py-6"
              style={{ background: "linear-gradient(135deg, #F4C542, #E5A500)" }}
            >
              <span className="text-[#0A1628]">Request a Demo</span>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Why Talk to Us</h2>
            <p className="text-muted-foreground text-lg">We do not just sell software. We help you rethink operations.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-8 hover:shadow-lg transition-shadow"
              >
                <div className="w-14 h-14 rounded-xl bg-[#F4C542]/10 flex items-center justify-center mb-5">
                  <b.icon className="w-7 h-7 text-[#F4C542]" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{b.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{b.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-[#1E40AF] to-[#0A1628]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-white/70 mb-8">Create your account and explore the platform.</p>
            <Button size="lg" onClick={() => navigate("/auth")} className="rounded-xl font-semibold bg-white text-[#1E40AF] hover:bg-white/90">
              Sign Up Free
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default SalesPage;
