import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import heroHighway from "@/assets/hero-highway.png";
import heroMountain from "@/assets/hero-mountain.png";
import heroCity from "@/assets/hero-city.png";

export const CosmicCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = [
    { image: heroHighway, title: "Highway Dominance", location: "National Highways" },
    { image: heroMountain, title: "Scenic Routes", location: "Mountain Corridors" },
    { image: heroCity, title: "Urban Impact", location: "City Centers" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const navigate = (direction: 'prev' | 'next') => {
    setCurrentIndex((prev) => {
      if (direction === 'next') return (prev + 1) % slides.length;
      return prev === 0 ? slides.length - 1 : prev - 1;
    });
  };

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Cosmic Background */}
      <div className="absolute inset-0 bg-gradient-radial from-[#001B4A]/20 via-transparent to-transparent" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Premium <span className="text-[#FACC15]">Locations</span>
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Strategic placements across India's most impactful advertising zones
          </p>
        </motion.div>

        {/* Carousel Container */}
        <div className="relative h-[500px] rounded-[24px] overflow-hidden">
          {/* Glow Effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-cyan-500/30 blur-3xl opacity-50" />
          
          {/* Slides */}
          <div className="relative h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <img
                  src={slides[currentIndex].image}
                  alt={slides[currentIndex].title}
                  className="w-full h-full object-cover rounded-[24px]"
                />
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#001B4A] via-transparent to-transparent opacity-60 rounded-[24px]" />
                
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full text-white text-sm font-semibold mb-3">
                      {slides[currentIndex].location}
                    </div>
                    <h3 className="text-4xl font-bold text-white">{slides[currentIndex].title}</h3>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={() => navigate('prev')}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all duration-300 hover:scale-110"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() => navigate('next')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all duration-300 hover:scale-110"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
