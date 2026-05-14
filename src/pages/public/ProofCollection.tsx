import { motion } from "framer-motion";
import {
  Smartphone, MapPinned, Camera, FileImage, ShieldCheck, Image as ImageIcon,
  Newspaper, Eye, ArrowRight, CheckCircle2, Clock, QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";

const photoTypes = [
  { icon: Newspaper, label: "Newspaper Tag", desc: "Mounter holds the day's newspaper at the site to prove the install date — no editing, no excuses." },
  { icon: MapPinned, label: "Geo-tagged Hero", desc: "Wide shot with embedded GPS + EXIF timestamp, validated against the asset's registered coordinates." },
  { icon: Eye, label: "Traffic View 1", desc: "Long-distance approach shot showing the creative as the audience first sees it." },
  { icon: Eye, label: "Traffic View 2", desc: "Opposite-direction or alternate angle to demonstrate visibility from both sides of traffic." },
  { icon: ImageIcon, label: "Close-up / Creative", desc: "Sharp close-up of the creative for QC — colour fidelity, alignment and lamination." },
];

const features = [
  { icon: Smartphone, title: "Mobile-first Capture", desc: "Field staff capture and upload directly from their phone — no desktop, no email attachments." },
  { icon: ShieldCheck, title: "EXIF + GPS Validated", desc: "Every photo is checked for GPS within range of the asset and a fresh timestamp before it is accepted." },
  { icon: QrCode, title: "Scan-to-Upload", desc: "Mounters scan the QR sticker on the asset to jump straight into the correct upload screen." },
  { icon: FileImage, title: "Auto Proof PPT", desc: "A branded, client-ready proof deck is generated automatically once all asset photos are verified." },
  { icon: Clock, title: "Real-time Status", desc: "Sales and clients see live execution status — Assigned → Installed → Proof Uploaded → Verified." },
  { icon: Camera, title: "Watermark & Branding", desc: "Outgoing proof images are watermarked with your logo and campaign code to protect provenance." },
];

const workflow = [
  { step: "01", title: "Auto-assign Mounters", desc: "On campaign go-live, mounting tasks are generated per asset and pushed to the assigned mounter." },
  { step: "02", title: "Field Capture", desc: "Mounter scans the asset QR, opens the upload screen, and captures the 5 mandatory photos." },
  { step: "03", title: "Validation", desc: "GPS, EXIF and image quality are checked. Failed photos are rejected with a clear reason for re-capture." },
  { step: "04", title: "Verify & Share", desc: "Ops verifies the set, the proof PPT auto-generates, and the client gets a portal link with download access." },
];

const faqs = [
  { q: "What happens if a photo's GPS is outside the asset's location?", a: "The upload is rejected with a clear message. The mounter must re-capture from the actual site — this prevents fake or recycled proofs." },
  { q: "Can clients see proofs without logging in?", a: "Yes. Each campaign has a secure proof gallery that you can share via a link with optional expiry. Clients view photos, download the PPT, and never see other clients' work." },
  { q: "Are old/recycled photos blocked?", a: "EXIF timestamp is enforced. If a photo is older than your configured threshold, it is rejected. Fresh capture is mandatory." },
  { q: "Can I customise which photo types are required?", a: "The 5-photo standard is the default for accountability, but admins can adjust the required tags per campaign or per client requirement." },
];

const ProofCollection = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628] via-[#1E40AF] to-[#0A1628]" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-block text-xs md:text-sm font-semibold tracking-widest uppercase text-[#F4C542] mb-4"
          >
            Verifiable proof, every time
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
          >
            Proof Collection
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed"
          >
            Replace WhatsApp folders and recycled JPEGs with structured, GPS-verified proof of execution. Mounters capture the right photos from the field. Clients receive a branded deck without you lifting a finger.
          </motion.p>
        </div>
      </section>

      {/* The 5 photos */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">The 5-photo standard</h2>
            <p className="text-muted-foreground text-lg">A consistent set of evidence for every asset, on every campaign.</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {photoTypes.map((p, i) => (
              <motion.div
                key={p.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="w-11 h-11 rounded-lg bg-[#1E40AF]/10 flex items-center justify-center mb-4">
                  <p.icon className="w-5 h-5 text-[#1E40AF]" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{p.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">How proof collection works</h2>
            <p className="text-muted-foreground text-lg">From mounter assignment to client-ready deck.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflow.map((w, i) => (
              <motion.div
                key={w.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden"
              >
                <span className="absolute top-3 right-5 text-5xl font-black text-muted/20">{w.step}</span>
                <h3 className="text-base font-semibold text-foreground mb-2 relative">{w.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed relative">{w.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Built for accountability</h2>
            <p className="text-muted-foreground text-lg">The features that make proofs hold up under client scrutiny.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="w-11 h-11 rounded-lg bg-[#1E40AF]/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-[#1E40AF]" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-card border border-border rounded-2xl p-8 md:p-10">
            <h3 className="text-2xl font-bold text-foreground mb-6">What you get out of it</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                "Faster client sign-off — proofs in their inbox the same day as install",
                "No more recycled or fake photos — GPS + EXIF enforced",
                "Auto-generated, branded PPT for every campaign",
                "Clear ops accountability per mounter and per asset",
                "Searchable proof archive — pull any campaign in seconds",
                "Stronger renewals — clients see real execution, not promises",
              ].map((r) => (
                <div key={r} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">Frequently asked</h2>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`f${i}`} className="bg-card border border-border rounded-xl px-5 border-b">
                <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Make every campaign defensible</h2>
          <p className="text-muted-foreground mb-8">Structured proof collection your clients will trust and your team will actually use.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => navigate("/auth")} className="rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
              Get Started <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/support")} className="rounded-xl font-semibold">
              Talk to Support
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProofCollection;
