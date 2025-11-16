import { motion } from "framer-motion";
import { Building2, Users, TrendingUp, DollarSign } from "lucide-react";

export const CosmicMetrics = () => {
  const metrics = [
    { icon: Building2, value: "50,000+", label: "Media Assets", gradient: "from-blue-500 to-cyan-400" },
    { icon: Users, value: "10,000+", label: "Agencies", gradient: "from-purple-500 to-pink-400" },
    { icon: TrendingUp, value: "2,500+", label: "Media Owners", gradient: "from-orange-500 to-yellow-400" },
    { icon: DollarSign, value: "₹250Cr+", label: "Annual Spend", gradient: "from-green-500 to-emerald-400" },
  ];

  return (
    <section className="relative py-16 overflow-hidden">
      {/* Cosmic Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#001B4A]/20 to-transparent" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative"
            >
              {/* Glow Effect */}
              <div className={`absolute -inset-1 bg-gradient-to-r ${metric.gradient} rounded-[20px] blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`} />
              
              {/* Card */}
              <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-[20px] p-6 text-center">
                <div className="flex justify-center mb-3">
                  <div className={`p-3 bg-gradient-to-br ${metric.gradient} rounded-xl`}>
                    <metric.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{metric.value}</div>
                <div className="text-sm text-white/70">{metric.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
