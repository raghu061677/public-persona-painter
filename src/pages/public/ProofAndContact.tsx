import { motion } from "framer-motion";
import { Smartphone, MapPinned, Images, FileImage, Phone, MapPin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const proofFeatures = [
  { icon: Smartphone, title: "Mobile Uploads", description: "Field staff upload proof photos directly from their mobile devices — no desktop required." },
  { icon: MapPinned, title: "Geo-tagged & Time-stamped", description: "Every photo includes GPS coordinates and timestamp metadata for verifiable proof of installation." },
  { icon: Images, title: "Campaign Galleries", description: "Proofs are organized by campaign and asset, making it easy to review, audit, and share with clients." },
  { icon: FileImage, title: "Auto-generated PPTs", description: "Client-ready proof presentations are generated automatically, saving hours of manual compilation." },
];

const ProofAndContact = () => {
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
            Proof Collection & Contact
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed"
          >
            Collect and share campaign proofs with confidence. Reach out to our team for any inquiries.
          </motion.p>
        </div>
      </section>

      {/* Proof Section */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block text-sm font-semibold tracking-widest uppercase text-[#F4C542] mb-4">Proof of Execution</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Campaign Accountability</h2>
            <p className="text-muted-foreground text-lg">Structured proof collection that is organized, auditable, and presentation-ready.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {proofFeatures.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-[#1E40AF]/10 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-[#1E40AF]" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-[#F4C542] to-transparent" />
      </div>

      {/* Contact Section */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block text-sm font-semibold tracking-widest uppercase text-[#F4C542] mb-4">Contact</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Get in Touch</h2>
            <p className="text-muted-foreground text-lg">For demos, support, or partnership inquiries, reach out to our team.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card border border-border rounded-2xl p-8 md:p-10 max-w-2xl mx-auto"
          >
            <h3 className="text-xl font-bold text-foreground mb-6">Matrix Network Solutions</h3>
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <MapPin className="w-5 h-5 text-[#1E40AF] mt-1 shrink-0" />
                <p className="text-muted-foreground leading-relaxed">
                  H.No: 7-1-19/5/201, Jyothi Bhopal Apartments,<br />
                  Near Begumpet Metro Station, Opp. Country Club,<br />
                  Begumpet, Hyderabad – 500016,<br />
                  Telangana, India
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Phone className="w-5 h-5 text-[#1E40AF] shrink-0" />
                <a href="tel:+919666444888" className="text-foreground font-medium hover:text-[#1E40AF] transition-colors">
                  +91 96664 44888
                </a>
              </div>
              <div className="flex items-center gap-4">
                <Mail className="w-5 h-5 text-[#1E40AF] shrink-0" />
                <span className="text-muted-foreground">info@go-ads.in</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <Button size="lg" onClick={() => navigate("/sales")} className="w-full rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
                Request a Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default ProofAndContact;
