import { motion } from "framer-motion";
import {
  Database, CalendarCheck, History, QrCode, MapPin, Camera,
  Zap, ShieldCheck, Tag, FileSpreadsheet, ArrowRight, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";

const capabilities = [
  {
    icon: Database,
    title: "Centralized Inventory",
    description: "One source of truth for billboards, bus shelters, unipoles, gantries, kiosks and DOOH screens — with photos, GPS, dimensions, illumination, traffic direction, municipal IDs and rate cards.",
    bullets: ["Smart asset codes (e.g. HYD-BSQ-0001)", "Owned + partner inventory in one view", "Soft-delete with full audit trail"],
  },
  {
    icon: CalendarCheck,
    title: "Live Availability",
    description: "Real-time availability across every plan, hold and campaign. The system surfaces the exact next-available date so sales never quotes inventory that is already booked.",
    bullets: ["Vacant-on-date filter", "Automatic conflict detection", "Holds for tentative business"],
  },
  {
    icon: History,
    title: "Booking History & Performance",
    description: "Every campaign, client and rate is preserved on the asset. Use the history to defend pricing, identify under-utilised inventory, and renew the right clients at the right moment.",
    bullets: ["Per-asset revenue & occupancy", "Client-wise rate history", "Renewal opportunity flags"],
  },
  {
    icon: QrCode,
    title: "QR-based Field Verification",
    description: "Print a QR sticker on each asset. Field teams scan to open the asset record, capture proofs, log maintenance and confirm GPS — no manual asset lookup.",
    bullets: ["Auto-generate per-asset QR", "Open mobile proof flow on scan", "Mounter accountability"],
  },
];

const fields = [
  { icon: MapPin, label: "Location & GPS", desc: "City, area, latitude/longitude, traffic direction, landmarks." },
  { icon: Tag, label: "Specifications", desc: "Media type, dimensions, total sqft, illumination, side count." },
  { icon: Camera, label: "Site Photos", desc: "Multiple angle photos with EXIF + watermarking on shareables." },
  { icon: Zap, label: "Power & Maintenance", desc: "TGSPDCL consumer no., monthly bills, service tickets." },
  { icon: ShieldCheck, label: "Municipal Compliance", desc: "Authority, permit ID, validity dates and renewal alerts." },
  { icon: FileSpreadsheet, label: "Pricing & Charges", desc: "Card rate, base rate, printing and mounting amounts." },
];

const exportRow = [
  "Bulk import via Excel template",
  "Standard 15-column client-ready export",
  "Per-asset QR sheets",
  "Map-view export with site photos",
];

const faqs = [
  {
    q: "Can I import my existing inventory from Excel?",
    a: "Yes. Use the bulk import template to upload hundreds of assets in one go. The system validates duplicates, GPS, and rate fields, and shows a row-by-row error report before committing.",
  },
  {
    q: "How are duplicate assets prevented?",
    a: "Duplicate detection uses identity fields (city, area, dimension, GPS, municipal ID) rather than name alone, so two records of the same hoarding cannot accidentally co-exist.",
  },
  {
    q: "Can I share inventory with agency partners?",
    a: "Mark assets as public to expose them in the marketplace. Agencies can see availability and rates, request bookings, and you stay in control of the final pricing.",
  },
  {
    q: "What happens when an asset is dismantled or paused?",
    a: "You can deactivate an asset operationally without deleting history. Past bookings, invoices and proofs remain intact and the asset stops appearing in availability searches.",
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
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-block text-xs md:text-sm font-semibold tracking-widest uppercase text-[#F4C542] mb-4"
          >
            Inventory you can trust
          </motion.span>
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
            Manage your entire OOH inventory in one structured database — with live availability, verified site photos, municipal compliance, and clean rate cards your team will actually use.
          </motion.p>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Core capabilities</h2>
            <p className="text-muted-foreground text-lg">Everything you need to run inventory like a media owner, not a spreadsheet.</p>
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
                <p className="text-muted-foreground leading-relaxed mb-4">{c.description}</p>
                <ul className="space-y-2">
                  {c.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Field Coverage */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Every detail that matters</h2>
            <p className="text-muted-foreground text-lg">A 360° asset record so finance, ops and sales speak the same language.</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {fields.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="w-11 h-11 rounded-lg bg-[#1E40AF]/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-[#1E40AF]" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{f.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Import / Export */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-card border border-border rounded-2xl p-8 md:p-10">
            <h3 className="text-2xl font-bold text-foreground mb-4">Onboard 1,000 assets in an afternoon</h3>
            <p className="text-muted-foreground mb-6">Bulk imports, validated templates and ready-to-share exports — so migrating from Excel takes hours, not weeks.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {exportRow.map((r) => (
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
      <section className="py-16 md:py-20 bg-muted/30">
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
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Take control of your inventory</h2>
          <p className="text-muted-foreground mb-8">Stop chasing the latest Excel sheet. Run inventory the way modern media owners do.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => navigate("/auth")} className="rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
              Get Started <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/sales")} className="rounded-xl font-semibold">
              Book a Demo
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AssetManagement;
