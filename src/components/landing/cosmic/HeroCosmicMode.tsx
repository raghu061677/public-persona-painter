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
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent pointer-events-none" />
      
      {/* Content container - left-aligned, floating over images */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-[620px] pt-40 md:pt-32 lg:pt-44 pl-0 md:pl-16 lg:pl-18">
          <motion.div
            className="flex flex-col gap-7 text-center md:text-left"
          >
            {/* Super Premium Motion Heading */}
            <div className="space-y-2">
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1]"
                style={{ 
                  letterSpacing: "-0.5px",
                  textShadow: "0 4px 20px rgba(0, 0, 0, 0.45), 0 2px 10px rgba(0, 0, 0, 0.35)",
                }}
              >
                <span className="block text-white">Accelerate Your Reach</span>
              </motion.h1>
              
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1]"
                style={{ 
                  letterSpacing: "-0.5px",
                  color: "#FFD447",
                  textShadow: "0 4px 24px rgba(255, 212, 71, 0.5), 0 2px 12px rgba(0, 0, 0, 0.4)",
                }}
              >
                Across Every City Street
              </motion.h1>
            </div>

            {/* Enterprise-Level Professional Copy */}
            <motion.p
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65, delay: 0.52, ease: [0.22, 1, 0.36, 1] }}
              className="text-base md:text-lg lg:text-xl leading-relaxed"
              style={{ 
                color: "rgba(255, 255, 255, 0.96)",
                textShadow: "0 2px 14px rgba(0, 0, 0, 0.4)",
                fontWeight: 500,
              }}
            >
              Go-Ads 360° transforms how agencies and media owners run OOH operations. 
              Plan campaigns faster, track inventory in real-time, automate proof collection, 
              and deliver client-ready proposals — without Excel, WhatsApp, or manual chaos.
            </motion.p>

            {/* Premium CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.72, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col sm:flex-row gap-4 mt-4"
            >
              {/* Primary - Blue Tech Gradient with Gold Glow */}
              <motion.div 
                whileHover={{ scale: 1.05, y: -8 }} 
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="w-full sm:w-auto px-10 py-7 text-lg font-bold rounded-2xl text-white relative overflow-hidden group"
                  style={{ 
                    background: "linear-gradient(90deg, #1A4BE9, #2C82FF)",
                    boxShadow: "0 8px 32px rgba(255, 212, 71, 0.35), 0 4px 16px rgba(26, 75, 233, 0.4)",
                  }}
                >
                  <span className="relative z-10">Start Free 14-Day Trial →</span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.6 }}
                  />
                </Button>
              </motion.div>

              {/* Secondary - Frosted Glass with Gold Ripple */}
              <motion.div 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/marketplace")}
                  className="w-full sm:w-auto px-10 py-7 text-lg font-bold border-2 border-white/60 bg-transparent hover:bg-white/10 text-white rounded-2xl relative overflow-hidden group"
                  style={{ 
                    backdropFilter: "blur(6px)",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)"
                  }}
                >
                  <span className="relative z-10">Watch 2-Min Overview →</span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFD447]/30 to-transparent opacity-0 group-hover:opacity-100"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.8 }}
                  />
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade to next section */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-background to-transparent z-5 pointer-events-none" />
    </section>
  );
};
