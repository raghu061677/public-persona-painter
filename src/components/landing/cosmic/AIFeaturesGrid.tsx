import { motion } from "framer-motion";
import { TrendingUp, Lightbulb, Mail, Camera } from "lucide-react";

export const AIFeaturesGrid = () => {
  const features = [
    {
      icon: TrendingUp,
      title: "AI Rate Recommendations",
      description: "Get smarter pricing suggestions based on historical patterns and market behavior.",
    },
    {
      icon: Lightbulb,
      title: "AI Plan Builder",
      description: "Generate optimized plans for any budget or brief in seconds.",
    },
    {
      icon: Mail,
      title: "AI Lead Parsing",
      description: "Drop in a WhatsApp or email inquiry—Go-Ads reads it and extracts location, duration, budget, and categories.",
    },
    {
      icon: Camera,
      title: "AI Proof Analyzer",
      description: "Detect blurry or incomplete proof photos before sending them to the client.",
    },
  ];

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-subtle" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Powered by <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFB400] to-[#FFC940]">AI</span> at Every Step
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Intelligent automation that makes planning, pricing, and proof management effortless.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.05 }}
              className="group relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-[#0064E0] to-[#39A7FF] rounded-2xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
              
              <div className="relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-card hover:shadow-glow transition-all duration-300">
                <div className="inline-flex p-3 bg-gradient-to-br from-[#0064E0] to-[#00A5FF] rounded-xl shadow-md mb-4">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
