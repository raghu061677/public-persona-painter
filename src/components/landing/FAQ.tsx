import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    question: "Is Go-Ads suitable for small agencies with <5 people?",
    answer: "Absolutely. Our Starter plan is free for up to 10 assets. Most small agencies see ROI within the first month via time savings on quotations and lead management."
  },
  {
    question: "How does the marketplace prevent undercutting?",
    answer: "Media owners set minimum 'base rates' that are never shown to buyers. You can approve/reject any booking request that doesn't meet your floor."
  },
  {
    question: "Can I use my own contracts and terms?",
    answer: "Yes. Upload custom T&Cs per client or campaign. Our standard contracts are optional templates."
  },
  {
    question: "What if an agency doesn't pay after campaign completion?",
    answer: "Pro and Enterprise plans include payment protection. We hold funds in escrow until proof is approved. Disputes go to our resolution team."
  },
  {
    question: "Do you integrate with Zoho Books / Tally / SAP?",
    answer: "Yes, Zoho Books integration is live. Tally and SAP connectors are in beta (Q2 2025). Contact sales for early access."
  },
  {
    question: "Can clients access the platform?",
    answer: "Yes. Client Portal provides read-only access to campaign proofs, invoices, and timelines. Fully white-labeled with your branding on Pro+ plans."
  },
  {
    question: "How long does onboarding take?",
    answer: "Self-serve onboarding takes 15 minutes (account setup + first asset/plan). Dedicated onboarding for Enterprise customers (2-week timeline with data migration support)."
  },
  {
    question: "What happens to my data if I cancel?",
    answer: "You can export all data (CSV/Excel) at any time. After cancellation, data is retained for 90 days, then permanently deleted per GDPR."
  }
];

export const FAQ = () => {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-muted-foreground">
            Got questions? We've got answers.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border rounded-lg px-6 bg-card"
            >
              <AccordionTrigger className="text-left hover:no-underline py-6">
                <span className="font-semibold">{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-6">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">Still have questions?</p>
          <Button variant="outline" size="lg">
            View Full FAQ →
          </Button>
        </div>
      </div>
    </section>
  );
};
