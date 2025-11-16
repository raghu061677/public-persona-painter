import { motion } from "framer-motion";
import billboard1 from "@/assets/billboard-1.png";
import shelter1 from "@/assets/shelter-1.png";
import unipole1 from "@/assets/unipole-1.png";
import digital1 from "@/assets/digital-1.png";

export const CategoryBrowser = () => {
  const categories = [
    { name: "Billboards", image: billboard1, count: "15,000+", gradient: "from-blue-600 to-cyan-500" },
    { name: "Bus Shelters", image: shelter1, count: "12,000+", gradient: "from-purple-600 to-pink-500" },
    { name: "Unipoles", image: unipole1, count: "8,000+", gradient: "from-orange-600 to-yellow-500" },
    { name: "Digital Screens", image: digital1, count: "5,000+", gradient: "from-green-600 to-emerald-500" },
  ];

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#001B4A]/10 to-transparent" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Explore Media <span className="text-[#FACC15]">Categories</span>
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Browse through our extensive inventory of premium OOH media assets
          </p>
        </motion.div>

        {/* Category Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ scale: 1.05, rotateY: 5 }}
              className="group relative cursor-pointer"
            >
              {/* Neon Glow Border */}
              <div className={`absolute -inset-1 bg-gradient-to-r ${category.gradient} rounded-[24px] blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500`} />
              
              {/* Card */}
              <div className="relative bg-white/5 backdrop-blur-lg border border-white/10 rounded-[24px] overflow-hidden h-[320px]">
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#001B4A] via-transparent to-transparent opacity-60" />
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className={`inline-block px-4 py-1.5 bg-gradient-to-r ${category.gradient} rounded-full text-white text-sm font-semibold mb-3`}>
                    {category.count}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{category.name}</h3>
                  <p className="text-white/70 text-sm">Explore locations →</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
