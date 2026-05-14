import { motion } from "framer-motion";
import {
  Search, Calendar, IndianRupee, FileOutput, MapPin, Sparkles,
  Users, ShieldCheck, Layers, Workflow, CheckCircle2, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Discover Available Inventory",
    description:
      "Browse a unified inventory of billboards, bus shelters, unipoles, gantries and DOOH screens. Filter by city, area, media type, illumination, dimension, traffic direction and live availability windows.",
    bullets: ["Real-time vacant filter for any date range", "Map + grid view with photos", "Save shortlists for repeat clients"],
  },
  {
    icon: Calendar,
    step: "02",
    title: "Build the Plan",
    description:
      "Add assets to a plan with custom start/end dates per line item. Supports continuous campaigns, monthly cycles, and pro-rata billing. Conflicts are surfaced instantly so you never double-book.",
    bullets: ["Per-asset date overrides", "Automatic overlap detection", "Holds for tentative inventory"],
  },
  {
    icon: IndianRupee,
    step: "03",
    title: "Price & Negotiate",
    description:
      "Set negotiated rates, printing and mounting charges per asset. AI rate suggestions reference your historical bookings for similar inventory. Live margin and GST calculations run as you edit.",
    bullets: ["Card rate vs negotiated rate", "Printing + mounting fixed amounts", "CGST/SGST or IGST auto-applied"],
  },
  {
    icon: FileOutput,
    step: "04",
    title: "Share & Convert",
    description:
      "Export the plan as a branded PPT, Excel, or PDF. Share a secure public link for client sign-off, then convert the approved plan into a campaign in one click — assets, dates and pricing carry over.",
    bullets: ["Branded PPT with site photos", "Public link with expiry", "One-click plan → campaign"],
  },
];

const capabilities = [
  { icon: Sparkles, title: "AI Rate Recommender", desc: "Suggested price bands based on historical bookings of comparable assets in the same city and media type." },
  { icon: MapPin, title: "Geo-aware Selection", desc: "Map view with traffic direction, landmarks and clusters to build planning routes the brand will recognise." },
  { icon: Layers, title: "Multi-cycle Billing", desc: "Mix continuous, monthly-cycle and pro-rata items inside the same plan without breaking your invoicing." },
  { icon: Users, title: "Approval Workflow", desc: "Sales lead, finance and admin can approve or reject plans with reason capture and a complete audit trail." },
  { icon: ShieldCheck, title: "Conflict Guardrails", desc: "Real-time validation prevents double-booked assets, expired holds, and out-of-range dates before conversion." },
  { icon: Workflow, title: "Quotation Lifecycle", desc: "Draft → Sent → Approved → Converted, with versioning so every revision is preserved for the client record." },
];

const faqs = [
  {
    q: "Can I plan a campaign across multiple cities and media owners?",
    a: "Yes. A single plan can mix your owned inventory with marketplace assets from partner media owners. Pricing, billing and proofs are tracked per line item.",
  },
  {
    q: "How does pro-rata billing work?",
    a: "If an asset runs for a partial billing cycle, the rate is scaled by the ratio of actual days to cycle days. Mounting and printing remain fixed values and are not pro-rated.",
  },
  {
    q: "What happens to assets when a plan becomes a campaign?",
    a: "On conversion, each plan item creates a campaign asset with the same dates, pricing and pricing snapshot. Operations tasks are auto-generated for mounters.",
  },
  {
    q: "Can clients approve a plan online?",
    a: "Yes. Generate a secure public share link with optional expiry. Clients view the plan, photos and totals — no login needed — and you receive an approval notification.",
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
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-block text-xs md:text-sm font-semibold tracking-widest uppercase text-[#F4C542] mb-4"
          >
            Plan smarter. Sell faster.
          </motion.span>
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
            Build OOH media plans that are priced correctly, free of conflicts, and ready for client sign-off — then convert them into a live campaign without re-keying a single field.
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
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">From inventory to client approval</h2>
            <p className="text-muted-foreground text-lg">A four-step workflow your sales team can run end-to-end.</p>
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
                <p className="text-muted-foreground leading-relaxed mb-4">{s.description}</p>
                <ul className="space-y-2">
                  {s.bullets.map((b) => (
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

      {/* Capabilities */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Built for OOH realities</h2>
            <p className="text-muted-foreground text-lg">The details that separate a polished planner from a spreadsheet.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="w-11 h-11 rounded-lg bg-[#1E40AF]/10 flex items-center justify-center mb-4">
                  <c.icon className="w-5 h-5 text-[#1E40AF]" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{c.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
              </motion.div>
            ))}
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
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Ship your next plan in minutes</h2>
            <p className="text-muted-foreground mb-8">Stop juggling spreadsheets. Plan, price and convert in one place.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={() => navigate("/auth")} className="rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
                Get Started <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/sales")} className="rounded-xl font-semibold">
                Talk to Sales
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default CampaignPlanning;
