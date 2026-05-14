import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Database, CalendarCheck, History, QrCode, MapPin, Camera,
  Zap, ShieldCheck, Tag, FileSpreadsheet, ArrowRight, CheckCircle2,
  Upload, ListChecks, MessageSquareWarning, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const capabilities = [
  { icon: Database, title: "Centralized Inventory", description: "One source of truth for billboards, bus shelters, unipoles, gantries, kiosks and DOOH screens — with photos, GPS, dimensions, illumination, traffic direction, municipal IDs and rate cards.", bullets: ["Smart asset codes (e.g. HYD-BSQ-0001)", "Owned + partner inventory in one view", "Soft-delete with full audit trail"] },
  { icon: CalendarCheck, title: "Live Availability", description: "Real-time availability across every plan, hold and campaign. The system surfaces the exact next-available date so sales never quotes inventory that is already booked.", bullets: ["Vacant-on-date filter", "Automatic conflict detection", "Holds for tentative business"] },
  { icon: History, title: "Booking History & Performance", description: "Every campaign, client and rate is preserved on the asset. Use the history to defend pricing, identify under-utilised inventory, and renew the right clients at the right moment.", bullets: ["Per-asset revenue & occupancy", "Client-wise rate history", "Renewal opportunity flags"] },
  { icon: QrCode, title: "QR-based Field Verification", description: "Print a QR sticker on each asset. Field teams scan to open the asset record, capture proofs, log maintenance and confirm GPS — no manual asset lookup.", bullets: ["Auto-generate per-asset QR", "Open mobile proof flow on scan", "Mounter accountability"] },
];

const fields = [
  { icon: MapPin, label: "Location & GPS", desc: "City, area, latitude/longitude, traffic direction, landmarks." },
  { icon: Tag, label: "Specifications", desc: "Media type, dimensions, total sqft, illumination, side count." },
  { icon: Camera, label: "Site Photos", desc: "Multiple angle photos with EXIF + watermarking on shareables." },
  { icon: Zap, label: "Power & Maintenance", desc: "TGSPDCL consumer no., monthly bills, service tickets." },
  { icon: ShieldCheck, label: "Municipal Compliance", desc: "Authority, permit ID, validity dates and renewal alerts." },
  { icon: FileSpreadsheet, label: "Pricing & Charges", desc: "Card rate, base rate, printing and mounting amounts." },
];

const faqs = [
  { q: "Can I import my existing inventory from Excel?", a: "Yes. Use the bulk import template to upload hundreds of assets in one go. The system validates duplicates, GPS, and rate fields, and shows a row-by-row error report before committing — so you fix issues once, not asset by asset.", link: { label: "Start with identity & code", target: "step-identity" } },
  { q: "How are duplicate assets prevented?", a: "Duplicate detection uses identity fields (city, area, dimension, GPS, municipal ID) rather than name alone, so two records of the same hoarding cannot accidentally co-exist. Suspected duplicates are flagged for merge with a side-by-side comparison.", link: { label: "Pin GPS for this asset", target: "step-location" } },
  { q: "Can I share inventory with agency partners?", a: "Mark assets as public to expose them in the marketplace. Agencies can see availability and rates, request bookings, and you stay in control of the final pricing and approval per request.", link: { label: "Toggle marketplace visibility", target: "step-publish" } },
  { q: "What happens when an asset is dismantled or paused?", a: "You can deactivate an asset operationally without deleting history. Past bookings, invoices and proofs remain intact and the asset stops appearing in availability searches and rate cards immediately.", link: { label: "Manage active status", target: "step-publish" } },
  { q: "How are municipal permits and renewals tracked?", a: "Each asset stores authority, permit ID and validity dates. The system raises renewal alerts 30/15/7 days in advance so you never lose inventory to an expired permit.", link: { label: "Upload permit document", target: "step-permit" } },
  { q: "Can I run the same checklist across all my new assets?", a: "Yes — the onboarding checklist below covers every required field, photo and document. You can use it as a SOP with your field team or hand it to our experts to do the heavy lifting.", link: { label: "Open the checklist", target: "checklist" } },
];

const focusStep = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("ring-2", "ring-[#1E40AF]/50");
  setTimeout(() => el.classList.remove("ring-2", "ring-[#1E40AF]/50"), 1800);
};

type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  owner: string;
  due: string;
  uploads?: string[];
  done: boolean;
  files: { name: string; size: number }[];
};

const defaultItems: Omit<ChecklistItem, "done" | "files">[] = [
  { id: "identity", title: "Identity & smart code", description: "Confirm media type, city, area code, generate unique asset code (e.g. HYD-BSQ-0001).", owner: "Inventory Lead", due: "Day 1" },
  { id: "location", title: "Location & GPS pin", description: "Capture latitude/longitude on-site, set traffic direction and nearest landmark.", owner: "Field Surveyor", due: "Day 1–2" },
  { id: "specs", title: "Physical specifications", description: "Dimensions (W × H), total sqft, illumination type, side count, structure condition.", owner: "Field Surveyor", due: "Day 1–2" },
  { id: "photos", title: "Site photos (5 angles)", description: "Wide, close-up, traffic-approach (left + right), and structural — geotagged, no people in frame.", owner: "Field Surveyor", due: "Day 2", uploads: ["Wide shot", "Close-up", "Traffic approach (L)", "Traffic approach (R)", "Structural"] },
  { id: "permit", title: "Municipal permit & validity", description: "Upload permit/PoP from the relevant authority (GHMC, TGIIC, NMC, BBMP, etc.) with start & expiry dates.", owner: "Compliance", due: "Day 2–3", uploads: ["Permit PDF/image"] },
  { id: "power", title: "Power / utility setup", description: "Record electricity service number, sanctioned load, and the monthly bill responsibility.", owner: "Operations", due: "Day 3", uploads: ["Latest power bill"] },
  { id: "rates", title: "Rate card & charges", description: "Set card rate, internal base rate, printing charge, mounting charge — and unlock the asset for plans.", owner: "Finance Lead", due: "Day 3" },
  { id: "qr", title: "Print & mount QR sticker", description: "Generate the per-asset QR, print it, and stick it on the structure for field scanning.", owner: "Operations", due: "Day 4" },
  { id: "publish", title: "Publish & marketplace toggle", description: "Mark the asset Active, decide if it should be public on the marketplace, and assign owner.", owner: "Inventory Lead", due: "Day 4" },
];

const STORAGE_KEY = "goads_asset_checklist_v1";

const AssetManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) return JSON.parse(raw) as ChecklistItem[];
    } catch (_) {}
    return defaultItems.map((d) => ({ ...d, done: false, files: [] }));
  });

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (_) {}
  }, [items]);

  const completed = items.filter((i) => i.done).length;
  const progress = useMemo(() => Math.round((completed / items.length) * 100), [completed, items.length]);

  const toggleDone = (id: string) => setItems((arr) => arr.map((i) => i.id === id ? { ...i, done: !i.done } : i));

  const addFiles = (id: string, files: FileList | null) => {
    if (!files || !files.length) return;
    const accepted: { name: string; size: number }[] = [];
    Array.from(files).forEach((f) => {
      if (f.size > 10 * 1024 * 1024) {
        toast({ title: `${f.name} is over 10 MB`, description: "Compress and try again.", variant: "destructive" });
        return;
      }
      accepted.push({ name: f.name, size: f.size });
    });
    if (!accepted.length) return;
    setItems((arr) => arr.map((i) => i.id === id ? { ...i, files: [...i.files, ...accepted] } : i));
    toast({ title: `Added ${accepted.length} file(s)`, description: "Files are tracked locally — submit your checklist to share with our experts." });
  };

  const reset = () => {
    setItems(defaultItems.map((d) => ({ ...d, done: false, files: [] })));
    toast({ title: "Checklist reset" });
  };

  const escalate = () => {
    const summary = items.map((i, idx) => `${idx + 1}. ${i.done ? "✓" : "•"} ${i.title} — owner ${i.owner}, due ${i.due}${i.files.length ? ` (${i.files.length} file(s) ready)` : ""}`).join("\n");
    const params = new URLSearchParams({
      topic: "Asset onboarding",
      category: "asset_management",
      subject: `Asset onboarding checklist — ${completed}/${items.length} complete`,
      message: `Please review my asset onboarding checklist below and help finish the remaining items.\n\n${summary}`,
    });
    navigate(`/support?${params.toString()}#new-ticket`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628] via-[#1E40AF] to-[#0A1628]" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-xs md:text-sm font-semibold tracking-widest uppercase text-[#F4C542] mb-4">Inventory you can trust</span>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">Asset Management</motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Manage your entire OOH inventory in one structured database — with live availability, verified site photos, municipal compliance, and clean rate cards your team will actually use.
          </motion.p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => document.getElementById("checklist")?.scrollIntoView({ behavior: "smooth" })} className="rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
              <ListChecks className="w-4 h-4 mr-2" /> Start onboarding checklist
            </Button>
            <Button size="lg" variant="outline" onClick={escalate} className="rounded-xl font-semibold border-white/30 text-white bg-white/10 hover:bg-white/20">
              Talk to an expert
            </Button>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Core capabilities</h2>
            <p className="text-muted-foreground text-lg">Everything you need to run inventory like a media owner, not a spreadsheet.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {capabilities.map((c, i) => (
              <motion.div key={c.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bg-card border border-border rounded-2xl p-8 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 rounded-xl bg-[#1E40AF]/10 flex items-center justify-center mb-5"><c.icon className="w-7 h-7 text-[#1E40AF]" /></div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{c.title}</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">{c.description}</p>
                <ul className="space-y-2">
                  {c.bullets.map((b) => (<li key={b} className="flex items-start gap-2 text-sm text-muted-foreground"><CheckCircle2 className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0" /><span>{b}</span></li>))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Checklist */}
      <section id="checklist" className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-3"><ListChecks className="w-3.5 h-3.5 mr-1.5" /> Step-by-step onboarding</Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Onboard a new asset, end-to-end</h2>
            <p className="text-muted-foreground text-lg">A field-tested checklist with owners, due-day guidance and the exact uploads we need. Progress saves automatically in this browser.</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <p className="text-sm font-semibold text-foreground">Progress: {completed} of {items.length} complete</p>
                <p className="text-xs text-muted-foreground">Tick items as your team finishes them. Files stay local until you submit.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={reset}><RefreshCw className="w-4 h-4 mr-1.5" /> Reset</Button>
                <Button size="sm" onClick={escalate} className="text-white" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
                  <MessageSquareWarning className="w-4 h-4 mr-1.5" /> Talk to an expert
                </Button>
              </div>
            </div>

            <Progress value={progress} className="h-2 mb-6" />

            <ol className="space-y-3">
              {items.map((item, i) => (
                <li key={item.id} id={`step-${item.id}`} className={`scroll-mt-24 rounded-xl border p-4 transition ${item.done ? "bg-[#10B981]/5 border-[#10B981]/40" : "bg-background border-border"}`}>
                  <div className="flex items-start gap-3">
                    <Checkbox checked={item.done} onCheckedChange={() => toggleDone(item.id)} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Step {String(i + 1).padStart(2, "0")}</span>
                        <h4 className={`text-base font-semibold ${item.done ? "text-foreground line-through opacity-70" : "text-foreground"}`}>{item.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary" className="text-[11px]">Owner: {item.owner}</Badge>
                        <Badge variant="outline" className="text-[11px]">Due: {item.due}</Badge>
                        {item.uploads && (<Badge className="text-[11px] bg-[#1E40AF]/10 text-[#1E40AF] border-[#1E40AF]/20">Uploads: {item.uploads.join(", ")}</Badge>)}
                      </div>

                      {item.uploads && (
                        <div className="mt-3">
                          <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted cursor-pointer">
                            <Upload className="w-3.5 h-3.5" /> Attach file(s)
                            <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => addFiles(item.id, e.target.files)} />
                          </label>
                          {item.files.length > 0 && (
                            <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                              {item.files.map((f, fi) => (<li key={fi} className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> {f.name} <span className="opacity-60">({(f.size / 1024).toFixed(0)} KB)</span></li>))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Field Coverage */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Every detail that matters</h2>
            <p className="text-muted-foreground text-lg">A 360° asset record so finance, ops and sales speak the same language.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {fields.map((f, i) => (
              <motion.div key={f.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="bg-card border border-border rounded-2xl p-6">
                <div className="w-11 h-11 rounded-lg bg-[#1E40AF]/10 flex items-center justify-center mb-4"><f.icon className="w-5 h-5 text-[#1E40AF]" /></div>
                <h3 className="text-base font-semibold text-foreground mb-2">{f.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">Frequently asked</h2>
          <p className="text-center text-muted-foreground mb-8">Don't see what you need? Talk to an expert and we'll respond within one business day.</p>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`f${i}`} className="bg-card border border-border rounded-xl px-5 border-b">
                <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  <p>{f.a}</p>
                  {f.link && (
                    <button type="button" onClick={() => focusStep(f.link!.target)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1E40AF] hover:underline">
                      {f.link.label} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </AccordionContent>
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
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Take control of your inventory</h2>
          <p className="text-muted-foreground mb-8">Stop chasing the latest Excel sheet. Run inventory the way modern media owners do.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => navigate("/auth")} className="rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>Get Started <ArrowRight className="ml-2 w-4 h-4" /></Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/sales")} className="rounded-xl font-semibold">Book a Demo</Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AssetManagement;
