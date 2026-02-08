import { motion } from "framer-motion";
import { Database, CalendarCheck, History, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const capabilities = [
  {
    icon: Database,
    title: "Centralized Inventory",
    description: "Manage your entire media inventory — billboards, bus shelters, unipoles, gantries — in one structured database with photos, dimensions, rates, and municipal details.",
  },
  {
    icon: CalendarCheck,
    title: "Availability Tracking",
    description: "Real-time status visibility: Available, Booked, or Upcoming. Booking calendars show exactly when each asset is occupied and when it opens up.",
  },
  {
    icon: History,
    title: "Historical Performance",
    description: "Track which clients booked each asset, at what rates, for how long. Use historical data to optimize pricing and identify high-performing locations.",
  },
  {
    icon: QrCode,
    title: "QR-Based Identification",
    description: "Every asset can be linked to a unique QR code for field verification. Scan to pull up asset details, upload proofs, or check booking status on-site.",
  },
];

const AssetManagement = () => {
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
            Asset Management
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed"
          >
            Manage your media inventory with real-time visibility. Track availability, performance, and operations across cities and teams.
          </motion.p>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Core Capabilities</h2>
            <p className="text-muted-foreground text-lg">Everything you need to manage OOH media assets at scale.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {capabilities.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-8 hover:shadow-lg transition-shadow"
              >
                <div className="w-14 h-14 rounded-xl bg-[#1E40AF]/10 flex items-center justify-center mb-5">
                  <c.icon className="w-7 h-7 text-[#1E40AF]" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{c.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{c.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Take Control of Your Inventory</h2>
            <p className="text-muted-foreground mb-8">Start managing your media assets with GO-ADS today.</p>
            <Button size="lg" onClick={() => navigate("/auth")} className="rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
              Get Started
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default AssetManagement;
