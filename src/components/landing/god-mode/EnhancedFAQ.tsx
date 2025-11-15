import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MessageCircle } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    question: "Is Go-Ads suitable for small agencies with <5 people?",
    answer: "Absolutely. Our Starter plan is free for up to 10 assets. Most small agencies see ROI within the first month via time savings on quotations and lead management.",
    category: "Pricing",
  },
  {
    question: "How does the marketplace prevent undercutting?",
    answer: "Media owners set minimum 'base rates' that are never shown to buyers. You can approve/reject any booking request that doesn't meet your floor.",
    category: "Marketplace",
  },
  {
    question: "Can I use my own contracts and terms?",
    answer: "Yes. Upload custom T&Cs per client or campaign. Our standard contracts are optional templates.",
    category: "Features",
  },
  {
    question: "What if an agency doesn't pay after campaign completion?",
    answer: "Pro and Enterprise plans include payment protection. We hold funds in escrow until proof is approved. Disputes go to our resolution team.",
    category: "Payments",
  },
  {
    question: "Do you integrate with Zoho Books / Tally / SAP?",
    answer: "Yes, Zoho Books integration is live. Tally and SAP connectors are in beta (Q2 2025). Contact sales for early access.",
    category: "Integrations",
  },
  {
    question: "Can clients access the platform?",
    answer: "Yes. Client Portal provides read-only access to campaign proofs, invoices, and timelines. Fully white-labeled with your branding on Pro+ plans.",
    category: "Features",
  },
  {
    question: "How long does onboarding take?",
    answer: "Self-serve onboarding takes 15 minutes (account setup + first asset/plan). Dedicated onboarding for Enterprise customers (2-week timeline with data migration support).",
    category: "Onboarding",
  },
  {
    question: "What happens to my data if I cancel?",
    answer: "You can export all data (CSV/Excel) at any time. After cancellation, data is retained for 90 days, then permanently deleted per GDPR.",
    category: "Data & Security",
  },
];

export const EnhancedFAQ = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="py-20 lg:py-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Got questions? We've got answers.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base"
            />
          </div>
        </motion.div>

        <Accordion type="single" collapsible className="space-y-4">
          {filteredFAQs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <AccordionItem
                value={`item-${index}`}
                className="border-2 rounded-xl px-6 bg-card hover:shadow-lg transition-all"
              >
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <div>
                    <span className="font-semibold">{faq.question}</span>
                    <div className="text-xs text-muted-foreground mt-1">
                      {faq.category}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>

        {filteredFAQs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No FAQs found matching "{searchQuery}"
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground mb-4">Still have questions?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" size="lg">
              View Full FAQ →
            </Button>
            <Button size="lg" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Contact Support via WhatsApp
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
