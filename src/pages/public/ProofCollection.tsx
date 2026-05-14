import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Smartphone, MapPinned, Camera, FileImage, ShieldCheck, Image as ImageIcon,
  Newspaper, Eye, ArrowRight, CheckCircle2, Clock, QrCode,
  Upload, X, Loader2, MessageSquareWarning, AlertTriangle, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

type Status = "pending" | "uploading" | "uploaded" | "failed";
type Slot = {
  id: string;
  label: string;
  description: string;
  icon: typeof Newspaper;
  required: boolean;
  status: Status;
  progress: number;
  fileName?: string;
  fileSize?: number;
  previewUrl?: string;
  error?: string;
};

const initialSlots: Omit<Slot, "status" | "progress">[] = [
  { id: "newspaper", label: "Newspaper Tag", description: "Today's newspaper held at the site to prove install date.", icon: Newspaper, required: true },
  { id: "geotag", label: "Geo-tagged Hero", description: "Wide shot with embedded GPS + timestamp.", icon: MapPinned, required: true },
  { id: "traffic1", label: "Traffic View 1", description: "Long-distance approach shot showing the creative.", icon: Eye, required: true },
  { id: "traffic2", label: "Traffic View 2", description: "Opposite-direction or alternate angle.", icon: Eye, required: true },
  { id: "creative", label: "Close-up / Creative", description: "Sharp close-up — colour, alignment, lamination.", icon: ImageIcon, required: true },
];

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
  { q: "What happens if a photo's GPS is outside the asset's location?", a: "The upload is rejected with a clear message. The mounter must re-capture from the actual site — this prevents fake or recycled proofs and keeps your client trust intact.", link: { label: "Try a geo-tagged upload", target: "slot-geotag" } },
  { q: "Can clients see proofs without logging in?", a: "Yes. Each campaign has a secure proof gallery that you can share via a link with optional expiry. Clients view photos, download the PPT, and never see other clients' work.", link: { label: "Enter the campaign code", target: "cc" } },
  { q: "Are old/recycled photos blocked?", a: "EXIF timestamp is enforced. If a photo is older than your configured threshold (default: 24 hours from install), it is rejected. Fresh capture is mandatory.", link: { label: "Capture today's newspaper proof", target: "slot-newspaper" } },
  { q: "Can I customise which photo types are required?", a: "The 5-photo standard is the default for accountability, but admins can adjust the required tags per campaign or per client requirement (e.g. extra night-illumination shot, or skip newspaper for non-Indian markets).", link: { label: "See the 5 required slots", target: "upload" } },
  { q: "What file types and sizes are accepted?", a: "JPEG and PNG, up to 15 MB per file. Photos over 4 MP are auto-resized server-side; original EXIF is preserved for the audit trail.", link: { label: "Upload a sample photo", target: "slot-creative" } },
  { q: "Where are uploaded proofs stored?", a: "In secure cloud storage scoped per company, accessed only via short-lived signed URLs (60–300 s). Public links never expose raw storage paths.", link: { label: "Add install notes for audit", target: "nt" } },
];

const focusProof = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    setTimeout(() => el.focus({ preventScroll: true }), 350);
  } else {
    el.classList.add("ring-2", "ring-[#1E40AF]/50");
    setTimeout(() => el.classList.remove("ring-2", "ring-[#1E40AF]/50"), 1800);
  }
};

const MAX_BYTES = 15 * 1024 * 1024;
const REF_PREFIX = "PRF";

const ProofCollection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState({ campaignCode: "", assetCode: "", mounter: "", notes: "" });
  const [slots, setSlots] = useState<Slot[]>(() => initialSlots.map((s) => ({ ...s, status: "pending" as Status, progress: 0 })));
  const [submitted, setSubmitted] = useState<{ ref: string; at: string } | null>(null);
  const intervalRefs = useRef<Record<string, ReturnType<typeof setInterval> | undefined>>({});

  useEffect(() => () => {
    Object.values(intervalRefs.current).forEach((t) => t && clearInterval(t));
    slots.forEach((s) => s.previewUrl && URL.revokeObjectURL(s.previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadedCount = slots.filter((s) => s.status === "uploaded").length;
  const requiredCount = slots.filter((s) => s.required).length;
  const overallProgress = useMemo(() => Math.round(slots.reduce((acc, s) => acc + (s.status === "uploaded" ? 100 : s.progress), 0) / slots.length), [slots]);
  const allDone = slots.filter((s) => s.required).every((s) => s.status === "uploaded");

  const updateSlot = (id: string, patch: Partial<Slot>) => setSlots((arr) => arr.map((s) => s.id === id ? { ...s, ...patch } : s));

  const handleFile = (id: string, file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      updateSlot(id, { status: "failed", error: "Only image files (JPEG/PNG) are accepted." });
      toast({ title: "Invalid file", description: "Please choose a JPEG or PNG photo.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_BYTES) {
      updateSlot(id, { status: "failed", error: "File exceeds the 15 MB limit." });
      toast({ title: "File too large", description: "Maximum 15 MB per photo.", variant: "destructive" });
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    updateSlot(id, { status: "uploading", progress: 0, fileName: file.name, fileSize: file.size, previewUrl, error: undefined });

    if (intervalRefs.current[id]) clearInterval(intervalRefs.current[id]!);
    intervalRefs.current[id] = setInterval(() => {
      setSlots((arr) => arr.map((s) => {
        if (s.id !== id) return s;
        const next = Math.min(100, s.progress + 10 + Math.random() * 15);
        if (next >= 100) {
          if (intervalRefs.current[id]) clearInterval(intervalRefs.current[id]!);
          // 8% simulated validation failure to demo the failed state
          const fail = Math.random() < 0.08;
          return fail
            ? { ...s, status: "failed", progress: 100, error: "GPS or EXIF validation failed — re-capture from the site." }
            : { ...s, status: "uploaded", progress: 100 };
        }
        return { ...s, progress: next };
      }));
    }, 220);
  };

  const removeFile = (id: string) => {
    if (intervalRefs.current[id]) clearInterval(intervalRefs.current[id]!);
    setSlots((arr) => arr.map((s) => {
      if (s.id !== id) return s;
      if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
      return { ...s, status: "pending", progress: 0, fileName: undefined, fileSize: undefined, previewUrl: undefined, error: undefined };
    }));
  };

  const submitAll = () => {
    if (!campaign.campaignCode || !campaign.assetCode) {
      toast({ title: "Add campaign & asset codes", description: "Both are required so the proofs route to the right campaign.", variant: "destructive" });
      return;
    }
    if (!allDone) {
      toast({ title: "Some photos still missing", description: `Upload all ${requiredCount} required proofs before submitting.`, variant: "destructive" });
      return;
    }
    const ref = `${REF_PREFIX}-${Date.now().toString(36).toUpperCase()}`;
    setSubmitted({ ref, at: new Date().toISOString() });
    toast({ title: "Proof submitted ✓", description: `Reference ${ref} — our ops team will verify within 24 hours.` });
  };

  const reset = () => {
    Object.values(intervalRefs.current).forEach((t) => t && clearInterval(t));
    intervalRefs.current = {};
    slots.forEach((s) => s.previewUrl && URL.revokeObjectURL(s.previewUrl));
    setSlots(initialSlots.map((s) => ({ ...s, status: "pending" as Status, progress: 0 })));
    setSubmitted(null);
  };

  const escalate = () => {
    const photoSummary = slots.map((s) => `- ${s.label}: ${s.status}${s.fileName ? ` (${s.fileName})` : ""}${s.error ? ` — ${s.error}` : ""}`).join("\n");
    const params = new URLSearchParams({
      topic: "Proof collection",
      category: "proof_collection",
      subject: `Proof collection help — ${campaign.campaignCode || "campaign"} / ${campaign.assetCode || "asset"}`,
      message: `Campaign: ${campaign.campaignCode}\nAsset: ${campaign.assetCode}\nMounter: ${campaign.mounter}\nNotes: ${campaign.notes}\n\nProof status:\n${photoSummary}`,
    });
    navigate(`/support?${params.toString()}#new-ticket`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628] via-[#1E40AF] to-[#0A1628]" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-xs md:text-sm font-semibold tracking-widest uppercase text-[#F4C542] mb-4">Verifiable proof, every time</span>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">Proof Collection</motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Replace WhatsApp folders and recycled JPEGs with structured, GPS-verified proof of execution. Mounters capture the right photos from the field. Clients receive a branded deck without you lifting a finger.
          </motion.p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" })} className="rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
              <Upload className="w-4 h-4 mr-2" /> Try the upload flow
            </Button>
            <Button size="lg" variant="outline" onClick={escalate} className="rounded-xl font-semibold border-white/30 text-white bg-white/10 hover:bg-white/20">Talk to an expert</Button>
          </div>
        </div>
      </section>

      {/* Upload Workflow */}
      <section id="upload" className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-3"><Camera className="w-3.5 h-3.5 mr-1.5" /> Live demo</Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Upload, validate and submit your proofs</h2>
            <p className="text-muted-foreground text-lg">Pick the 5 mandatory photos, watch them upload with progress + validation, then submit for ops verification.</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
            {/* Campaign info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div><Label htmlFor="cc">Campaign code *</Label><Input id="cc" placeholder="e.g. CAM/2025-26/0042" value={campaign.campaignCode} onChange={(e) => setCampaign({ ...campaign, campaignCode: e.target.value })} /></div>
              <div><Label htmlFor="ac">Asset code *</Label><Input id="ac" placeholder="e.g. HYD-BSQ-0001" value={campaign.assetCode} onChange={(e) => setCampaign({ ...campaign, assetCode: e.target.value })} /></div>
              <div><Label htmlFor="mn">Mounter name</Label><Input id="mn" value={campaign.mounter} onChange={(e) => setCampaign({ ...campaign, mounter: e.target.value })} /></div>
              <div><Label htmlFor="nt">Notes</Label><Input id="nt" placeholder="Optional — install observations" value={campaign.notes} onChange={(e) => setCampaign({ ...campaign, notes: e.target.value })} /></div>
            </div>

            {/* Overall progress */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <p className="text-sm font-semibold text-foreground">{uploadedCount} of {requiredCount} verified · overall {overallProgress}%</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={reset}><RefreshCw className="w-4 h-4 mr-1.5" /> Reset</Button>
              </div>
            </div>
            <Progress value={overallProgress} className="h-2 mb-6" />

            {/* Slots */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {slots.map((s) => (
                <div key={s.id} id={`slot-${s.id}`} className={`scroll-mt-24 relative rounded-xl border p-4 ${s.status === "uploaded" ? "border-[#10B981]/50 bg-[#10B981]/5" : s.status === "failed" ? "border-destructive/40 bg-destructive/5" : "border-border bg-background"}`}>
                  <div className="flex items-start gap-2 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-[#1E40AF]/10 flex items-center justify-center"><s.icon className="w-4 h-4 text-[#1E40AF]" /></div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground">{s.label}</h4>
                      <p className="text-[11px] text-muted-foreground leading-snug">{s.description}</p>
                    </div>
                    {s.status === "uploaded" && <CheckCircle2 className="w-4 h-4 text-[#10B981]" />}
                    {s.status === "failed" && <AlertTriangle className="w-4 h-4 text-destructive" />}
                  </div>

                  {/* Preview / Empty */}
                  <div className="aspect-video rounded-lg overflow-hidden bg-muted/40 border border-border mb-3 relative">
                    {s.previewUrl ? (
                      <>
                        <img src={s.previewUrl} alt={s.label} className="w-full h-full object-cover" />
                        {s.status === "uploading" && (
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                            <Loader2 className="w-5 h-5 animate-spin mb-2" />
                            <span className="text-xs">{Math.round(s.progress)}%</span>
                          </div>
                        )}
                        <button type="button" onClick={() => removeFile(s.id)} className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"><X className="w-3.5 h-3.5" /></button>
                      </>
                    ) : (
                      <label className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted/60">
                        <Upload className="w-5 h-5 mb-1" />
                        <span className="text-[11px]">Tap to upload</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(s.id, e.target.files?.[0])} />
                      </label>
                    )}
                  </div>

                  {/* Status row */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`font-medium uppercase tracking-wider ${s.status === "uploaded" ? "text-[#10B981]" : s.status === "failed" ? "text-destructive" : s.status === "uploading" ? "text-[#1E40AF]" : "text-muted-foreground"}`}>{s.status}</span>
                    {s.fileSize && <span className="text-muted-foreground">{(s.fileSize / 1024).toFixed(0)} KB</span>}
                  </div>
                  {s.status === "uploading" && <Progress value={s.progress} className="h-1 mt-2" />}
                  {s.error && <p className="text-[11px] text-destructive mt-2">{s.error}</p>}
                </div>
              ))}
            </div>

            {/* Submit */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                {submitted ? (
                  <div className="flex items-center gap-2 text-[#10B981] font-semibold"><CheckCircle2 className="w-4 h-4" /> Submitted · ref <span className="font-mono">{submitted.ref}</span></div>
                ) : (
                  <span className="text-muted-foreground">Status: {allDone ? "Ready to submit" : "Awaiting required uploads"}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={escalate}><MessageSquareWarning className="w-4 h-4 mr-2" /> Talk to an expert</Button>
                <Button onClick={submitAll} disabled={!allDone || !!submitted} className="text-white" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
                  Submit for verification
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground mt-4">This is a public demo — files stay in your browser and are not uploaded to any server. In the live app, photos are streamed to secure storage with EXIF/GPS validation against the asset's registered coordinates.</p>
          </div>
        </div>
      </section>

      {/* The 5 photos */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">The 5-photo standard</h2>
            <p className="text-muted-foreground text-lg">A consistent set of evidence for every asset, on every campaign.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {photoTypes.map((p, i) => (
              <motion.div key={p.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="bg-card border border-border rounded-2xl p-6">
                <div className="w-11 h-11 rounded-lg bg-[#1E40AF]/10 flex items-center justify-center mb-4"><p.icon className="w-5 h-5 text-[#1E40AF]" /></div>
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
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">How proof collection works</h2>
            <p className="text-muted-foreground text-lg">From mounter assignment to client-ready deck.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflow.map((w, i) => (
              <motion.div key={w.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
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
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Built for accountability</h2>
            <p className="text-muted-foreground text-lg">The features that make proofs hold up under client scrutiny.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="bg-card border border-border rounded-2xl p-6">
                <div className="w-11 h-11 rounded-lg bg-[#1E40AF]/10 flex items-center justify-center mb-4"><f.icon className="w-5 h-5 text-[#1E40AF]" /></div>
                <h3 className="text-base font-semibold text-foreground mb-2">{f.title}</h3>
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
          <p className="text-center text-muted-foreground mb-8">Need to discuss your specific compliance or client requirements? Talk to an expert.</p>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`f${i}`} className="bg-card border border-border rounded-xl px-5 border-b">
                <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  <p>{f.a}</p>
                  {f.link && (
                    <button type="button" onClick={() => focusProof(f.link!.target)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1E40AF] hover:underline">
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
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Make every campaign defensible</h2>
          <p className="text-muted-foreground mb-8">Structured proof collection your clients will trust and your team will actually use.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => navigate("/auth")} className="rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>Get Started <ArrowRight className="ml-2 w-4 h-4" /></Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/support")} className="rounded-xl font-semibold">Talk to Support</Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProofCollection;
