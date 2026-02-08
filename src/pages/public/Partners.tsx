import { motion } from "framer-motion";
import { Building, Users2, Landmark, Star, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const partnerTypes = [
  {
    icon: Building,
    title: "Media Owners",
    description: "List your OOH assets on GO-ADS, gain visibility with agencies and advertisers, and manage bookings, proofs, and billing from a single platform.",
  },
  {
    icon: Users2,
    title: "Advertising Agencies",
    description: "Access a marketplace of verified media assets. Plan campaigns for your clients with transparent pricing, availability tracking, and professional exports.",
  },
  {
    icon: Landmark,
    title: "Enterprise & Government",
    description: "Deploy GO-ADS for large-scale media operations with multi-tenant architecture, role-based access, audit trails, and compliance-ready reporting.",
  },
];

const Partners = () => {
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
            Partners
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed"
          >
            Partner with GO-ADS to scale your OOH business. Together, we are building a transparent and scalable ecosystem for outdoor advertising.
          </motion.p>
        </div>
      </section>

      {/* Partnership Types */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Partnership Opportunities</h2>
            <p className="text-muted-foreground text-lg">Collaborate with GO-ADS to grow your outdoor media operations.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {partnerTypes.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-8 hover:shadow-lg transition-shadow"
              >
                <div className="w-14 h-14 rounded-xl bg-[#1E40AF]/10 flex items-center justify-center mb-5">
                  <p.icon className="w-7 h-7 text-[#1E40AF]" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{p.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{p.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Strategic Partner */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <span className="inline-block text-sm font-semibold tracking-widest uppercase text-[#F4C542] mb-4">Strategic Partner</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Matrix Network Solutions</h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card border-2 border-[#F4C542]/30 rounded-2xl p-8 md:p-10 max-w-2xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-6">
              <Star className="w-6 h-6 text-[#F4C542]" />
              <span className="text-lg font-semibold text-foreground">Principal Strategic Partner</span>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Matrix Network Solutions serves as the principal strategic partner, anchoring the GO-ADS platform with industry expertise, operational credibility, and deep OOH domain knowledge.
            </p>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#1E40AF] mt-1 shrink-0" />
                <p className="text-muted-foreground">
                  H.No: 7-1-19/5/201, Jyothi Bhopal Apartments, Near Begumpet Metro Station, Opp. Country Club, Begumpet, Hyderabad – 500016, Telangana, India
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#1E40AF] shrink-0" />
                <a href="tel:+919666444888" className="text-foreground font-medium hover:text-[#1E40AF] transition-colors">
                  +91 96664 44888
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Become a Partner</h2>
            <p className="text-muted-foreground mb-8">Let us discuss how we can grow together.</p>
            <Button size="lg" onClick={() => navigate("/sales")} className="rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
              Talk to Our Team
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Partners;
