import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Brain, TrendingUp, FileText, Image } from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "AI Rate Recommendations",
    description: "Pricing based on 100K+ campaigns",
  },
  {
    icon: Brain,
    title: "AI Plan Builder",
    description: "Optimized plans in seconds",
  },
  {
    icon: FileText,
    title: "AI Lead Parsing",
    description: "Auto-extract requirements",
  },
  {
    icon: Image,
    title: "AI Proof Analyzer",
    description: "Computer vision validation",
  },
];

export const AIFeatureStrip = () => {
  return (
    <section className="py-16 bg-gradient-to-r from-primary/5 via-background to-secondary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-semibold mb-3">
            Powered by AI at Every Step
          </h2>
          <p className="text-base text-muted-foreground">
            Save 20+ hours per week with intelligent automation
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <Card className="p-5 text-center border-2 hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer h-full">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-3">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
