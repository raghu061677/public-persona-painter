import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, Calendar, IndianRupee, FileOutput, MapPin, Sparkles,
  Users, ShieldCheck, Layers, Workflow, CheckCircle2, ArrowRight,
  ClipboardList, Target, MessageSquareWarning,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const steps = [
  { icon: Search, step: "01", title: "Discover Available Inventory", description: "Browse a unified inventory of billboards, bus shelters, unipoles, gantries and DOOH screens. Filter by city, area, media type, illumination, dimension, traffic direction and live availability windows.", bullets: ["Real-time vacant filter for any date range", "Map + grid view with photos", "Save shortlists for repeat clients"] },
  { icon: Calendar, step: "02", title: "Build the Plan", description: "Add assets to a plan with custom start/end dates per line item. Supports continuous campaigns, monthly cycles, and pro-rata billing. Conflicts are surfaced instantly so you never double-book.", bullets: ["Per-asset date overrides", "Automatic overlap detection", "Holds for tentative inventory"] },
  { icon: IndianRupee, step: "03", title: "Price & Negotiate", description: "Set negotiated rates, printing and mounting charges per asset. AI rate suggestions reference your historical bookings for similar inventory. Live margin and GST calculations run as you edit.", bullets: ["Card rate vs negotiated rate", "Printing + mounting fixed amounts", "CGST/SGST or IGST auto-applied"] },
  { icon: FileOutput, step: "04", title: "Share & Convert", description: "Export the plan as a branded PPT, Excel, or PDF. Share a secure public link for client sign-off, then convert the approved plan into a campaign in one click — assets, dates and pricing carry over.", bullets: ["Branded PPT with site photos", "Public link with expiry", "One-click plan → campaign"] },
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
  { q: "Can I plan a campaign across multiple cities and media owners?", a: "Yes. A single plan can mix your owned inventory with marketplace assets from partner media owners. Pricing, billing and proofs are tracked per line item — and the consolidated invoice still respects the right tax codes per state." },
  { q: "How does pro-rata billing work?", a: "If an asset runs for a partial billing cycle, the rate is scaled by the ratio of actual days to cycle days using inclusive day counting (end − start + 1). Mounting and printing remain fixed values and are not pro-rated. The cycle is configurable — typically 30 days or calendar month." },
  { q: "What happens to assets when a plan becomes a campaign?", a: "On conversion, each plan item creates a campaign asset with the same dates, pricing and a frozen pricing snapshot for billing. Operations tasks are auto-generated for mounters and the underlying media is locked from being booked by other plans for those dates." },
  { q: "Can clients approve a plan online?", a: "Yes. Generate a secure public share link with optional expiry. Clients view the plan, photos and totals — no login needed — and you receive an approval notification. Approval is recorded with timestamp and IP for the audit trail." },
  { q: "Can I lock inventory while the client decides?", a: "Yes — place soft holds on selected assets directly from the plan. Holds expire automatically after a configurable window, freeing up inventory if the client doesn't approve in time." },
  { q: "Does the plan support GST (CGST/SGST/IGST) and TDS?", a: "Yes. The system picks CGST+SGST for intra-state and IGST for inter-state automatically based on the client's GSTIN and your registered state. TDS deductions can be modelled per client and reflected in the receivables." },
  { q: "Can I build plans for clients without a finalised brief?", a: "Yes — start with a draft plan, lock pricing later. The intake form below generates a tailored checklist so nothing falls through the cracks even when the brief is half-baked." },
];

const cityOptions = ["Hyderabad", "Bengaluru", "Chennai", "Mumbai", "Delhi NCR", "Pune", "Ahmedabad", "Kolkata", "Visakhapatnam", "Vijayawada"];
const mediaOptions = ["Billboard / Hoarding", "Bus Shelter", "Unipole / Gantry", "Kiosk / Pole Kiosk", "DOOH / LED screen", "Mall / Airport / Metro"];

type Intake = {
  brand: string; contactName: string; contactEmail: string; contactPhone: string;
  cities: string[]; medias: string[];
  startDate: string; endDate: string; budget: string; objective: string;
  audience: string; creativeReady: string; specialReq: string;
};

const emptyIntake: Intake = {
  brand: "", contactName: "", contactEmail: "", contactPhone: "",
  cities: [], medias: [], startDate: "", endDate: "", budget: "", objective: "awareness",
  audience: "", creativeReady: "no", specialReq: "",
};

const CampaignPlanning = () => {
  const navigate = useNavigate();
  const [intake, setIntake] = useState<Intake>(emptyIntake);
  const [generated, setGenerated] = useState<Intake | null>(null);

  const toggleArr = (key: "cities" | "medias", v: string) => {
    setIntake((s) => ({ ...s, [key]: s[key].includes(v) ? s[key].filter((x) => x !== v) : [...s[key], v] }));
  };

  const checklist = useMemo(() => {
    if (!generated) return [] as { title: string; owner: string; due: string }[];
    const list: { title: string; owner: string; due: string }[] = [
      { title: `Confirm brief with ${generated.brand || "the brand"} (objective: ${generated.objective})`, owner: "Sales Lead", due: "Day 1" },
      { title: `Shortlist inventory across ${generated.cities.length || "selected"} city / cities`, owner: "Planner", due: "Day 1–2" },
      { title: `Filter by media types: ${generated.medias.join(", ") || "as discussed"}`, owner: "Planner", due: "Day 2" },
      { title: "Run AI rate recommender + freeze negotiated rates", owner: "Sales Lead", due: "Day 2–3" },
      { title: "Reserve soft holds for shortlisted inventory", owner: "Planner", due: "Day 3" },
      { title: "Generate plan PPT/PDF with site photos and totals", owner: "Planner", due: "Day 3" },
      { title: "Share secure approval link with client", owner: "Sales Lead", due: "Day 4" },
    ];
    if (generated.creativeReady === "no") {
      list.push({ title: "Brief printer with sizes and bleed; receive proofs", owner: "Operations", due: "Day 5–6" });
    }
    if (generated.budget && Number(generated.budget) >= 1000000) {
      list.push({ title: "Trigger management approval (₹10L+ campaign)", owner: "Admin", due: "Day 4" });
    }
    if (generated.specialReq) {
      list.push({ title: `Special requirement: ${generated.specialReq}`, owner: "Sales Lead", due: "Day 2" });
    }
    list.push({ title: "Convert approved plan → live campaign and lock dates", owner: "Sales Lead", due: "Day 6–7" });
    list.push({ title: "Auto-assign mounters and trigger ops tasks", owner: "Operations", due: "Go-live − 2 days" });
    return list;
  }, [generated]);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setGenerated({ ...intake });
    setTimeout(() => document.getElementById("plan-output")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const escalate = () => {
    const msg = generated
      ? `Brand: ${generated.brand}\nContact: ${generated.contactName} (${generated.contactEmail}, ${generated.contactPhone})\nCities: ${generated.cities.join(", ")}\nMedia types: ${generated.medias.join(", ")}\nWindow: ${generated.startDate} → ${generated.endDate}\nBudget (INR): ${generated.budget}\nObjective: ${generated.objective}\nAudience: ${generated.audience}\nCreative ready: ${generated.creativeReady}\nSpecial requirements: ${generated.specialReq}`
      : "I'd like help building a media plan for an upcoming OOH campaign.";
    const params = new URLSearchParams({
      topic: "Campaign Planning",
      category: "campaign_planning",
      subject: generated ? `Campaign plan request — ${generated.brand || "new brief"}` : "Campaign planning — talk to an expert",
      message: msg,
      name: generated?.contactName || "",
      email: generated?.contactEmail || "",
      phone: generated?.contactPhone || "",
      company: generated?.brand || "",
    });
    navigate(`/support?${params.toString()}#new-ticket`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628] via-[#1E40AF] to-[#0A1628]" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-xs md:text-sm font-semibold tracking-widest uppercase text-[#F4C542] mb-4">Plan smarter. Sell faster.</span>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">Campaign Planning</motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Build OOH media plans that are priced correctly, free of conflicts, and ready for client sign-off — then convert them into a live campaign without re-keying a single field.
          </motion.p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => document.getElementById("intake")?.scrollIntoView({ behavior: "smooth" })} className="rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
              Start a tailored plan <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={escalate} className="rounded-xl font-semibold border-white/30 text-white bg-white/10 hover:bg-white/20">
              Talk to an expert
            </Button>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">From inventory to client approval</h2>
            <p className="text-muted-foreground text-lg">A four-step workflow your sales team can run end-to-end.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {steps.map((s, i) => (
              <motion.div key={s.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bg-card border border-border rounded-2xl p-8 relative overflow-hidden hover:shadow-lg transition-shadow">
                <span className="absolute top-4 right-6 text-6xl font-black text-muted/20">{s.step}</span>
                <div className="w-12 h-12 rounded-xl bg-[#1E40AF]/10 flex items-center justify-center mb-5"><s.icon className="w-6 h-6 text-[#1E40AF]" /></div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">{s.description}</p>
                <ul className="space-y-2">
                  {s.bullets.map((b) => (<li key={b} className="flex items-start gap-2 text-sm text-muted-foreground"><CheckCircle2 className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0" /><span>{b}</span></li>))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Intake Form */}
      <section id="intake" className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Badge variant="secondary" className="mb-3"><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Interactive intake</Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Tell us about your campaign</h2>
            <p className="text-muted-foreground text-lg">Answer a few questions and we'll generate a tailored plan checklist + summary you can hand to your team or send to our experts.</p>
          </div>

          <form onSubmit={handleGenerate} className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="brand">Brand / Client *</Label><Input id="brand" required value={intake.brand} onChange={(e) => setIntake({ ...intake, brand: e.target.value })} placeholder="e.g. Acme Mobility" /></div>
              <div><Label htmlFor="contactName">Your name *</Label><Input id="contactName" required value={intake.contactName} onChange={(e) => setIntake({ ...intake, contactName: e.target.value })} /></div>
              <div><Label htmlFor="contactEmail">Email *</Label><Input id="contactEmail" type="email" required value={intake.contactEmail} onChange={(e) => setIntake({ ...intake, contactEmail: e.target.value })} /></div>
              <div><Label htmlFor="contactPhone">Phone</Label><Input id="contactPhone" value={intake.contactPhone} onChange={(e) => setIntake({ ...intake, contactPhone: e.target.value })} /></div>
            </div>

            <div>
              <Label className="mb-2 block">Target cities *</Label>
              <div className="flex flex-wrap gap-2">
                {cityOptions.map((c) => (
                  <button type="button" key={c} onClick={() => toggleArr("cities", c)} className={`px-3 py-1.5 text-sm rounded-full border transition ${intake.cities.includes(c) ? "bg-[#1E40AF] text-white border-[#1E40AF]" : "bg-background text-foreground border-border hover:bg-muted"}`}>{c}</button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Media types *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {mediaOptions.map((m) => (
                  <label key={m} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-background cursor-pointer hover:bg-muted/50">
                    <Checkbox checked={intake.medias.includes(m)} onCheckedChange={() => toggleArr("medias", m)} />
                    <span className="text-sm text-foreground">{m}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label htmlFor="startDate">Start date</Label><Input id="startDate" type="date" value={intake.startDate} onChange={(e) => setIntake({ ...intake, startDate: e.target.value })} /></div>
              <div><Label htmlFor="endDate">End date</Label><Input id="endDate" type="date" value={intake.endDate} onChange={(e) => setIntake({ ...intake, endDate: e.target.value })} /></div>
              <div><Label htmlFor="budget">Budget (₹)</Label><Input id="budget" type="number" value={intake.budget} onChange={(e) => setIntake({ ...intake, budget: e.target.value })} placeholder="e.g. 500000" /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="objective">Primary objective</Label>
                <Select value={intake.objective} onValueChange={(v) => setIntake({ ...intake, objective: v })}>
                  <SelectTrigger id="objective"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="awareness">Brand awareness</SelectItem>
                    <SelectItem value="launch">Product / store launch</SelectItem>
                    <SelectItem value="event">Event / festival push</SelectItem>
                    <SelectItem value="performance">Performance / footfall</SelectItem>
                    <SelectItem value="political">Political / public outreach</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="creativeReady">Creative ready?</Label>
                <Select value={intake.creativeReady} onValueChange={(v) => setIntake({ ...intake, creativeReady: v })}>
                  <SelectTrigger id="creativeReady"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes — print-ready files in hand</SelectItem>
                    <SelectItem value="design_only">Design ready, needs print prep</SelectItem>
                    <SelectItem value="no">No — we need help with creative & printing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div><Label htmlFor="audience">Target audience / catchments</Label><Input id="audience" value={intake.audience} onChange={(e) => setIntake({ ...intake, audience: e.target.value })} placeholder="e.g. Tech corridor, IT employees, 25–40 yrs" /></div>
            <div><Label htmlFor="specialReq">Special requirements</Label><Textarea id="specialReq" rows={3} value={intake.specialReq} onChange={(e) => setIntake({ ...intake, specialReq: e.target.value })} placeholder="Mounting deadlines, lighting needs, compliance constraints, exclusivity, etc." /></div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" size="lg" className="rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
                <ClipboardList className="w-4 h-4 mr-2" /> Generate plan checklist
              </Button>
              <Button type="button" size="lg" variant="outline" onClick={escalate} className="rounded-xl font-semibold">
                <MessageSquareWarning className="w-4 h-4 mr-2" /> Talk to an expert
              </Button>
            </div>
          </form>

          {/* Output */}
          {generated && (
            <motion.div id="plan-output" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-2xl p-6 lg:col-span-1">
                <div className="flex items-center gap-2 mb-4"><Target className="w-5 h-5 text-[#10B981]" /><h3 className="font-semibold text-foreground">Plan summary</h3></div>
                <dl className="text-sm space-y-2">
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Brand</dt><dd className="font-medium text-right">{generated.brand || "—"}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Cities</dt><dd className="font-medium text-right">{generated.cities.length || 0}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Media types</dt><dd className="font-medium text-right">{generated.medias.length || 0}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Window</dt><dd className="font-medium text-right">{generated.startDate || "?"} → {generated.endDate || "?"}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Budget</dt><dd className="font-medium text-right">{generated.budget ? `₹${Number(generated.budget).toLocaleString("en-IN")}` : "—"}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Objective</dt><dd className="font-medium text-right capitalize">{generated.objective}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Creative</dt><dd className="font-medium text-right">{generated.creativeReady === "yes" ? "Ready" : generated.creativeReady === "design_only" ? "Print prep" : "Needs help"}</dd></div>
                </dl>
                <Button onClick={escalate} className="w-full mt-5 rounded-xl text-white" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
                  Send to an expert
                </Button>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 lg:col-span-2">
                <div className="flex items-center gap-2 mb-4"><ClipboardList className="w-5 h-5 text-[#1E40AF]" /><h3 className="font-semibold text-foreground">Tailored checklist ({checklist.length} items)</h3></div>
                <ol className="space-y-3">
                  {checklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background">
                      <span className="w-7 h-7 shrink-0 rounded-full bg-[#1E40AF]/10 text-[#1E40AF] text-xs font-semibold flex items-center justify-center">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Owner: {item.owner} · Due: {item.due}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Built for OOH realities</h2>
            <p className="text-muted-foreground text-lg">The details that separate a polished planner from a spreadsheet.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((c, i) => (
              <motion.div key={c.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="bg-card border border-border rounded-2xl p-6">
                <div className="w-11 h-11 rounded-lg bg-[#1E40AF]/10 flex items-center justify-center mb-4"><c.icon className="w-5 h-5 text-[#1E40AF]" /></div>
                <h3 className="text-base font-semibold text-foreground mb-2">{c.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">Frequently asked</h2>
          <p className="text-center text-muted-foreground mb-8">Still unsure? Talk to an expert and we'll walk through your scenario.</p>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`f${i}`} className="bg-card border border-border rounded-xl px-5 border-b">
                <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="text-center mt-8">
            <Button onClick={escalate} size="lg" variant="outline" className="rounded-xl font-semibold">
              <MessageSquareWarning className="w-4 h-4 mr-2" /> Talk to an expert
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Ship your next plan in minutes</h2>
          <p className="text-muted-foreground mb-8">Stop juggling spreadsheets. Plan, price and convert in one place.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => navigate("/auth")} className="rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
              Get Started <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/sales")} className="rounded-xl font-semibold">Talk to Sales</Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CampaignPlanning;
