import { motion } from "framer-motion";
import billboard1 from "@/assets/billboard-1.png";
import shelter1 from "@/assets/shelter-1.png";
import unipole1 from "@/assets/unipole-1.png";
import digital1 from "@/assets/digital-1.png";

export const CategoryBrowser = () => {
  const categories = [
    { name: "Billboards", image: billboard1, description: "Show premium front-lit and back-lit sites with clear specs and visuals.", gradient: "from-blue-600 to-cyan-500" },
    { name: "Bus Shelters", image: shelter1, description: "Track shorter campaigns with quick mounting and proof cycles.", gradient: "from-purple-600 to-pink-500" },
    { name: "Unipoles", image: unipole1, description: "Highlight high-visibility junctions and long-range visibility sites.", gradient: "from-orange-600 to-yellow-500" },
    { name: "Digital Screens", image: digital1, description: "Manage loops, durations, and proof videos—all in one place.", gradient: "from-green-600 to-emerald-500" },
  ];

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#001B4A]/10 to-transparent" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Discover Your <span className="text-[#FFB400]">High-Impact Media Corridors</span></h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Start with your existing hoardings, bus shelters, unipoles, and digital screens. Go-Ads helps you organize them visually, map them to corridors, and track performance over time.</p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => (
            <motion.div key={index} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} whileHover={{ scale: 1.05, y: -8 }} className="group relative cursor-pointer">
              <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }} className="relative">
                <div className={`absolute -inset-1 bg-gradient-to-r ${category.gradient} rounded-[24px] blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />
                <div className="relative bg-white/5 backdrop-blur-lg border border-white/10 rounded-[24px] overflow-hidden h-[320px] shadow-[0_8px_20px_rgba(0,85,255,0.25)]">
                  <div className="relative h-48 overflow-hidden">
                    <motion.img src={category.image} alt={category.name} className="w-full h-full object-cover" whileHover={{ scale: 1.15 }} transition={{ duration: 0.7 }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#001B4A] via-transparent to-transparent opacity-60" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2">{category.name}</h3>
                    <p className="text-sm text-white/70">{category.description}</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
