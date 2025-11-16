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
      
      {/* Enhanced bottom gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />

      {/* Text content - left middle */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl">
            <motion.div className="flex flex-col gap-4 text-left">
              {/* Motion Text Heading */}
              <div className="space-y-1">
                <motion.h1
                  initial={{ opacity: 0, y: 30, letterSpacing: "0.05em" }}
                  animate={{ opacity: 1, y: 0, letterSpacing: "-0.02em" }}
                  transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="text-2xl md:text-3xl lg:text-4xl font-black leading-tight"
                  style={{ 
                    color: "rgba(255, 255, 255, 0.98)",
                    textShadow: "0 4px 20px rgba(0, 0, 0, 0.5), 0 2px 10px rgba(0, 0, 0, 0.4)",
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
                  className="text-2xl md:text-3xl lg:text-4xl font-black leading-tight"
                  style={{ 
                    color: "#F4C542",
                    textShadow: "0 4px 28px rgba(244, 197, 66, 0.6), 0 2px 14px rgba(0, 0, 0, 0.5)",
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
                className="text-sm md:text-base leading-relaxed max-w-xl"
                style={{ 
                  color: "rgba(255, 255, 255, 0.96)",
                  textShadow: "0 3px 16px rgba(0, 0, 0, 0.5), 0 1px 6px rgba(0, 0, 0, 0.4)",
                  fontWeight: 500,
                }}
              >
                Go-Ads 360° is an intelligent OOH workflow platform that helps agencies and media owners 
                plan campaigns faster, organize inventory better, and deliver proof with complete clarity—without 
                  spreadsheets, WhatsApp chaos, or inconsistent photos.
                </motion.p>
              </motion.div>

              {/* CTA Buttons - Below text */}
              <motion.div
                className="flex flex-col sm:flex-row gap-3 mt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                {/* Blue Button - Start Trial */}
                <motion.div
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="sm"
                    onClick={() => navigate("/auth")}
                    className="px-4 py-2 text-xs font-bold rounded-lg relative overflow-hidden group transition-all duration-300"
                    style={{ 
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(8px)",
                      border: "2px solid rgba(255, 255, 255, 0.6)",
                      color: "white",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "linear-gradient(135deg, #0061FF, #00A3FF)";
                      e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 97, 255, 0.6)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                      e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.3)";
                    }}
                  >
                    <span className="relative z-10">Start Free 14-Day Trial →</span>
                  </Button>
                </motion.div>

                {/* Gold Button - AI Assistant */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/admin/assistant")}
                    className="px-4 py-2 text-xs font-bold rounded-lg relative overflow-hidden transition-all duration-300"
                    style={{ 
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(8px)",
                      border: "2px solid rgba(255, 255, 255, 0.6)",
                      color: "white",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "linear-gradient(135deg, #F4C542, #FFD700)";
                      e.currentTarget.style.boxShadow = "0 8px 32px rgba(244, 197, 66, 0.6)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                      e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.3)";
                    }}
                  >
                    AI Assistant →
                  </Button>
                </motion.div>

                {/* Mixed Gradient Button - Explore Platform */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/marketplace")}
                    className="px-4 py-2 text-xs font-bold rounded-lg relative overflow-hidden transition-all duration-300"
                    style={{ 
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(8px)",
                      border: "2px solid rgba(255, 255, 255, 0.6)",
                      color: "white",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "linear-gradient(135deg, #0061FF, #F4C542)";
                      e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 97, 255, 0.4), 0 8px 32px rgba(244, 197, 66, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                      e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.3)";
                    }}
                  >
                    Explore Platform →
                  </Button>
                </motion.div>
              </motion.div>
            </div>
          </div>
      </div>
    </section>
  );
};