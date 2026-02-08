import { motion } from "framer-motion";
import { AlertTriangle, Lightbulb, Wrench, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const milestones = [
  {
    icon: AlertTriangle,
    year: "The Challenge",
    title: "Fragmented OOH Operations",
    description: "The outdoor advertising industry relied on scattered Excel sheets, manual proof collection, delayed invoicing, and disconnected teams. Media owners had no real-time visibility into asset availability. Agencies struggled with rate negotiations and campaign tracking.",
  },
  {
    icon: Lightbulb,
    year: "The Idea",
    title: "A Unified Vision",
    description: "What if every aspect of OOH advertising — from lead capture to campaign proof — could live in one intelligent system? The idea was born from real operational challenges faced by Matrix Network Solutions while managing large outdoor inventories across Hyderabad.",
  },
  {
    icon: Wrench,
    year: "Building the Platform",
    title: "Engineering for Scale",
    description: "A multidisciplinary team of OOH domain experts, software engineers, and campaign operators came together to build GO-ADS. Every feature was designed from the ground up based on real workflows, real constraints, and real feedback from the field.",
  },
  {
    icon: Rocket,
    year: "Where We Are Today",
    title: "Powering the OOH Ecosystem",
    description: "GO-ADS is now a full-stack OOH operating system trusted by media owners and advertisers. From campaign planning and asset management to automated proof collection and GST-ready invoicing, the platform delivers end-to-end operational excellence.",
  },
];

const OurStory = () => {
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
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
          >
            Our Story
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed"
          >
            Built from real OOH challenges to power the next generation of outdoor advertising.
          </motion.p>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-px" />

            {milestones.map((milestone, i) => (
              <motion.div
                key={milestone.year}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className={`relative flex flex-col md:flex-row items-start mb-16 last:mb-0 ${
                  i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Icon dot */}
                <div className="absolute left-6 md:left-1/2 w-12 h-12 -translate-x-1/2 bg-[#1E40AF] rounded-full flex items-center justify-center z-10 border-4 border-background shadow-lg">
                  <milestone.icon className="w-5 h-5 text-white" />
                </div>

                {/* Content */}
                <div className={`ml-20 md:ml-0 md:w-[calc(50%-2rem)] ${i % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                  <span className="inline-block text-xs font-bold tracking-widest uppercase text-[#F4C542] mb-2">
                    {milestone.year}
                  </span>
                  <h3 className="text-xl font-bold text-foreground mb-2">{milestone.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{milestone.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Join the Journey</h2>
            <p className="text-muted-foreground mb-8">Discover how GO-ADS can transform your outdoor advertising operations.</p>
            <Button size="lg" onClick={() => navigate("/sales")} className="rounded-xl font-semibold" style={{ background: "linear-gradient(135deg, #0061FF, #00A3FF)" }}>
              Get in Touch
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default OurStory;
