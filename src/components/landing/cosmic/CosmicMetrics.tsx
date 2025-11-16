import { motion } from "framer-motion";
import { Zap, FileCheck, TrendingUp, Users } from "lucide-react";

export const CosmicMetrics = () => {
  const benefits = [
    { icon: Zap, title: "From Excel to Live Inventory", description: "See which sites are actually free or blocked, without opening a single spreadsheet.", gradient: "from-blue-500 to-cyan-400", delay: 0 },
    { icon: FileCheck, title: "From WhatsApp Chaos to Clear Proof", description: "Upload and organize campaign photos by plan, asset, and date—so approvals are never lost in chat.", gradient: "from-purple-500 to-pink-400", delay: 0.1 },
    { icon: TrendingUp, title: "From Guesswork to Smarter Rates", description: "Use past campaigns and AI-assisted suggestions to quote with confidence, not guesswork.", gradient: "from-orange-500 to-yellow-400", delay: 0.2 },
    { icon: Users, title: "From Manual Follow-ups to Guided Workflows", description: "Leads, plans, campaigns, and proofs move through one connected pipeline.", gradient: "from-green-500 to-emerald-400", delay: 0.3 },
  ];

  return (
    <section className="relative py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#001B4A]/10 to-transparent" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">How Go-Ads 360° <span className="text-[#FACC15]">Changes Your Day</span></h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">Built for real teams doing OOH work, not fake vanity metrics</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {benefits.map((benefit, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: benefit.delay, ease: [0.22, 1, 0.36, 1] }} whileHover={{ y: -8, scale: 1.02 }} className="group relative">
              <motion.div animate={{ y: [0, -2, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: benefit.delay }} className="relative">
                <div className={`absolute -inset-1 bg-gradient-to-r ${benefit.gradient} rounded-[20px] blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />
                <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-[20px] p-8 shadow-[0_8px_20px_rgba(0,85,255,0.15)]">
                  <motion.div className="flex mb-4" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                    <div className={`p-3 bg-gradient-to-br ${benefit.gradient} rounded-xl shadow-lg`}>
                      <benefit.icon className="h-6 w-6 text-white" />
                    </div>
                  </motion.div>
                  <h3 className="text-xl font-bold text-white mb-3">{benefit.title}</h3>
                  <p className="text-sm text-white/70 leading-relaxed">{benefit.description}</p>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
