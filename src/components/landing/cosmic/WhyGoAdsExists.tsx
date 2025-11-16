import { motion } from "framer-motion";
import { AlertCircle, Clock, FileQuestion, MessageSquare } from "lucide-react";

export const WhyGoAdsExists = () => {
  const problems = [
    {
      icon: AlertCircle,
      title: "Scattered Data",
      description: "Assets, campaigns, and client info spread across Excel sheets and folders"
    },
    {
      icon: Clock,
      title: "Slow Proposals",
      description: "Hours wasted manually creating quotations and media plans"
    },
    {
      icon: FileQuestion,
      title: "Unorganized Photos",
      description: "Proof of performance photos lost in WhatsApp chats and email threads"
    },
    {
      icon: MessageSquare,
      title: "Endless Follow-ups",
      description: "Client updates buried in WhatsApp messages and missed calls"
    }
  ];

  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            <span className="text-foreground">Why </span>
            <span className="text-[#FFD447]">Go-Ads Exists</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            OOH teams struggle with scattered data, slow proposal creation, unorganized photos, 
            and endless WhatsApp follow-ups. Go-Ads 360° solves these problems with a clean, 
            AI-powered workflow designed specifically for Indian OOH operations.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative group"
            >
              <div className="h-full p-8 rounded-2xl bg-card border border-border/50 hover:border-[#FFD447]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[#FFD447]/10">
                <div className="mb-6">
                  <div className="w-14 h-14 rounded-xl bg-[#FFD447]/10 flex items-center justify-center mb-4 group-hover:bg-[#FFD447]/20 transition-colors">
                    <problem.icon className="w-7 h-7 text-[#FFD447]" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {problem.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {problem.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 text-center"
        >
          <div className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-r from-[#1A4BE9]/10 to-[#2C82FF]/10 border border-[#FFD447]/20">
            <p className="text-lg font-semibold">
              <span className="text-foreground">One platform. </span>
              <span className="text-[#FFD447]">Zero chaos. </span>
              <span className="text-foreground">Complete control.</span>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};