import { motion } from "framer-motion";
import { MapPin, Code2, Megaphone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const roles = [
  {
    icon: MapPin,
    title: "OOH Domain Experts",
    description: "Professionals with deep roots in outdoor media operations who understand the nuances of asset management, municipal compliance, and ground-level execution across cities.",
  },
  {
    icon: Code2,
    title: "Technology & Engineering",
    description: "Full-stack engineers and architects building scalable, secure, and performant systems — from real-time dashboards to mobile proof capture and AI-assisted planning.",
  },
  {
    icon: Megaphone,
    title: "Campaign Operations",
    description: "Operations specialists who have managed thousands of installations, mounting schedules, and client deliverables — ensuring the platform mirrors real execution workflows.",
  },
  {
    icon: Users,
    title: "Strategic Leadership",
    description: "Backed by Matrix Network Solutions, the leadership team brings decades of combined experience in media sales, enterprise software, and business scaling across India.",
  },
];

const Team = () => {
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
            Our Team
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed"
          >
            A team combining OOH expertise, technology, and execution excellence.
          </motion.p>
        </div>
      </section>

      {/* Team Cards */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Multidisciplinary by Design</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              GO-ADS is built by a team with hands-on experience across outdoor media operations, technology, and large-scale campaign execution.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {roles.map((role, i) => (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-8 hover:shadow-lg transition-shadow"
              >
                <div className="w-14 h-14 rounded-xl bg-[#1E40AF]/10 flex items-center justify-center mb-5">
                  <role.icon className="w-7 h-7 text-[#1E40AF]" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{role.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{role.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Want to Join Us?</h2>
            <p className="text-muted-foreground mb-8">We are always looking for talented individuals passionate about transforming outdoor advertising.</p>
            <Button size="lg" onClick={() => navigate("/careers")} className="rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
              View Careers
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Team;
