import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { HeroImageCarousel } from "./HeroImageCarousel";

export const HeroCosmicMode = () => {
  const navigate = useNavigate();

  const impactPoints = [
    "Plan campaigns, track bookings, assign mounting, upload proof photos, and share proposals instantly—without touching Excel or WhatsApp.",
    "Built for modern OOH teams who want speed, accuracy, and transparency."
  ];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Full-page image carousel background */}
      <HeroImageCarousel />
      
      {/* Content container - left-aligned, floating over images */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-[560px] pt-40 md:pt-32 lg:pt-40 pl-0 md:pl-16 lg:pl-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col gap-5 text-center md:text-left"
          >
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.2]"
              style={{ 
                textShadow: "0 4px 16px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.25)",
              }}
            >
              <span className="text-white/90">Accelerate Your Reach</span>
              <br />
              <span className="text-[#FFC93C]" style={{ textShadow: "0 4px 20px rgba(255, 201, 60, 0.4), 0 2px 8px rgba(0, 0, 0, 0.35)" }}>
                Across Every City Street
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-base md:text-lg leading-relaxed"
              style={{ 
                color: "rgba(255, 255, 255, 0.95)",
                textShadow: "0 2px 12px rgba(0, 0, 0, 0.35)",
              }}
            >
              Go-Ads 360° is an intelligent OOH workflow platform that helps agencies and media owners plan campaigns faster, organize inventory better, and deliver proof with complete clarity.
            </motion.p>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-base md:text-lg leading-relaxed"
              style={{ 
                color: "rgba(255, 255, 255, 0.95)",
                textShadow: "0 2px 12px rgba(0, 0, 0, 0.35)",
              }}
            >
              Whether you manage 5 sites or 500, Go-Ads brings everything into one clean, powerful system.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-base md:text-lg leading-relaxed"
              style={{ 
                color: "rgba(255, 255, 255, 0.95)",
                textShadow: "0 2px 12px rgba(0, 0, 0, 0.35)",
              }}
            >
              Plan campaigns, track bookings, assign mounting, upload proof photos, and share proposals instantly—without touching Excel or WhatsApp.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="text-base md:text-lg leading-relaxed"
              style={{ 
                color: "rgba(255, 255, 255, 0.95)",
                textShadow: "0 2px 12px rgba(0, 0, 0, 0.35)",
              }}
            >
              Built for modern OOH teams who want speed, accuracy, and transparency.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 mt-4"
            >
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="w-full sm:w-auto px-8 py-6 text-lg font-semibold rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-2xl shadow-[#1A73E8]/50"
                  style={{ boxShadow: "0 8px 32px rgba(26, 115, 232, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)" }}
                >
                  Start Free 14-Day Trial →
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/marketplace")}
                  className="w-full sm:w-auto px-8 py-6 text-lg font-semibold border border-white/60 bg-transparent hover:bg-white/10 text-white rounded-xl"
                  style={{ 
                    backdropFilter: "blur(4px)",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)"
                  }}
                >
                  Watch 2-Min Overview →
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
