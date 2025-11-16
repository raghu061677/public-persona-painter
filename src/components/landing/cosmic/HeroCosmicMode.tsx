import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { HeroImageCarousel } from "./HeroImageCarousel";

export const HeroCosmicMode = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Full-page image carousel background */}
      <HeroImageCarousel />
      
      {/* Content container - centered with glassmorphism */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Premium Glassmorphism Panel */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-3xl p-8 md:p-12 lg:p-16 text-center"
            style={{
              background: "rgba(255, 255, 255, 0.28)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            }}
          >
            {/* Motion Text Heading */}
            <div className="space-y-3 mb-8">
              <motion.h1
                initial={{ opacity: 0, y: 30, letterSpacing: "0.05em" }}
                animate={{ opacity: 1, y: 0, letterSpacing: "-0.02em" }}
                transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.1]"
                style={{ 
                  color: "#1a1a1a",
                  textShadow: "0 2px 20px rgba(0, 0, 0, 0.15)",
                }}
              >
                Accelerate Your Reach
              </motion.h1>
              
              <motion.h1
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  duration: 0.7, 
                  delay: 0.35, 
                  ease: [0.34, 1.56, 0.64, 1]
                }}
                className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.1]"
                style={{ 
                  color: "#F4C542",
                  textShadow: "0 2px 24px rgba(244, 197, 66, 0.4)",
                }}
              >
                Across Every City Street
              </motion.h1>
            </div>

            {/* Subtext with soft fade-in */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-base md:text-lg lg:text-xl leading-relaxed mb-10 max-w-3xl mx-auto"
              style={{ 
                color: "#2a2a2a",
                textShadow: "0 1px 3px rgba(255, 255, 255, 0.8)",
                fontWeight: 500,
              }}
            >
              Go-Ads 360° is an intelligent OOH workflow platform that helps agencies and media owners 
              plan campaigns faster, organize inventory better, and deliver proof with complete clarity—without 
              spreadsheets, WhatsApp chaos, or inconsistent photos.
            </motion.p>

            {/* CTA Buttons with stagger */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              {/* Primary - Blue Gradient */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.65 }}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="px-10 py-7 text-lg font-bold rounded-2xl text-white shadow-2xl relative overflow-hidden group"
                  style={{ 
                    background: "linear-gradient(135deg, #0061FF, #00A3FF)",
                    boxShadow: "0 8px 24px rgba(0, 97, 255, 0.35)",
                  }}
                >
                  <span className="relative z-10">Start Free 14-Day Trial →</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </Button>
              </motion.div>

              {/* Secondary - Glass with Blue Border */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/marketplace")}
                  className="px-10 py-7 text-lg font-bold rounded-2xl relative overflow-hidden"
                  style={{ 
                    background: "rgba(255, 255, 255, 0.5)",
                    backdropFilter: "blur(8px)",
                    border: "2px solid #0061FF",
                    color: "#0061FF",
                    boxShadow: "0 4px 16px rgba(0, 97, 255, 0.15)",
                  }}
                >
                  Explore Platform →
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
