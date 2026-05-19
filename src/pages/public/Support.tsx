import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Rocket, BookOpen, Wrench, Headphones, CheckCircle2, Clock,
  Mail, Phone, MessageCircle, Loader2, ChevronRight,
  Database, Image, FileText, BarChart3, Users, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSocialLinks } from "@/hooks/useSocialLinks";

const pillars = [
  {
    icon: Rocket,
    title: "Onboarding Assistance",
    tagline: "From sign-up to your first live campaign in under a week.",
    sla: "Kick-off within 24 hours",
    points: [
      "Guided workspace setup — company profile, GST/PAN, branding, signature & bank details.",
      "Bulk import of existing inventory: media assets, clients, leads and historical campaigns via Excel templates.",
      "User & role provisioning across Admin, Sales, Operations, Finance, Mounting and Client Portal users.",
      "Walkthrough of the Lead → Plan → Campaign → Operations → Invoice → Proof lifecycle with your real data.",
      "First plan, first quotation PDF/PPT export, and first invoice generated together with our team.",
    ],
  },
  {
    icon: BookOpen,
    title: "Product Guidance",
    tagline: "Deep training on every module so your team works at full speed.",
    sla: "Live training sessions on demand",
    points: [
      "Module masterclasses: Media Assets, Plan Builder, Campaign Operations, Finance & GST, Reports.",
      "Best-practice playbooks for rate cards, mounting workflows, proof photo standards (newspaper, geotag, traffic).",
      "GST, TDS, payment-terms, credit notes and fiscal-year (Apr–Mar) configuration assistance.",
      "AI Assistant query library — vacant media, pending invoices, client summaries, occupancy reports.",
      "Client portal & magic-link setup so brands can self-serve proofs, invoices and payments.",
    ],
  },
  {
    icon: Wrench,
    title: "Issue Resolution",
    tagline: "Fast, prioritised fixes — with clear ownership and timelines.",
    sla: "P1 in 1 hour · P2 in 4 hours · P3 in 1 business day",
    points: [
      "Priority-based triage: Critical (system down / billing blocked), High, Normal, Low.",
      "Direct escalation channel for finance-impacting issues — invoices, GST, payments, RO/PO.",
      "Root-cause analysis with audit-log evidence for any data discrepancy.",
      "Hot-fixes for plan/campaign conversion, asset bookings, proof uploads and PDF/Excel exports.",
      "Status updates at every step until the ticket is resolved and verified by you.",
    ],
  },
  {
    icon: Headphones,
    title: "Ongoing Assistance",
    tagline: "A long-term partner as your OOH operation scales.",
    sla: "Dedicated CSM for Pro & Enterprise",
    points: [
      "Quarterly business reviews — utilisation, revenue, collections, occupancy and growth opportunities.",
      "New feature rollouts, beta access and tailored configurations as your workflow evolves.",
      "Data hygiene audits: duplicate assets, stale leads, unbilled campaigns, overdue receivables.",
      "Migration support when you onboard new branches, GST registrations or acquired inventories.",
      "Direct WhatsApp & email line to your assigned success manager.",
    ],
  },
];

const capabilities = [
  { icon: Database, label: "Bulk data import & cleanup" },
  { icon: Image, label: "Proof photo & PPT generation" },
  { icon: FileText, label: "GST invoices, RO & credit notes" },
  { icon: BarChart3, label: "Custom reports & dashboards" },
  { icon: Users, label: "Role & permission setup" },
  { icon: ShieldCheck, label: "Audit-grade data security" },
];

const faqs = [
  {
    q: "How quickly can my team go live on Go-Ads 360°?",
    a: "Most teams are operational within 5–7 working days. Our onboarding team handles workspace setup, bulk import of your media assets and clients, user roles, and walks you through your first plan, campaign and invoice end-to-end.",
  },
  {
    q: "Can you migrate our existing Excel/PDF inventory and past campaigns?",
    a: "Yes. We provide standardised import templates for media assets, clients, leads, plans, campaigns and invoices. The team validates GST numbers, deduplicates assets and reconciles historical data before going live.",
  },
  {
    q: "What are your support response times?",
    a: "P1 (system down / billing blocked) — within 1 hour. P2 (workflow blocker) — within 4 hours. P3 (general issue) — within 1 business day. P4 (how-to / enhancement) — within 2 business days. Pro & Enterprise plans include extended-hour coverage.",
  },
  {
    q: "Do you help with GST, TDS, RO and invoice formatting for Indian compliance?",
    a: "Absolutely. We configure CGST/SGST/IGST per state, TDS rules, fiscal-year (April–March) numbering (INV/2025-26/####), DD/MM/YYYY formatting, INR ₹ presentation, GSTR-1 ready exports and Zoho-style PDF templates out of the box.",
  },
  {
    q: "Is my data secure and isolated from other companies?",
    a: "Yes. Every record is scoped by company_id and protected by row-level security. Sensitive media (proof photos, signed documents) is served through short-lived signed URLs. We never share data across tenants.",
  },
  {
    q: "Can clients access campaign proofs and invoices on their own?",
    a: "Yes. Each client can be issued a Client Portal magic-link login to view live campaigns, proof photos & PPTs, invoices, payments and statements — all read-only and scoped to their account.",
  },
];

const SupportPage = () => {
  const { toast } = useToast();
  const [params] = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    category: "general",
    priority: "normal",
    subject: "",
    message: "",
  });

  // Prefill from URL parameters (used by /campaign-planning, /asset-management, /proof-collection)
  useEffect(() => {
    const next = { ...form };
    let dirty = false;
    const fields: (keyof typeof form)[] = ["name", "email", "phone", "company", "category", "priority", "subject", "message"];
    fields.forEach((k) => {
      const v = params.get(k);
      if (v) { (next as any)[k] = v; dirty = true; }
    });
    const topic = params.get("topic");
    if (topic && !next.subject) {
      next.subject = `Talk to an expert — ${topic}`;
      dirty = true;
    }
    if (topic && !next.message) {
      next.message = `I'd like to speak with a Go-Ads expert about ${topic}.\n\nContext: `;
      dirty = true;
    }
    if (dirty) setForm(next);
    if (params.get("scroll") === "form" || params.get("topic") || params.get("subject")) {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("support_tickets").insert({
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      company: form.company || null,
      category: form.category,
      priority: form.priority,
      subject: form.subject,
      message: form.message,
      source: "public_support_page",
      metadata: { user_agent: navigator.userAgent, page: "/support", referrer: document.referrer },
    });
    setSubmitting(false);
    if (error) {
      toast({
        title: "Could not submit your request",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Request received ✓",
      description: "Our support team will get back to you within one business day.",
    });
    setForm({
      name: "", email: "", phone: "", company: "",
      category: "general", priority: "normal", subject: "", message: "",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628] via-[#1E40AF] to-[#0A1628]" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Support that keeps your OOH business moving
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            From day-one onboarding to long-term partnership — our team is built around the
            real workflows of media owners and agencies in India.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Badge className="bg-white/10 text-white border-white/20 px-4 py-2 text-sm"><Clock className="w-3.5 h-3.5 mr-1.5" /> P1 response in 1 hour</Badge>
            <Badge className="bg-white/10 text-white border-white/20 px-4 py-2 text-sm"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> 5–7 day go-live</Badge>
            <Badge className="bg-white/10 text-white border-white/20 px-4 py-2 text-sm"><ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Audit-grade data security</Badge>
          </motion.div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">How We Support You</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Four pillars of support — designed for the lead-to-proof lifecycle that runs your business.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {pillars.map((p, i) => (
              <motion.div key={p.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="bg-card border border-border rounded-2xl p-8 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-14 h-14 rounded-xl bg-[#10B981]/10 flex items-center justify-center"><p.icon className="w-7 h-7 text-[#10B981]" /></div>
                  <Badge variant="secondary" className="text-xs font-medium"><Clock className="w-3 h-3 mr-1" />{p.sla}</Badge>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{p.title}</h3>
                <p className="text-muted-foreground mb-5">{p.tagline}</p>
                <ul className="space-y-3">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex gap-3 text-sm text-foreground/80">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities strip */}
      <section className="py-12 bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">What our team can help you with</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {capabilities.map((c) => (
              <div key={c.label} className="flex flex-col items-center text-center gap-2 p-4 bg-card rounded-xl border border-border">
                <c.icon className="w-6 h-6 text-primary" />
                <span className="text-xs font-medium text-foreground/80 leading-snug">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ + Contact form */}
      <section id="new-ticket" className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Frequently asked questions</h2>
            <p className="text-muted-foreground mb-6">Quick answers to what most teams ask before going live.</p>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left text-base font-semibold">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="mt-8 space-y-3">
              <a href="mailto:support@go-ads.in" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted/50 transition">
                <Mail className="w-5 h-5 text-primary" />
                <div className="flex-1"><div className="text-sm font-semibold text-foreground">Email us</div><div className="text-xs text-muted-foreground">support@go-ads.in</div></div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </a>
              <a href="https://wa.me/919666444888?text=Hi%20Go-Ads%20support%20team" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted/50 transition">
                <MessageCircle className="w-5 h-5 text-[#10B981]" />
                <div className="flex-1"><div className="text-sm font-semibold text-foreground">WhatsApp</div><div className="text-xs text-muted-foreground">Chat with the support team</div></div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </a>
              <a href="tel:+919666444888" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted/50 transition">
                <Phone className="w-5 h-5 text-primary" />
                <div className="flex-1"><div className="text-sm font-semibold text-foreground">Call us</div><div className="text-xs text-muted-foreground">Mon–Sat · 9:30 AM – 7:00 PM IST</div></div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </a>
            </div>
          </div>

          <div ref={formRef} className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm h-fit lg:sticky lg:top-24">
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">Raise a support request</h3>
            <p className="text-muted-foreground text-sm mb-6">Tell us what's happening and we'll route it to the right specialist.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="name">Full name *</Label><Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div><Label htmlFor="email">Email *</Label><Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="phone">Phone</Label><Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label htmlFor="company">Company</Label><Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="product_guidance">Product guidance</SelectItem>
                      <SelectItem value="campaign_planning">Campaign planning</SelectItem>
                      <SelectItem value="asset_management">Asset management</SelectItem>
                      <SelectItem value="proof_collection">Proof collection</SelectItem>
                      <SelectItem value="bug">Bug / issue</SelectItem>
                      <SelectItem value="billing">Billing / GST / invoice</SelectItem>
                      <SelectItem value="feature_request">Feature request</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical · system down</SelectItem>
                      <SelectItem value="high">High · workflow blocked</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low · question</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label htmlFor="subject">Subject *</Label><Input id="subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></div>
              <div><Label htmlFor="message">Describe your request *</Label><Textarea id="message" rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required placeholder="Include the page/module, what you expected, and what happened. Screenshots can be shared on email after we reply." /></div>
              <Button type="submit" size="lg" disabled={submitting} className="w-full rounded-xl font-semibold text-white" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
                {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>) : ("Submit request")}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">By submitting, you agree to be contacted by the Go-Ads support team about this request.</p>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SupportPage;
