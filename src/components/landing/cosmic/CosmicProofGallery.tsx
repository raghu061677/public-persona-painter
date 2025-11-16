import { motion } from "framer-motion";
import { MapPin, Maximize2, Download, Share2 } from "lucide-react";
import billboard1 from "@/assets/billboard-1.png";
import billboard2 from "@/assets/billboard-2.png";
import shelter1 from "@/assets/shelter-1.png";
import shelter2 from "@/assets/shelter-2.png";
import digital1 from "@/assets/digital-1.png";
import digital2 from "@/assets/digital-2.png";
import unipole1 from "@/assets/unipole-1.png";
import unipole2 from "@/assets/unipole-2.png";
import unipole3 from "@/assets/unipole-3.png";

export const CosmicProofGallery = () => {
  const assets = [
    { id: "HYD-BB-001", image: billboard1, city: "Hyderabad", area: "Hitech City", dimensions: "40x10 ft", illumination: "LED Backlit" },
    { id: "HYD-BB-002", image: billboard2, city: "Hyderabad", area: "Gachibowli", dimensions: "40x10 ft", illumination: "LED Backlit" },
    { id: "HYD-BS-003", image: shelter1, city: "Hyderabad", area: "Jubilee Hills", dimensions: "10x5 ft", illumination: "Solar Powered" },
    { id: "HYD-BS-004", image: shelter2, city: "Hyderabad", area: "Banjara Hills", dimensions: "10x5 ft", illumination: "Solar Powered" },
    { id: "HYD-DS-005", image: digital1, city: "Hyderabad", area: "Financial District", dimensions: "20x10 ft", illumination: "Digital LED" },
    { id: "HYD-DS-006", image: digital2, city: "Hyderabad", area: "Madhapur", dimensions: "20x10 ft", illumination: "Digital LED" },
    { id: "HYD-UP-007", image: unipole1, city: "Hyderabad", area: "Outer Ring Road", dimensions: "40x20 ft", illumination: "LED Frontlit" },
    { id: "HYD-UP-008", image: unipole2, city: "Hyderabad", area: "Highway Exit", dimensions: "40x20 ft", illumination: "LED Frontlit" },
    { id: "HYD-UP-009", image: unipole3, city: "Hyderabad", area: "Airport Road", dimensions: "40x20 ft", illumination: "LED Frontlit" },
  ];

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Cosmic Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#001B4A]/30 via-transparent to-[#001B4A]/30" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,255,0.1)_0%,transparent_70%)]" />
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Live Asset <span className="text-[#FACC15]">Portfolio</span>
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Real installations across premium locations with verified proof of performance
          </p>
        </motion.div>

        {/* Gallery Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset, index) => (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="group relative"
            >
              {/* Glow Ring */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-[20px] blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
              
              {/* Card */}
              <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-[20px] overflow-hidden">
                {/* Image Container */}
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={asset.image}
                    alt={asset.id}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  
                  {/* Overlay on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#001B4A] via-transparent to-transparent opacity-0 group-hover:opacity-90 transition-opacity duration-300">
                    <div className="absolute inset-0 flex items-center justify-center gap-3">
                      <button className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all duration-300 hover:scale-110">
                        <Maximize2 className="h-5 w-5" />
                      </button>
                      <button className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all duration-300 hover:scale-110">
                        <Download className="h-5 w-5" />
                      </button>
                      <button className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all duration-300 hover:scale-110">
                        <Share2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Asset ID Badge */}
                  <div className="absolute top-3 left-3 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-[#2563FF]">
                    {asset.id}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
                    <MapPin className="h-4 w-4" />
                    <span>{asset.city} • {asset.area}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{asset.dimensions}</p>
                      <p className="text-white/60 text-xs">{asset.illumination}</p>
                    </div>
                    <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl text-white text-sm font-semibold hover:shadow-glow transition-all duration-300">
                      Add to Plan
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <button className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white font-semibold hover:bg-white/20 transition-all duration-300 hover:scale-105">
            View All 50,000+ Assets
          </button>
        </motion.div>
      </div>
    </section>
  );
};
