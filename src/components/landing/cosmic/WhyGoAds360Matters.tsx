import { motion } from "framer-motion";
import { Zap, FolderKanban, Activity, MapPin } from "lucide-react";

export const WhyGoAds360Matters = () => {
  const reasons = [
    {
      icon: Zap,
      title: "Campaigns in Minutes",
      description: "Planning that normally takes hours is reduced to minutes with automated asset discovery and instant proposals."
    },
    {
      icon: FolderKanban,
      title: "Everything in One Place",
      description: "Plans, bookings, mounting, proof photos, campaign reports — all streamlined without Excel or WhatsApp."
    },
    {
      icon: Activity,
      title: "Real-Time Clarity",
      description: "Track status across sites, cities, and campaigns with transparent dashboards and proof galleries."
    },
    {
      icon: MapPin,
      title: "Built for Indian OOH Teams",
      description: "Supports billboards, bus shelters, unipoles, medians, transit shelters, and custom formats."
    }
  ];

  return (
    <section className="relative py-24 md:py-32 bg-gradient-to-b from-[#F8FAFF] to-white dark:from-[#030A1A] dark:to-[#0A1628]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6">
            <span className="text-[#0046D3] dark:text-[#0061FF]">Why Go-Ads 360° </span>
            <span className="text-[#F4C542]">Matters</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Transform your OOH operations from chaotic to streamlined
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reasons.map((reason, index) => (
            <motion.div
              key={reason.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="group"
            >
              <div 
                className="h-full p-8 rounded-3xl transition-all duration-350"
                style={{
                  background: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(244, 197, 66, 0.2)",
                  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.06)",
                }}
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F4C542]/20 to-[#0061FF]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-350">
                  <reason.icon className="w-8 h-8 text-[#F4C542]" strokeWidth={2.5} />
                </div>
                
                <h3 className="text-2xl font-bold mb-4 text-[#0046D3] dark:text-white">
                  {reason.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed">
                  {reason.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};