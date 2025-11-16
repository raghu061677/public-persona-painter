import { motion } from "framer-motion";
import { FileSpreadsheet, Zap, Camera, Users } from "lucide-react";

export const WhyGoAdsMatters = () => {
  const reasons = [
    {
      icon: FileSpreadsheet,
      title: "Stop Managing OOH in Excel",
      description: "Replace scattered files with one unified system for assets, plans, campaigns, photos, and invoices.",
      gradient: "from-blue-500 to-cyan-400",
    },
    {
      icon: Zap,
      title: "From Lead to Plan in One Flow",
      description: "Lead capture → media search → AI plan builder → proposal export (PPT, Excel, PDF).",
      gradient: "from-purple-500 to-pink-400",
    },
    {
      icon: Camera,
      title: "Proof That Closes the Loop",
      description: "Mounting assignment → photo uploads → shareable proof galleries that clients trust.",
      gradient: "from-orange-500 to-yellow-400",
    },
    {
      icon: Users,
      title: "Built for Agencies & Media Owners",
      description: "Whether you sell campaigns or own inventory, Go-Ads adapts to your workflow.",
      gradient: "from-green-500 to-emerald-400",
    },
  ];

  return (
    <section className="relative py-24 overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-muted/30" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Why Go-Ads <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFB400] to-[#FFC940]">Matters Now</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Modern OOH teams need modern tools. Here's what changes when you switch to Go-Ads 360°.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {reasons.map((reason, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative"
            >
              <div className={`absolute -inset-1 bg-gradient-to-r ${reason.gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />
              
              <div className="relative bg-card/50 backdrop-blur-md border border-border/50 rounded-2xl p-8 shadow-card hover:shadow-glow transition-all duration-300">
                <div className={`inline-flex p-4 bg-gradient-to-br ${reason.gradient} rounded-xl shadow-lg mb-6`}>
                  <reason.icon className="h-7 w-7 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-foreground mb-3">{reason.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{reason.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
