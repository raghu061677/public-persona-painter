import { motion } from "framer-motion";
import { Briefcase, Building2, CheckCircle2 } from "lucide-react";

export const ForAgenciesOwners = () => {
  const audiences = [
    {
      icon: Briefcase,
      title: "For Agencies",
      gradient: "from-blue-600 to-cyan-500",
      benefits: [
        "AI plan builder for faster proposals",
        "Instant quotations with GST calculations",
        "Client-ready proposals in PPT, Excel, and PDF",
      ],
    },
    {
      icon: Building2,
      title: "For Media Owners",
      gradient: "from-purple-600 to-pink-500",
      benefits: [
        "Inventory listings with geo-mapping",
        "Dynamic pricing and rate management",
        "Occupancy dashboards and analytics",
      ],
    },
  ];

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/20 to-transparent" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0064E0] to-[#00A5FF]">Agencies</span> & <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFB400] to-[#FFC940]">Media Owners</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Whether you're planning campaigns or managing inventory, Go-Ads 360° adapts to your workflow.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {audiences.map((audience, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ y: -8 }}
              className="group relative"
            >
              <div className={`absolute -inset-1 bg-gradient-to-r ${audience.gradient} rounded-3xl blur-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-500`} />
              
              <div className="relative bg-card/60 backdrop-blur-lg border border-border/50 rounded-3xl p-10 shadow-card hover:shadow-glow transition-all duration-300">
                <div className={`inline-flex p-5 bg-gradient-to-br ${audience.gradient} rounded-2xl shadow-lg mb-6`}>
                  <audience.icon className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-3xl font-bold text-foreground mb-6">{audience.title}</h3>
                
                <div className="space-y-4">
                  {audience.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-[#39A7FF] flex-shrink-0 mt-0.5" />
                      <p className="text-muted-foreground text-lg">{benefit}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
